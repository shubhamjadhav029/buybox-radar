# 01 — Requirements & Tech Stack: BuyBox Radar

> Authoritative spec for **behaviour**. Names, weights, thresholds, and templates here are
> exact; do not change them.

---

## 1. Product summary

**BuyBox Radar** helps *acquisition entrepreneurs / search-fund searchers* find small
businesses that match their acquisition thesis ("buy-box"). Existing tools (including the
reference product SaaSquatch) return **lists**. BuyBox Radar returns a **ranked, explainable
shortlist**: every company gets a 0–100 fit score with a visible breakdown, so the user can
trust it, sort by it, and act on it.

**Primary persona:** a searcher doing cold outreach to business owners. They want: (a) only
companies that fit their thesis, (b) no duplicate rows, (c) owner/contact info up front,
(d) a clean export to their CRM or spreadsheet.

**Reference product:** SaaSquatch Leads (Caprae Capital) — AI-powered B2B lead gen for
acquisition entrepreneurs; filters by industry/location/size/revenue; revenue estimates,
confidence scoring, owner enrichment, AI email generator, CSV export. Our feature enhances the
*prioritisation* layer.

## 2. Goals and non-goals

**Goals**
1. Thesis-driven ranking with an explainable score (core differentiator).
2. Record-linkage de-duplication across multiple source records.
3. Sub-second search with caching; visible performance feedback in the UI.
4. Clear, professional UX: guided form → ranked table → drill-down → export.
5. Production-grade basics: validation, error handling, tests, Docker, cloud deploy, docs.

**Non-goals (do NOT build)**
- Scraping LinkedIn/Apollo/Crunchbase/Google results pages; CAPTCHA/proxy handling.
- Authentication, user accounts, billing, multi-tenancy.
- AI/LLM calls, email sending, CRM integrations (CSV export only).
- Real-time collaboration, notifications, mobile app.

## 3. Functional requirements

Priority: **P0** = must ship, **P1** = should ship, **P2** = stretch (only after all P0/P1 pass).

| ID | Pri | Requirement |
|---|---|---|
| FR-1 | P0 | User can define a **buy-box**: 1–5 industries, 1+ states, optional cities, employee range, revenue range, min years in business, "require owner contact" toggle, result limit. Validated client- and server-side with the same zod schema. |
| FR-2 | P0 | `POST /api/searches` retrieves candidates, scores each (§5), sorts, ranks, persists the search, and returns results + meta. |
| FR-3 | P0 | Every result carries `score` (0–100), `fit` band, `confidence`, and a `breakdown` of 6 components each with points, max, tone, and a human-readable reason. |
| FR-4 | P0 | Company records are **de-duplicated** at ingest time (§6). Seed data intentionally contains duplicates to prove it. |
| FR-5 | P0 | Results table with: rank, company (name, city/state, website), industry, employees, est. revenue, years in business, owner, score badge, confidence chip, shortlist star. |
| FR-6 | P0 | Expandable row shows the score breakdown (bars + reasons). |
| FR-7 | P0 | Client-side filters: min score slider, has email, has owner, shortlisted only, text filter (name/city), sort selector. |
| FR-8 | P0 | **Shortlist/Reject** a lead (`PATCH /api/companies/:id/status`). Rejected leads are excluded from future searches. |
| FR-9 | P0 | **CSV export** of the current search (`GET /api/searches/:id/export.csv`) honouring `minScore` and `shortlistedOnly`. |
| FR-10 | P0 | In-memory LRU **cache** keyed by canonical buy-box; response `meta.cacheHit` shown in UI. |
| FR-11 | P0 | Summary stats strip: matches, strong fits, average score, search time (+ Cached badge). |
| FR-12 | P0 | One-click **preset buy-boxes** (3 presets, §11.4) for demo. |
| FR-13 | P1 | Persist the last buy-box in `localStorage` and restore it on load. |
| FR-14 | P1 | Rate limit `POST /api/searches` (60 req/min/IP) with `express-rate-limit`. |
| FR-15 | P1 | Client-side pagination (25 rows/page). |
| FR-16 | P1 | `docs/SCORING.md` documenting the scoring model with the worked examples. |
| FR-17 | P2 | `GooglePlacesProvider` behind `LIVE_PROVIDER=google` + `GOOGLE_PLACES_API_KEY`; results mapped to `RawCompany`, de-duplicated, upserted. |
| FR-18 | P2 | Web unit tests (vitest) for `lib/filters.ts`. |

## 4. Domain model (put in `shared/src/types.ts` and `shared/src/schemas.ts`)

### 4.1 Constants (`shared/src/constants.ts`)

```ts
export const INDUSTRIES = [
  'hvac', 'plumbing', 'electrical', 'roofing',
  'landscaping', 'pest-control', 'cleaning-services',
  'auto-repair', 'dental-practice', 'veterinary-clinic',
  'laundromat', 'self-storage',
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const INDUSTRY_LABELS: Record<Industry, string> = {
  'hvac': 'HVAC', 'plumbing': 'Plumbing', 'electrical': 'Electrical', 'roofing': 'Roofing',
  'landscaping': 'Landscaping', 'pest-control': 'Pest Control',
  'cleaning-services': 'Cleaning Services', 'auto-repair': 'Auto Repair',
  'dental-practice': 'Dental Practice', 'veterinary-clinic': 'Veterinary Clinic',
  'laundromat': 'Laundromat', 'self-storage': 'Self-Storage',
};

/** Industries in the same group are "adjacent" (partial industry credit). */
export const ADJACENT_GROUPS: Industry[][] = [
  ['hvac', 'plumbing', 'electrical', 'roofing'],
  ['landscaping', 'pest-control', 'cleaning-services'],
  ['dental-practice', 'veterinary-clinic'],
];

export const SUPPORTED_STATES = ['TX','FL','CA','AZ','GA','NC','OH','IL','PA','TN'] as const;
export type StateCode = (typeof SUPPORTED_STATES)[number];

export const SCORE_WEIGHTS = {
  industry: 25, location: 15, size: 20, revenue: 15, tenure: 15, owner: 10,
} as const; // sums to 100

export const FIT_BANDS = { strong: 75, possible: 50 } as const; // >=75 strong, >=50 possible, else weak
export const MAX_RANGE_DEVIATION = 0.5; // 50% outside a range => 0 points
```

### 4.2 Types (`shared/src/types.ts`)

```ts
export type CompanyStatus = 'NEW' | 'SHORTLISTED' | 'REJECTED';
export type Fit = 'strong' | 'possible' | 'weak';
export type ConfidenceLabel = 'high' | 'medium' | 'low';
export type ScoreKey = 'industry' | 'location' | 'size' | 'revenue' | 'tenure' | 'owner';
export type Tone = 'positive' | 'neutral' | 'negative';

export interface NumberRange { min: number; max: number }

export interface BuyBox {
  industries: Industry[];            // 1..5
  states: StateCode[];               // 1..10
  cities: string[];                  // 0..10, free text, compared case-insensitively
  employees: NumberRange;            // 1..10000
  revenue: NumberRange;              // USD, 0..1_000_000_000
  minYearsInBusiness: number;        // 0..50, default 10
  requireOwnerContact: boolean;      // default false
  limit: number;                     // 1..500, default 100
}

/** A company record as produced by a source (before DB ids). */
export interface RawCompany {
  name: string;
  industry: Industry;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  street?: string | null;
  city: string;
  state: StateCode;
  zip?: string | null;
  employeeCount?: number | null;
  estimatedRevenue?: number | null;   // USD
  revenueConfidence?: number | null;  // 0..1
  yearFounded?: number | null;
  ownerName?: string | null;
  ownerTitle?: string | null;
  ownerLinkedinUrl?: string | null;
  rating?: number | null;             // 0..5
  reviewCount?: number | null;
  sources: string[];                  // e.g. ['directory_a']
}

export interface Company extends RawCompany {
  id: string;
  normalizedName: string;
  domain: string | null;
  status: CompanyStatus;
}

export interface ScoreComponent {
  key: ScoreKey;
  label: string;      // 'Industry' | 'Location' | 'Team size' | 'Revenue' | 'Tenure (succession)' | 'Owner reachability'
  points: number;     // integer 0..max
  max: number;
  tone: Tone;         // positive >=70% of max, neutral 30-<70%, negative <30%
  reason: string;     // human-readable, templates in §5.4
}

export interface ScoredLead extends Company {
  rank: number;                 // 1-based
  score: number;                // integer 0..100
  fit: Fit;
  confidence: number;           // 0..1, 2 decimals
  confidenceLabel: ConfidenceLabel;
  yearsInBusiness: number | null;
  breakdown: ScoreComponent[];  // always 6 items in the order of SCORE_WEIGHTS keys
}

export interface SearchMeta {
  cacheHit: boolean;
  durationMs: number;       // server handling time for this request
  candidateCount: number;   // rows retrieved before scoring
  resultCount: number;      // rows returned (after limit)
  createdAt: string;        // ISO
}

export interface SearchResponse {
  search: { id: string; buyBox: BuyBox; meta: SearchMeta };
  results: ScoredLead[];
}

export interface ApiError { error: { code: string; message: string; details?: unknown } }
```

### 4.3 Zod schemas (`shared/src/schemas.ts`)

```ts
import { z } from 'zod';
import { INDUSTRIES, SUPPORTED_STATES } from './constants';

const range = (minAllowed: number, maxAllowed: number) =>
  z.object({
    min: z.number().min(minAllowed).max(maxAllowed),
    max: z.number().min(minAllowed).max(maxAllowed),
  }).refine(r => r.max >= r.min, { message: 'max must be >= min', path: ['max'] });

export const BuyBoxSchema = z.object({
  industries: z.array(z.enum(INDUSTRIES)).min(1).max(5),
  states: z.array(z.enum(SUPPORTED_STATES)).min(1).max(10),
  cities: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  employees: range(1, 10_000),
  revenue: range(0, 1_000_000_000),
  minYearsInBusiness: z.number().int().min(0).max(50).default(10),
  requireOwnerContact: z.boolean().default(false),
  limit: z.number().int().min(1).max(500).default(100),
});

export const StatusUpdateSchema = z.object({ status: z.enum(['NEW', 'SHORTLISTED', 'REJECTED']) });

export const ExportQuerySchema = z.object({
  minScore: z.coerce.number().int().min(0).max(100).default(0),
  shortlistedOnly: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
});
```

## 5. Scoring specification (the core feature)

Implement in `server/src/domain/scoring/`. Signature:

```ts
export function scoreCompany(company: Company, buyBox: BuyBox, ctx: { currentYear: number }): Omit<ScoredLead, 'rank'>;
```

Total = sum of six integer component scores (each `Math.round`ed) → max 100.

### 5.1 Components

| # | Key | Max | Rule |
|---|---|---|---|
| 1 | `industry` | 25 | company.industry ∈ buyBox.industries → **25**; else adjacent to any selected industry (same `ADJACENT_GROUPS` group) → **12**; else **0** |
| 2 | `location` | 15 | state ∉ buyBox.states → **0**. If `cities` empty → **15**. If city matches (case-insens., trimmed) one of `cities` → **15**. Else (state ok, city not in list) → **8** |
| 3 | `size` | 20 | `rangeScore(employeeCount, employees.min, employees.max, 20)` |
| 4 | `revenue` | 15 | `rangeScore(estimatedRevenue, revenue.min, revenue.max, 15)` |
| 5 | `tenure` | 15 | `years = currentYear - yearFounded`. unknown → 0. `years >= minYears + 10` → **15**. `years >= minYears` → **10**. else `Math.round(10 * years / minYears)` (minYears > 0 guaranteed in this branch) |
| 6 | `owner` | 10 | `ownerName` present → +5; `email` present → +3; `phone` present → +2 |

### 5.2 `rangeScore`

```ts
export function rangeScore(value: number | null | undefined, min: number, max: number, maxPoints: number): number {
  if (value == null) return 0;
  if (value >= min && value <= max) return maxPoints;
  const d = value < min ? (min - value) / min : (value - max) / max; // relative deviation
  return Math.round(maxPoints * Math.max(0, 1 - d / MAX_RANGE_DEVIATION));
}
```
Edge cases: `min === 0` can only occur for revenue; below-range is impossible then. If `max === 0`
and value > 0 → treat `d = 1` (zero points).

### 5.3 Fit band, confidence, years

- `fit`: `score >= 75` → `'strong'`; `score >= 50` → `'possible'`; else `'weak'`.
- `confidence` = (count of non-null among `employeeCount, estimatedRevenue, yearFounded,
  ownerName, email, phone, website`) / 7, rounded to 2 decimals.
  `confidenceLabel`: `>= 0.85` high, `>= 0.55` medium, else low.
- `yearsInBusiness = yearFounded ? currentYear - yearFounded : null`.
- Confidence does **not** change the score; it is shown separately and used as a sort tie-break.

### 5.4 Reason templates (exact)

Money formatting `fmtUsd(v)`: `v < 1_000_000` → `$${Math.round(v/1000)}K`; else
`$${(v/1e6).toFixed(1).replace(/\.0$/,'')}M`.

| Component | Situation | Reason |
|---|---|---|
| industry | exact | `Exact industry match (${label})` |
| industry | adjacent | `Adjacent industry (${label})` |
| industry | none | `Outside target industries (${label})` |
| location | no cities, state ok | `In target state (${state})` |
| location | city match | `In target city (${city})` |
| location | state ok, city not listed | `In target state (${state}), outside target cities` |
| location | state not ok | `Outside target states (${state})` |
| size | unknown | `Employee count unknown` |
| size | within | `${n} employees — within ${min}–${max}` |
| size | below, d < 0.5 | `${n} employees — ${pct}% below minimum (${min})` |
| size | above, d < 0.5 | `${n} employees — ${pct}% above maximum (${max})` |
| size | d ≥ 0.5 | `${n} employees — far ${below|above} target range` |
| revenue | unknown | `Revenue unknown` |
| revenue | within | `Est. revenue ${fmtUsd(v)} — within ${fmtUsd(min)}–${fmtUsd(max)}` |
| revenue | below/above, d < 0.5 | `Est. revenue ${fmtUsd(v)} — ${pct}% below minimum (${fmtUsd(min)})` / `above maximum (${fmtUsd(max)})` |
| revenue | d ≥ 0.5 | `Est. revenue ${fmtUsd(v)} — far ${below|above} target range` |
| tenure | unknown | `Year founded unknown` |
| tenure | ≥ min+10 | `${years} yrs in business (≥${min+10} — strong succession signal)` |
| tenure | ≥ min | `${years} yrs in business (meets ${min}-yr minimum)` |
| tenure | < min | `${years} yrs in business (below ${min}-yr minimum)` |
| owner | any | join non-empty parts with ` · `: `Owner identified (${ownerName})`, `Email available`, `Phone available`; none → `No owner or contact data` |

`pct = Math.round(d * 100)`. Tone: `points/max >= 0.7` positive; `>= 0.3` neutral; else negative.

### 5.5 Worked examples (use as unit tests; `currentYear = 2026`)

Buy-box **BB1**: `industries ['hvac']`, `states ['TX']`, `cities []`, `employees {10,50}`,
`revenue {1_000_000, 8_000_000}`, `minYearsInBusiness 10`.

| Company | Facts | industry | location | size | revenue | tenure | owner | **Total** | fit |
|---|---|---|---|---|---|---|---|---|---|
| **A** | hvac, TX/Austin, 25 emp, $3.2M, founded 2001, owner "Dana Ruiz", email, phone | 25 | 15 | 20 | 15 | 15 (25 yrs ≥ 20) | 10 | **100** | strong |
| **B** | plumbing, TX/Dallas, 8 emp, revenue null, founded 2012, no owner, email only | 12 | 15 | 12 (d=0.2) | 0 | 10 (14 yrs) | 3 | **52** | possible |
| **C** | hvac, TX, 40 emp, $500K, founded 2022, nothing else | 25 | 15 | 20 | 0 (d=0.5) | 4 (round(10×4/10)) | 0 | **64** | possible |

`rangeScore` checks: `rangeScore(800_000, 1_000_000, 8_000_000, 15) === 9`;
`rangeScore(500_000, 1_000_000, 8_000_000, 15) === 0`; `rangeScore(null, …) === 0`;
`rangeScore(60, 10, 50, 20) === 12` (d = 0.2).

### 5.6 Ranking order

Sort by: `score` desc → `confidence` desc → `reviewCount` desc (null = 0) → `name` asc.
Then slice to `buyBox.limit` and assign `rank = index + 1`.

## 6. De-duplication specification

Implement in `server/src/domain/dedupe/` (pure functions).

### 6.1 Normalisation (`normalize.ts`)

- `normalizeName(name)`: lowercase → replace `&` with `and` → remove punctuation (`[^a-z0-9\s]`)
  → split on whitespace → drop tokens in `{llc, inc, incorporated, corp, corporation, co,
  company, ltd, llp, pllc, pc, the}` → join with single space → trim.
  Example: `"Ramirez Heating & Air, LLC"` → `"ramirez heating and air"`.
- `normalizeDomain(website)`: null/empty → null; strip protocol, `www.`, path/query/port;
  lowercase; return null if domain is in `GENERIC_DOMAINS = ['facebook.com','yelp.com',
  'linkedin.com','instagram.com','google.com','business.site','wixsite.com','squarespace.com',
  'godaddysites.com','weebly.com']`.
- `normalizePhone(phone)`: keep digits; if 11 digits starting with `1` drop the leading `1`;
  return the 10-digit string or null if not exactly 10 digits.
- `similarity(a, b)` = `1 - levenshtein(a, b) / max(a.length, b.length)` (use `fastest-levenshtein`);
  both empty → 0.

### 6.2 Matching and merging (`index.ts`)

```ts
export interface DedupeResult { companies: RawCompany[]; stats: { input: number; output: number; duplicatesRemoved: number } }
export function dedupe(records: RawCompany[]): DedupeResult;
```

1. **Blocking:** group records by `state` (never compare across states).
2. Within a block, two records are a **match** if ANY of:
   - same non-null `normalizeDomain(website)`;
   - same non-null `normalizePhone(phone)`;
   - same `normalizeName` **and** same city (case-insensitive);
   - `similarity(normalizedName) >= 0.92` **and** same city (case-insensitive) **and** same `industry`.
3. Build clusters with **union-find** over matched pairs (O(n²) within a state block is fine for ≤ 1,500 rows).
4. **Merge each cluster:** primary = record with the most non-null fields (tie → first). For every
   field that is null/empty on the primary, take the first non-null value from the other records
   (in input order). `sources` = sorted union. Keep primary `name`.
5. Return merged records in a stable order (order of each cluster's first record in the input).

### 6.3 Required test cases (`dedupe.test.ts`)

1. Same domain, different names → merged.
2. Same phone in different formats (`(512) 555-0142` vs `+1 512-555-0142`) → merged.
3. `"Ramirez Heating & Air LLC"` vs `"Ramirez Heating and Air"`, same city → merged.
4. Same name, **different city** → NOT merged.
5. Same name + city, **different state** → NOT merged (blocking).
6. Merge fills nulls from secondary and unions `sources`.
7. Generic domain (`facebook.com`) alone does not trigger a merge.
8. `stats` numbers are correct.

## 7. Search pipeline & caching

`server/src/services/search.service.ts` — interface used for dependency injection:

```ts
export interface SearchService {
  run(buyBox: BuyBox): Promise<SearchResponse>;
  getById(id: string): Promise<SearchResponse | null>;
  exportCsv(id: string, opts: { minScore: number; shortlistedOnly: boolean }): Promise<string | null>;
}
```

`run()` steps:
1. **Canonicalise** the buy-box: sort `industries` and `states`; lowercase+trim+sort `cities`;
   stable key order. `key = sha256(JSON.stringify(canonical))` (hex).
2. **Cache lookup** (`lru-cache`, `max = CACHE_MAX_ENTRIES`, `ttl = CACHE_TTL_SECONDS * 1000`).
   Hit → return cached `SearchResponse` with `meta.cacheHit = true` and `meta.durationMs` = this
   request's handling time.
3. **Retrieve candidates** via Prisma: `state IN buyBox.states`,
   `industry IN (selected ∪ adjacent(selected))`, `status != 'REJECTED'`; if
   `requireOwnerContact`: `ownerName != null AND (email != null OR phone != null)`.
4. **Score** every candidate with `scoreCompany(c, buyBox, { currentYear: new Date().getFullYear() })`
   (the *service* may read the clock; the *domain* may not).
5. **Sort, slice, rank** (§5.6).
6. **Persist** `Search` + `SearchResult` rows in one transaction (`createMany`).
7. Build `SearchResponse`, store in cache, return.

**Invalidation:** `PATCH /api/companies/:id/status` calls `cache.clear()`.

**Performance targets:** uncached p95 < 300 ms for ≤ 1,500 companies (local); cached < 50 ms.
Required DB indexes in §9.

## 8. API contract

Base path `/api`. JSON in/out. Errors always `{"error":{"code","message","details?"}}`.

| Method & path | Body / query | Success | Errors |
|---|---|---|---|
| `GET /api/health` | — | `200 {"status":"ok","time":"<ISO>"}` | — |
| `GET /api/meta/options` | — | `200 {"industries":[{"value","label"}],"states":["TX",…]}` | — |
| `POST /api/searches` | `BuyBox` | `201 SearchResponse` (cache hit: `200`) | `400 VALIDATION_ERROR`, `429 RATE_LIMITED` |
| `GET /api/searches/:id` | — | `200 SearchResponse` (fresh statuses from DB, `cacheHit:false`) | `404 NOT_FOUND` |
| `GET /api/searches/:id/export.csv` | `?minScore=0&shortlistedOnly=false` | `200 text/csv` | `400`, `404` |
| `PATCH /api/companies/:id/status` | `{ "status": "SHORTLISTED" }` | `200 {"id","status"}` | `400`, `404` |

Error codes: `VALIDATION_ERROR` (400, `details` = zod `flatten()`), `NOT_FOUND` (404),
`RATE_LIMITED` (429), `INTERNAL_ERROR` (500, generic message).

### 8.1 CSV spec

- Header row (exact): `rank,score,fit,name,industry,city,state,website,phone,email,employees,est_revenue_usd,years_in_business,owner_name,owner_title,owner_linkedin,confidence,top_reasons,shortlisted`
- `top_reasons` = the two highest-points components' reasons joined by `" | "`.
- `shortlisted` = `yes` / `no`.
- UTF-8 **with BOM** (`\uFEFF`), `\r\n` line endings, RFC 4180 quoting (quote when value contains
  `,` `"` `\r` `\n`; double internal quotes).
- **CSV-injection guard:** if a *string* cell starts with `=`, `+`, `-`, `@`, tab, or CR, prefix
  with a single quote `'`.
- Headers: `Content-Type: text/csv; charset=utf-8`;
  `Content-Disposition: attachment; filename="buybox-radar-<searchId>.csv"`.
- Rows ordered by `rank`; apply `minScore` and `shortlistedOnly`; exclude REJECTED.

## 9. Database (PostgreSQL 16 + Prisma)

`server/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum CompanyStatus {
  NEW
  SHORTLISTED
  REJECTED
}

model Company {
  id                String        @id @default(cuid())
  name              String
  normalizedName    String
  industry          String
  website           String?
  domain            String?
  phone             String?
  email             String?
  street            String?
  city              String
  state             String
  zip               String?
  employeeCount     Int?
  estimatedRevenue  Int?
  revenueConfidence Float?
  yearFounded       Int?
  ownerName         String?
  ownerTitle        String?
  ownerLinkedinUrl  String?
  rating            Float?
  reviewCount       Int?
  sources           String[]
  status            CompanyStatus @default(NEW)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  results           SearchResult[]

  @@index([state, industry])
  @@index([domain])
  @@index([normalizedName, city, state])
}

model Search {
  id             String         @id @default(cuid())
  buyBox         Json
  buyBoxHash     String
  candidateCount Int
  resultCount    Int
  durationMs     Int
  createdAt      DateTime       @default(now())
  results        SearchResult[]

  @@index([buyBoxHash])
}

model SearchResult {
  id         String  @id @default(cuid())
  searchId   String
  companyId  String
  rank       Int
  score      Int
  confidence Float
  breakdown  Json
  search     Search  @relation(fields: [searchId], references: [id], onDelete: Cascade)
  company    Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([searchId, companyId])
  @@index([searchId, rank])
}
```

Run `npx prisma migrate dev --name init` and **commit** the generated migration folder.

## 10. Seed data specification (`server/scripts/generate-seed.ts`)

Deterministic generator (`@faker-js/faker` with `faker.seed(42)`) writing
`server/prisma/seed-data/companies.json` (array of `RawCompany`) and
`server/prisma/seed-data/manifest.json` (`{ baseCount, injectedDuplicates, generatedAt }`).
**Commit both files** (the dataset is a submission deliverable).

- **Base:** 1,200 unique companies spread evenly across the 12 industries and 10 supported
  states (5 cities per state — list in §10.1). `sources: ['directory_a']`.
- **Names:** `"{Surname} {IndustryNoun} {Suffix}"`, e.g. `Ramirez Heating & Air LLC`; industry nouns
  per industry (3+ variants each); suffix ∈ {`LLC`,`Inc`,`& Sons`,`Co`,`Services`,``}.
  Guarantee uniqueness of `(normalizedName, city)` and of `domain` and `phone` among base rows.
- **Contact:** `website = https://www.{slug}.example` (reserved TLD); `email = info@{slug}.example`
  (or `owner-first-name@…` when owner known); phone `(AAA) 555-01XX` using state area codes (§10.1).
- **Employees:** log-normal, clamp 3–150. **Revenue:** `employees × revPerEmployee × jitter(0.7–1.3)`
  where `revPerEmployee` is per industry within 80k–250k; round to nearest 10k.
  `revenueConfidence` random 0.5–0.95.
- **Year founded:** 1975–2022 (skew older). **Rating** 3.2–5.0, **reviewCount** 3–800.
- **Owner:** fake person name + title ∈ {`Owner`,`Founder`,`President`,`Co-Owner`};
  `ownerLinkedinUrl = https://www.linkedin.example/in/{slug}`.
- **Missing data (random per field):** employees 15 %, revenue 20 %, yearFounded 10 %, ownerName 35 %
  (then title/linkedin also null), email 25 %, phone 10 %, website 12 %.
- **Injected duplicates (8 % of base = 96 rows):** copy a base row, set `sources: ['directory_b']`, then
  apply 1–2 mutations: swap `&`↔`and`; add/remove `LLC`/`Inc`; change casing; drop leading "The";
  website with/without `www.` or `http://`; phone reformatted (`+1 512-555-0142`); blank 2–3
  random optional fields. Always keep either the same domain **or** the same phone **or** the same
  normalised name+city so it is legitimately matchable. Record the count in `manifest.json`.
- Shuffle final array with the seeded RNG.

### 10.1 Cities and area codes

| State | Cities | Area codes |
|---|---|---|
| TX | Austin, Dallas, Houston, San Antonio, Fort Worth | 512, 214, 713, 210 |
| FL | Miami, Orlando, Tampa, Jacksonville, Fort Myers | 305, 407, 813, 904 |
| CA | Sacramento, San Diego, Fresno, San Jose, Long Beach | 916, 619, 559, 408 |
| AZ | Phoenix, Tucson, Mesa, Chandler, Scottsdale | 602, 520, 480 |
| GA | Atlanta, Savannah, Augusta, Macon, Marietta | 404, 912, 706 |
| NC | Charlotte, Raleigh, Durham, Greensboro, Asheville | 704, 919, 336 |
| OH | Columbus, Cleveland, Cincinnati, Dayton, Toledo | 614, 216, 513 |
| IL | Chicago, Naperville, Springfield, Peoria, Rockford | 312, 630, 217 |
| PA | Philadelphia, Pittsburgh, Allentown, Erie, Harrisburg | 215, 412, 610 |
| TN | Nashville, Memphis, Knoxville, Chattanooga, Franklin | 615, 901, 865 |

### 10.2 Seed loader (`server/src/seed/seed.ts`)

1. Read `SEED_FILE` (default `./prisma/seed-data/companies.json`, relative to cwd).
2. Flag `--if-empty`: exit 0 immediately if `Company` count > 0.
3. Run `dedupe()`; print `Seed: input N → output N (duplicatesRemoved N)`.
4. Compute `normalizedName` and `domain` for each; `createMany` in batches of 500 (`skipDuplicates`).
5. Idempotent: without `--if-empty`, it **truncates** `SearchResult`, `Search`, `Company` first.

## 11. Frontend specification

### 11.1 Layout (single page, no router)

```
┌ Header: "BuyBox Radar" + tagline "Rank acquisition targets by thesis fit" ───────────────┐
├ Left (w-[340px], sticky, lg+) ───────┬ Main ───────────────────────────────────────────┤
│ Preset chips                         │ SummaryStats: Matches | Strong fits | Avg score | Search time [Cached] │
│ BuyBoxForm                           │ FilterBar + Export button                         │
│  [Run search]                        │ ResultsTable (expandable rows) + Pagination       │
└──────────────────────────────────────┴───────────────────────────────────────────────────┘
< lg: form stacks above results; table scrolls horizontally inside its container.
```

### 11.2 BuyBoxForm fields

- **Industries:** multi-select chips (max 5) from `/api/meta/options`.
- **States:** multi-select chips. **Cities:** tag input (type + Enter; max 10).
- **Employees:** min/max number inputs. **Revenue:** min/max number inputs with `$` prefix and
  helper text rendering `fmtUsd`.
- **Min years in business:** number input (0–50). **Require owner contact:** switch.
- **Limit:** select (50, 100, 250, 500). Submit button disabled while pending or invalid.
- Validate with `BuyBoxSchema.safeParse` on submit; show inline field errors (red text under field).

### 11.3 Results UI

- **ScoreBadge:** pill with number; `>=75` emerald, `50–74` amber, `<50` slate. Label under/next:
  Strong fit / Possible / Weak.
- **ConfidenceChip:** `High` / `Medium` / `Low` small outlined chip.
- **Expanded row (ScoreBreakdown):** 6 rows, each = label, horizontal bar (`points/max`, colour by
  tone: positive emerald, neutral amber, negative rose), `points/max`, reason text. Plus contact
  block (email, phone, owner LinkedIn link) and Shortlist / Reject buttons.
- **Shortlist:** star toggle in row (optimistic update via React Query). **Reject** removes the row
  locally and calls the API.
- **FilterBar:** min-score slider (0–100, step 5), checkboxes *Has email*, *Has owner*,
  *Shortlisted only*, text input (matches name or city), sort select
  (`Score ↓` default, `Employees ↓`, `Revenue ↓`, `Years in business ↓`, `Name A–Z`).
- **ExportButton:** link to `/api/searches/:id/export.csv?minScore=…&shortlistedOnly=…` using current filter values.
- **States:** initial (EmptyState: "Pick a preset or define your buy-box"), loading (Skeleton rows),
  zero results (EmptyState with tips "Widen employee/revenue range or add states"), error (ErrorBanner with message + retry).
- **A11y:** labelled inputs, visible focus rings, `aria-expanded` on row toggles, colour never the only signal (text labels included).

### 11.4 Presets (`web/src/lib/presets.ts`)

| Name | industries | states | cities | employees | revenue | minYears | ownerContact |
|---|---|---|---|---|---|---|---|
| HVAC · Texas (default) | hvac | TX | — | 10–50 | $1M–$8M | 10 | false |
| Home services · Florida | plumbing, electrical, roofing | FL | — | 5–40 | $0.8M–$6M | 10 | true |
| Dental · AZ & GA | dental-practice | AZ, GA | — | 8–40 | $1.5M–$7M | 12 | false |

### 11.5 Design tokens

Font: Inter (Google Fonts link in `index.html`). Background `slate-50`; cards `bg-white rounded-xl
border border-slate-200 shadow-sm`; primary `indigo-600` (hover `indigo-700`); text `slate-900`/`slate-600`;
radius `rounded-lg` inputs; spacing multiples of 4. No dark mode.

## 12. Non-functional requirements

- **Security:** `helmet`, `cors` (origin from `CORS_ORIGIN`), zod validation on every input, body limit 100 kb,
  no stack traces to clients, rate limit (FR-14), CSV-injection guard, no secrets in repo.
- **Observability:** `pino` + `pino-http`; log search duration, candidate count, cache hit.
- **Reliability:** graceful shutdown on `SIGTERM` (close server + `prisma.$disconnect()`).
- **Config:** all config via env (§14), validated at boot with zod (`server/src/config/env.ts`); fail fast.
- **Quality:** TS strict, ESLint clean, Prettier formatted, tests green, no `any`.

## 13. Tech stack (exact)

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript 5.x (strict) | everywhere |
| Runtime | Node.js 20 LTS | `engines.node >= 20` |
| Monorepo | npm workspaces: `shared`, `server`, `web` | no turborepo/nx |
| Frontend | React 18 + Vite 5 + Tailwind CSS 3.4 (postcss, autoprefixer) | no UI kit |
| Frontend libs | `@tanstack/react-query` v5, `lucide-react`, `clsx`, `zod` | plain `useState` for form |
| Backend | Express 4 | `helmet`, `cors`, `express-rate-limit`, `pino`, `pino-http` |
| Validation | zod 3 (shared) | single source of truth |
| ORM / DB | Prisma 5 + PostgreSQL 16 | Docker locally; Azure Postgres Flexible Server in prod |
| Cache | `lru-cache` (in-process) | Redis noted as future work |
| Dedupe | custom + `fastest-levenshtein` | |
| Seed | `@faker-js/faker` (dev) | deterministic seed 42 |
| Tests | `vitest` + `supertest` (server) | web tests are P2 |
| Build | `tsup` (API → CJS bundle, bundles `@radar/shared`), Vite (web) | |
| Dev runner | `tsx watch`, `concurrently` | |
| Lint/format | ESLint 9 flat config + `typescript-eslint`, Prettier | |
| Container | Docker multi-stage on `node:20-bookworm-slim` | single image serves API + static web |
| Hosting | Azure App Service (Linux container) + Azure Container Registry + Azure Database for PostgreSQL Flexible Server | static-from-server; serverless not used (see 03 §5) |
| CI | GitHub Actions (`ci.yml`) | typecheck, lint, test, build |

Package names: `@radar/shared`, `@radar/server`, `@radar/web`.

**Dependencies by package**

- `shared`: `zod`
- `server` deps: `express@4`, `@prisma/client@5`, `zod`, `@radar/shared`, `cors`, `helmet`, `express-rate-limit`, `pino`, `pino-http`, `lru-cache`, `fastest-levenshtein`
  devDeps: `prisma@5`, `typescript`, `tsx`, `tsup`, `vitest`, `supertest`, `@types/express@4`, `@types/node`, `@types/cors`, `@types/supertest`, `@faker-js/faker`
- `web` deps: `react`, `react-dom`, `@tanstack/react-query`, `lucide-react`, `clsx`, `@radar/shared`
  devDeps: `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss@3`, `postcss`, `autoprefixer`, `@types/react`, `@types/react-dom`
- root devDeps: `concurrently`, `eslint`, `typescript-eslint`, `prettier`, `typescript`

## 14. Environment variables (`server/.env.example`)

```
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://radar:radar@localhost:5432/radar?schema=public"
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
CACHE_TTL_SECONDS=600
CACHE_MAX_ENTRIES=100
WEB_DIST_DIR=            # set in Docker to /app/web-dist; empty in dev
SEED_FILE=./prisma/seed-data/companies.json
SEED_ON_BOOT=false       # true in Docker/Azure for first boot
LIVE_PROVIDER=none       # P2: none | google
GOOGLE_PLACES_API_KEY=   # P2 only
```

## 15. Root scripts (`package.json`)

```json
{
  "name": "buybox-radar",
  "private": true,
  "workspaces": ["shared", "server", "web"],
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "concurrently -n api,web -c blue,green \"npm run dev -w server\" \"npm run dev -w web\"",
    "build": "npm run build -w web && npm run build -w server",
    "start": "npm run start -w server",
    "typecheck": "npm run typecheck -ws --if-present",
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "npm run test -w server",
    "db:up": "docker compose up -d db",
    "db:migrate": "npm run db:migrate -w server",
    "db:seed": "npm run db:seed -w server",
    "seed:generate": "npm run seed:generate -w server"
  }
}
```

Server scripts: `dev: tsx watch src/index.ts`, `build: prisma generate && tsup`, `start: node dist/index.js`,
`test: vitest run`, `typecheck: tsc --noEmit`, `db:migrate: prisma migrate dev`,
`db:deploy: prisma migrate deploy`, `db:seed: tsx src/seed/seed.ts`, `seed:generate: tsx scripts/generate-seed.ts`.
Web scripts: `dev: vite`, `build: tsc --noEmit && vite build`, `typecheck: tsc --noEmit`.
Vite dev proxy: `/api` → `http://localhost:4000`.

## 16. Testing requirements (all must pass in CI, no DB needed)

| File | Must cover |
|---|---|
| `normalize.test.ts` | name/domain/phone normalisation examples from §6.1 |
| `dedupe.test.ts` | the 8 cases in §6.3 |
| `scoring.test.ts` | worked examples A/B/C (§5.5), `rangeScore` checks, tenure thresholds, owner points, confidence labels, fit bands, tone thresholds, deterministic output for same input |
| `csv.test.ts` | quoting, BOM, CRLF, injection guard |
| `api.test.ts` | via `supertest` against `createApp({ searchService: fake, companyService: fake })`: `/api/health` 200; invalid buy-box → 400 `VALIDATION_ERROR` with the standard error shape; valid POST → 201 shape; unknown search id → 404; CSV headers/content-type |

`createApp` MUST accept injected services so API tests need no database.

## 17. Deployment specification

### 17.1 `Dockerfile` (repo root)

```dockerfile
# ---- build ----
FROM node:20-bookworm-slim AS build
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:20-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=8080 WEB_DIST_DIR=/app/web-dist
WORKDIR /app
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/web/dist ./web-dist
COPY --from=build /app/server/prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 8080
CMD ["./docker-entrypoint.sh"]
```

### 17.2 `docker-entrypoint.sh`

```sh
#!/bin/sh
set -e
npx prisma migrate deploy --schema ./prisma/schema.prisma
if [ "$SEED_ON_BOOT" = "true" ]; then node dist/seed.js --if-empty; fi
exec node dist/index.js
```

### 17.3 `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: radar
      POSTGRES_PASSWORD: radar
      POSTGRES_DB: radar
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U radar -d radar"]
      interval: 5s
      timeout: 3s
      retries: 10
  app:
    profiles: ["full"]
    build: .
    environment:
      DATABASE_URL: postgresql://radar:radar@db:5432/radar?schema=public
      SEED_ON_BOOT: "true"
      PORT: "8080"
    ports: ["8080:8080"]
    depends_on:
      db:
        condition: service_healthy
volumes:
  pgdata:
```

### 17.4 `server/tsup.config.ts`

```ts
import { defineConfig } from 'tsup';
export default defineConfig({
  entry: { index: 'src/index.ts', seed: 'src/seed/seed.ts' },
  format: ['cjs'],
  target: 'node20',
  noExternal: ['@radar/shared'],
  sourcemap: true,
  clean: true,
});
```

### 17.5 Express production behaviour

If `WEB_DIST_DIR` is set and exists: `express.static(WEB_DIST_DIR)` and, for any non-`/api` GET,
serve `index.html` (SPA fallback via `app.get('*', …)` registered **after** API routes).

### 17.6 Azure (full commands in 03 §6; written to `docs/DEPLOYMENT.md`)

Azure Container Registry → App Service (Linux, container, port 8080) + Azure Database for
PostgreSQL Flexible Server (Burstable). App settings: `DATABASE_URL` (with `sslmode=require`),
`SEED_ON_BOOT=true`, `WEBSITES_PORT=8080`, `NODE_ENV=production`, `CORS_ORIGIN=https://<app>.azurewebsites.net`.

## 18. Acceptance criteria (Definition of Done)

**Functional**
- [ ] AC-1 Preset "HVAC · Texas" returns ≥ 20 results, sorted by score desc, with ranks 1..N.
- [ ] AC-2 Every result has 6 breakdown components whose points sum to `score`.
- [ ] AC-3 Expanding a row shows reasons exactly matching the templates in §5.4.
- [ ] AC-4 Re-running the same buy-box shows **Cached** and server time < 50 ms.
- [ ] AC-5 Shortlisting persists after page refresh (re-fetch via `GET /api/searches/:id` or re-search).
- [ ] AC-6 Rejected company never appears in later searches.
- [ ] AC-7 CSV opens in Excel/Sheets with correct columns, respects `minScore`/`shortlistedOnly`.
- [ ] AC-8 Invalid inputs (e.g., `employees.max < min`) show inline errors and server returns 400 with the standard shape.
- [ ] AC-9 Seed log shows duplicates removed ≥ 90 % of `manifest.injectedDuplicates` and output ≥ 1,190 companies.

**Quality**
- [ ] AC-10 `npm run typecheck`, `npm run lint`, `npm test` all pass.
- [ ] AC-11 `docker build .` succeeds; `docker compose --profile full up` serves UI+API on `:8080`.
- [ ] AC-12 README has: overview, screenshots, setup (≤ 6 commands), architecture, scoring explanation, API list, tech stack, deployment, limitations, AI-assistance disclosure, synthetic-data note.

**P2 (only if everything above passes):** FR-17 Google Places provider, FR-18 web tests.

## 19. (P2) Google Places provider notes

`POST https://places.googleapis.com/v1/places:searchText` with headers `X-Goog-Api-Key` and
`X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.addressComponents`;
body `{ "textQuery": "<industry label> in <city>, <state>", "pageSize": 20 }`. Map to `RawCompany`
with `sources: ['google_places']`, run through `dedupe()` together with existing DB rows for that state,
upsert. Verify field names against current Google docs before implementing. Never required for submission.
