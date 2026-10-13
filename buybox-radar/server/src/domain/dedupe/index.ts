import { normalizeName, normalizeDomain, normalizePhone, similarity } from './normalize';
import type { RawCompany } from '@radar/shared';

export interface DedupeResult {
  companies: RawCompany[];
  stats: { input: number; output: number; duplicatesRemoved: number };
}

/** Union-Find (disjoint set) for clustering matched records. */
class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]!);
    }
    return this.parent[x]!;
  }

  union(x: number, y: number): void {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return;
    if ((this.rank[rx] ?? 0) < (this.rank[ry] ?? 0)) {
      this.parent[rx] = ry;
    } else if ((this.rank[rx] ?? 0) > (this.rank[ry] ?? 0)) {
      this.parent[ry] = rx;
    } else {
      this.parent[ry] = rx;
      this.rank[rx] = (this.rank[rx] ?? 0) + 1;
    }
  }
}

/** Count non-null fields in a RawCompany for merge priority. */
function countNonNull(c: RawCompany): number {
  return [
    c.website,
    c.phone,
    c.email,
    c.street,
    c.zip,
    c.employeeCount,
    c.estimatedRevenue,
    c.revenueConfidence,
    c.yearFounded,
    c.ownerName,
    c.ownerTitle,
    c.ownerLinkedinUrl,
    c.rating,
    c.reviewCount,
  ].filter((v) => v != null).length;
}

/** Merge a cluster of records into one, filling nulls from secondaries. */
function mergeCluster(cluster: RawCompany[]): RawCompany {
  // Sort by non-null count descending; primary is first
  const sorted = [...cluster].sort((a, b) => countNonNull(b) - countNonNull(a));
  const primary = { ...sorted[0]! };

  for (const secondary of sorted.slice(1)) {
    if (primary.website == null && secondary.website != null) primary.website = secondary.website;
    if (primary.phone == null && secondary.phone != null) primary.phone = secondary.phone;
    if (primary.email == null && secondary.email != null) primary.email = secondary.email;
    if (primary.street == null && secondary.street != null) primary.street = secondary.street;
    if (primary.zip == null && secondary.zip != null) primary.zip = secondary.zip;
    if (primary.employeeCount == null && secondary.employeeCount != null)
      primary.employeeCount = secondary.employeeCount;
    if (primary.estimatedRevenue == null && secondary.estimatedRevenue != null)
      primary.estimatedRevenue = secondary.estimatedRevenue;
    if (primary.revenueConfidence == null && secondary.revenueConfidence != null)
      primary.revenueConfidence = secondary.revenueConfidence;
    if (primary.yearFounded == null && secondary.yearFounded != null)
      primary.yearFounded = secondary.yearFounded;
    if (primary.ownerName == null && secondary.ownerName != null)
      primary.ownerName = secondary.ownerName;
    if (primary.ownerTitle == null && secondary.ownerTitle != null)
      primary.ownerTitle = secondary.ownerTitle;
    if (primary.ownerLinkedinUrl == null && secondary.ownerLinkedinUrl != null)
      primary.ownerLinkedinUrl = secondary.ownerLinkedinUrl;
    if (primary.rating == null && secondary.rating != null) primary.rating = secondary.rating;
    if (primary.reviewCount == null && secondary.reviewCount != null)
      primary.reviewCount = secondary.reviewCount;
  }

  // Union and sort sources
  const allSources = new Set(cluster.flatMap((c) => c.sources));
  primary.sources = [...allSources].sort();

  return primary;
}

/**
 * De-duplicates an array of RawCompany records using blocking by state,
 * union-find clustering, and rule-based + fuzzy matching.
 */
export function dedupe(records: RawCompany[]): DedupeResult {
  const input = records.length;
  const uf = new UnionFind(records.length);

  // Precompute normalized fields
  const normalized = records.map((c) => ({
    name: normalizeName(c.name),
    domain: normalizeDomain(c.website),
    phone: normalizePhone(c.phone),
    city: c.city.trim().toLowerCase(),
    state: c.state,
    industry: c.industry,
  }));

  // Block by state and compare within each block
  const stateGroups = new Map<string, number[]>();
  for (let i = 0; i < records.length; i++) {
    const state = records[i]!.state;
    const group = stateGroups.get(state) ?? [];
    group.push(i);
    stateGroups.set(state, group);
  }

  for (const indices of stateGroups.values()) {
    for (let ii = 0; ii < indices.length; ii++) {
      for (let jj = ii + 1; jj < indices.length; jj++) {
        const i = indices[ii]!;
        const j = indices[jj]!;
        const ni = normalized[i]!;
        const nj = normalized[j]!;

        let matched = false;

        // Rule 1: same non-null domain
        if (!matched && ni.domain != null && ni.domain === nj.domain) {
          matched = true;
        }

        // Rule 2: same non-null phone
        if (!matched && ni.phone != null && ni.phone === nj.phone) {
          matched = true;
        }

        // Rule 3: same normalizeName AND same city
        if (!matched && ni.name === nj.name && ni.city === nj.city) {
          matched = true;
        }

        // Rule 4: fuzzy name similarity >= 0.92 AND same city AND same industry
        if (
          !matched &&
          ni.city === nj.city &&
          ni.industry === nj.industry &&
          ni.name.length > 0 &&
          nj.name.length > 0 &&
          similarity(ni.name, nj.name) >= 0.92
        ) {
          matched = true;
        }

        if (matched) {
          uf.union(i, j);
        }
      }
    }
  }

  // Group indices by their root
  const clusterMap = new Map<number, number[]>();
  for (let i = 0; i < records.length; i++) {
    const root = uf.find(i);
    const cluster = clusterMap.get(root) ?? [];
    cluster.push(i);
    clusterMap.set(root, cluster);
  }

  // Build output in stable order (order of first record in each cluster)
  const seen = new Set<number>();
  const result: RawCompany[] = [];

  for (let i = 0; i < records.length; i++) {
    const root = uf.find(i);
    if (!seen.has(root)) {
      seen.add(root);
      const clusterIndices = clusterMap.get(root) ?? [i];
      const cluster = clusterIndices.map((idx) => records[idx]!);
      result.push(mergeCluster(cluster));
    }
  }

  return {
    companies: result,
    stats: {
      input,
      output: result.length,
      duplicatesRemoved: input - result.length,
    },
  };
}
