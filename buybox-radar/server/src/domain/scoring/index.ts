import type { Company, BuyBox, ScoredLead, Fit } from '@radar/shared';
import { FIT_BANDS } from '@radar/shared';
import {
  scoreIndustry,
  scoreLocation,
  scoreSize,
  scoreRevenue,
  scoreTenure,
  scoreOwner,
} from './components';
import { computeConfidence } from './confidence';

/**
 * Determines the fit band for a given score.
 */
export function fitFor(score: number): Fit {
  if (score >= FIT_BANDS.strong) return 'strong';
  if (score >= FIT_BANDS.possible) return 'possible';
  return 'weak';
}

/**
 * Scores a company against a buy-box, returning a complete ScoredLead minus rank.
 */
export function scoreCompany(
  company: Company,
  buyBox: BuyBox,
  ctx: { currentYear: number },
): Omit<ScoredLead, 'rank'> {
  const breakdown = [
    scoreIndustry(company, buyBox),
    scoreLocation(company, buyBox),
    scoreSize(company, buyBox),
    scoreRevenue(company, buyBox),
    scoreTenure(company, buyBox, ctx),
    scoreOwner(company),
  ];

  const score = breakdown.reduce((sum, c) => sum + c.points, 0);
  const fit = fitFor(score);
  const { confidence, label: confidenceLabel } = computeConfidence(company);
  const yearsInBusiness = company.yearFounded ? ctx.currentYear - company.yearFounded : null;

  return {
    ...company,
    score,
    fit,
    confidence,
    confidenceLabel,
    yearsInBusiness,
    breakdown,
  };
}

/**
 * Sorts scored leads and assigns ranks per §5.6.
 * score desc → confidence desc → reviewCount desc → name asc.
 */
export function rankLeads(leads: Omit<ScoredLead, 'rank'>[], limit: number): ScoredLead[] {
  const sorted = [...leads].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    const ra = a.reviewCount ?? 0;
    const rb = b.reviewCount ?? 0;
    if (rb !== ra) return rb - ra;
    return a.name.localeCompare(b.name);
  });

  return sorted.slice(0, limit).map((lead, i) => ({ ...lead, rank: i + 1 }));
}
