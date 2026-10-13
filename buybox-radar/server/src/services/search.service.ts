import type { PrismaClient } from '@prisma/client';
import type { BuyBox, SearchResponse, ScoredLead, Company, ScoreComponent } from '@radar/shared';
import { isAdjacent } from '@radar/shared';
import type { SearchCache } from '../lib/cache';
import { buyBoxHash, canonicalizeBuyBox } from '../lib/hash';
import { scoreCompany, rankLeads } from '../domain/scoring/index';
import { buildCsv } from './export.service';
import { logger } from '../lib/logger';

export interface SearchService {
  run(buyBox: BuyBox): Promise<SearchResponse>;
  getById(id: string): Promise<SearchResponse | null>;
  exportCsv(id: string, opts: { minScore: number; shortlistedOnly: boolean }): Promise<string | null>;
}

/** Maps a Prisma Company row to the shared Company type. */
function toCompany(row: {
  id: string;
  name: string;
  normalizedName: string;
  industry: string;
  website: string | null;
  domain: string | null;
  phone: string | null;
  email: string | null;
  street: string | null;
  city: string;
  state: string;
  zip: string | null;
  employeeCount: number | null;
  estimatedRevenue: number | null;
  revenueConfidence: number | null;
  yearFounded: number | null;
  ownerName: string | null;
  ownerTitle: string | null;
  ownerLinkedinUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  sources: string[];
  status: string;
}): Company {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalizedName,
    industry: row.industry as Company['industry'],
    website: row.website,
    domain: row.domain,
    phone: row.phone,
    email: row.email,
    street: row.street,
    city: row.city,
    state: row.state as Company['state'],
    zip: row.zip,
    employeeCount: row.employeeCount,
    estimatedRevenue: row.estimatedRevenue,
    revenueConfidence: row.revenueConfidence,
    yearFounded: row.yearFounded,
    ownerName: row.ownerName,
    ownerTitle: row.ownerTitle,
    ownerLinkedinUrl: row.ownerLinkedinUrl,
    rating: row.rating,
    reviewCount: row.reviewCount,
    sources: row.sources,
    status: row.status as Company['status'],
  };
}

export function createSearchService(deps: {
  prisma: PrismaClient;
  cache: SearchCache;
}): SearchService {
  const { prisma, cache } = deps;

  return {
    async run(buyBox) {
      const start = Date.now();
      const canonical = canonicalizeBuyBox(buyBox);
      const hash = buyBoxHash(canonical);

      // Cache lookup
      const cached = cache.get(hash);
      if (cached) {
        const durationMs = Date.now() - start;
        return {
          ...cached,
          search: {
            ...cached.search,
            meta: { ...cached.search.meta, cacheHit: true, durationMs },
          },
        };
      }

      // Build adjacent industries for query
      const adjacentInds = buyBox.industries.flatMap((ind) =>
        ['hvac', 'plumbing', 'electrical', 'roofing', 'landscaping', 'pest-control',
         'cleaning-services', 'auto-repair', 'dental-practice', 'veterinary-clinic',
         'laundromat', 'self-storage'].filter(
          (other) => other !== ind && isAdjacent(ind as Company['industry'], other as Company['industry']),
        ),
      );
      const allIndustries = [...new Set([...buyBox.industries, ...adjacentInds])];

      // Retrieve candidates
      const candidateRows = await prisma.company.findMany({
        where: {
          state: { in: buyBox.states },
          industry: { in: allIndustries },
          status: { not: 'REJECTED' },
          ...(buyBox.requireOwnerContact
            ? {
                ownerName: { not: null },
                OR: [{ email: { not: null } }, { phone: { not: null } }],
              }
            : {}),
        },
      });

      const candidates = candidateRows.map(toCompany);
      const currentYear = new Date().getFullYear();

      // Score all candidates
      const scored = candidates.map((c) => scoreCompany(c, buyBox, { currentYear }));

      // Sort, slice, rank
      const results = rankLeads(scored, buyBox.limit);

      const durationMs = Date.now() - start;

      logger.info({
        hash,
        candidateCount: candidates.length,
        resultCount: results.length,
        durationMs,
        cacheHit: false,
      }, 'Search completed');

      // Persist search + results in a transaction
      const search = await prisma.$transaction(async (tx) => {
        const s = await tx.search.create({
          data: {
            buyBox: canonical as object,
            buyBoxHash: hash,
            candidateCount: candidates.length,
            resultCount: results.length,
            durationMs,
            results: {
              createMany: {
                data: results.map((r) => ({
                  companyId: r.id,
                  rank: r.rank,
                  score: r.score,
                  confidence: r.confidence,
                  breakdown: r.breakdown as object[],
                })),
              },
            },
          },
        });
        return s;
      });

      const response: SearchResponse = {
        search: {
          id: search.id,
          buyBox: canonical,
          meta: {
            cacheHit: false,
            durationMs,
            candidateCount: candidates.length,
            resultCount: results.length,
            createdAt: search.createdAt.toISOString(),
          },
        },
        results,
      };

      cache.set(hash, response);
      return response;
    },

    async getById(id) {
      const search = await prisma.search.findUnique({
        where: { id },
        include: {
          results: {
            orderBy: { rank: 'asc' },
            include: { company: true },
          },
        },
      });

      if (!search) return null;

      const buyBox = search.buyBox as unknown as BuyBox;
      const currentYear = new Date().getFullYear();

      const results: ScoredLead[] = search.results.map((sr) => {
        const company = toCompany(sr.company);
        // Re-score with current buy-box to get breakdown; use stored score/rank
        const scored = scoreCompany(company, buyBox, { currentYear });
        return {
          ...scored,
          rank: sr.rank,
          score: sr.score,
          confidence: sr.confidence,
          breakdown: sr.breakdown as unknown as ScoreComponent[],
        };
      });

      return {
        search: {
          id: search.id,
          buyBox,
          meta: {
            cacheHit: false,
            durationMs: search.durationMs,
            candidateCount: search.candidateCount,
            resultCount: search.resultCount,
            createdAt: search.createdAt.toISOString(),
          },
        },
        results,
      };
    },

    async exportCsv(id, { minScore, shortlistedOnly }) {
      const searchData = await this.getById(id);
      if (!searchData) return null;

      let rows = searchData.results.filter(
        (r) => r.score >= minScore && r.status !== 'REJECTED',
      );
      if (shortlistedOnly) {
        rows = rows.filter((r) => r.status === 'SHORTLISTED');
      }
      rows.sort((a, b) => a.rank - b.rank);

      return buildCsv(rows);
    },
  };
}
