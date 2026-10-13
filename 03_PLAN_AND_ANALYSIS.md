# 03 — Plan & Analysis: BuyBox Radar

> **Index:** §1 Challenge decoding · §2 SaaSquatch teardown · §3 Feature choice · §4 Architecture
> decisions & tradeoffs · §5 Hosting decision · §6 Azure deployment · §7 Deliverables (video,
> README, essays, submission) · **§8 Milestone plan (M0–M7) ← the coding agent executes this** ·
> §9 Risks & cut list · §10 Human-only checklist.
>
> Coding agent: read everything, but your execution order is **§8**. Sections 1–5 explain *why*
> so you never need to re-decide anything.

---

## 1. Challenge decoding

**Source:** Caprae Capital "Full Stack Developer Interview Pre-Work" handbook (AI-readiness
pre-screen). Task: analyse the lead-gen tool **SaaSquatch** and, in **≤ 5 hours of coding**, build
one or two impactful features (*quality-first* or *quantity-driven*), then explain design choices
in a 1–2 minute video, with GitHub repo + README (+ dataset if permissible) and an optional demo.
The handbook asks explicitly for UX choices, backend architecture, **data storage (specific DB)**,
caching/performance, **hosting (static vs serverless)**, deployment process, cloud provider, and
exact technologies.

**Scoring (40 pts) → how we earn each:**

| Criterion | Pts | What the graders want | Our deliverable |
|---|---|---|---|
| Business use-case understanding | 10 | Prioritise high-impact leads, minimise irrelevant data, fit sales workflow, target Caprae's market (acquisition entrepreneurs) | Thesis-driven **buy-box**, explainable fit score, require-owner-contact filter, shortlist/reject, CSV export for CRM |
| UX/UI | 10 | Clean, intuitive, guided filtering/exporting/verifying, minimal learning curve | Presets, guided form with inline validation, ranked table, expandable "why this score", filters, skeleton/empty/error states |
| Technicality | 10 | Accurate data, dedupe/enrichment/validation, reliable at scale, speed | Record-linkage **dedupe** (union-find + fuzzy), pure scoring engine, indexed Postgres, LRU cache, tests |
| Design | 5 | Polished, professional, purposeful visuals | Tailwind design tokens (01 §11.5), score colour system, consistent spacing |
| Other | 5 | Creativity, reporting, ethical data practices, docs, strategy | Explainability, ethical/synthetic dataset note, `SCORING.md`, architecture doc, clear video |

## 2. SaaSquatch teardown (public sources)

> ⚠️ This was assembled from public web sources (press release, G2/AlternativeTo listings). The
> live site could not be opened during analysis. **Human: spend 15 minutes in the real demo and
> correct this section** before recording the video.

**What it is:** an AI-powered B2B lead-gen platform from Caprae Capital for *acquisition
entrepreneurs / searchers*, launched publicly 25 Jun 2025 at **$20/month**; ~1,200 sign-ups in the
3-week beta. Founder's pitch: tools costing $1,000+/month didn't deliver, so they built a simpler one.

**Data sources named:** Apollo, LinkedIn, Crunchbase, Google Maps, Growjo.

**Features seen in listings:** company search by industry/location/size/revenue; revenue
estimation and confidence scoring; owner names, LinkedIn profiles, ownership structure/parent
companies; contact validation; AI email generator; contact tracking and workflow organisation;
CSV export; investor-deck/financial-model generation.

**Observed weakness (one G2 review):** search can take up to a minute for keyword filtering.

**Gap analysis (what we attack):**

| Gap | Evidence | Our answer |
|---|---|---|
| Lists, not decisions | Listings emphasise discovery + enrichment; "confidence scoring" appears to describe *data* confidence | **Thesis-fit score** (does this company match *my* buy-box?) with per-component explanation. Note: confidence ≠ fit; we show both. *(Verify in demo.)* |
| Slow search | G2 review: up to ~1 minute | Indexed query + in-process cache; show search time in UI |
| Noise / duplicates when merging many sources | Multi-source product by design | Record-linkage dedupe at ingest |
| Time wasted on non-reachable targets | n/a | "Require owner contact" hard filter + owner-reachability score |

## 3. Feature choice

| Option | Business fit | UX impact | Technical depth | Risk in 5 h | Verdict |
|---|---|---|---|---|---|
| **A. Buy-Box Scorer** (thesis fit ranking + explanation) | ★★★ | ★★★ | ★★☆ | Low | **Chosen (core)** |
| B. Speed layer (cache/async search) | ★★☆ | ★★☆ | ★★☆ | Low | **Included** as supporting work |
| C. Email verification/enrichment | ★★☆ | ★☆☆ | ★★☆ | Med (paid APIs, network flakiness) | Skip |
| D. AI outreach email generator | ★★☆ | ★★☆ | ★☆☆ | Low | Skip — SaaSquatch already has one; commodity |
| E. Multi-source scraper | ★★☆ | ★☆☆ | ★★★ | **High** (fragile, ToS/legal, CAPTCHAs) | Skip; mention abstraction (`LeadProvider`) |
| F. Record-linkage dedupe | ★★☆ | ★☆☆ | ★★★ | Low | **Included** (technicality bonus) |

**Positioning line for the video:** *"Other tools hand searchers a list. BuyBox Radar hands them a
ranked shortlist — and shows exactly why each company is on it."*

## 4. Architecture decisions & tradeoffs

| Decision | Chosen | Alternatives | Why / tradeoff |
|---|---|---|---|
| Database | **PostgreSQL 16** | MongoDB | Filters (state, industry), composite indexes, transactions, `JSONB` for score breakdown. Mongo would work (MERN) but relational filters + migrations are cleaner here. |
| ORM | **Prisma** | raw SQL, Drizzle | Type-safe, fast migrations, great DX in a time-box. Cost: bundle weight (acceptable). |
| Scoring time | **At query time** | Precompute | Score depends on the buy-box, so it can't be precomputed globally. 1.5k rows × 6 cheap functions ≈ a few ms. |
| Caching | **In-process LRU** (`lru-cache`) | Redis | Single-instance deploy; zero infra; sub-ms hits. Cost: not shared across instances; cleared on restart. Redis is the documented next step. |
| Filtering/sorting UI | **Client-side** on ≤ 500 rows | server-side | Instant UX, no extra requests. Cost: capped result size (limit ≤ 500). |
| Dedupe algorithm | **Blocking by state + union-find, rule-based + Levenshtein** | ML/embeddings | Deterministic, explainable, testable. O(n²) within state block fine for ≤ 1.5k rows; at scale use blocking keys/LSH. |
| Data source | **Synthetic seed** + `LeadProvider` interface | live scraping | Legal/ethical, deterministic demo, fits 5 h. Real sources plug in behind the interface (Google Places P2). |
| Persistence of searches | **Persist Search + SearchResult** | stateless | Enables export-by-id, shareable results, audit, and "fresh status" reads. |
| Validation | **zod schema shared FE/BE** | duplicate validation | One source of truth; no drift. |
| Packaging | **Single Docker image** serving API + static SPA | separate FE/BE hosting | One deployable, no CORS in prod, simplest Azure setup. |
| Auth | **None** | JWT | Out of scope for the challenge; called out in "limitations". |

## 5. Hosting decision: static vs serverless

The handbook asks for this explicitly. **Answer:** *Hybrid, container-based.* The SPA is built to
static assets (could be moved to a CDN/Azure Static Web Apps), but is served by the same Node
container for simplicity. The API runs as a **long-lived container on Azure App Service (Linux)**
rather than serverless functions because: (1) the in-process LRU cache needs a warm, long-lived
process, (2) serverless cold starts would undercut the "fast search" story, (3) Prisma +
serverless needs connection pooling extras, (4) one image keeps local/prod parity. Tradeoff: we pay
for an always-on plan (B1) and scale vertically/horizontally with a shared cache (Redis) later.

Cloud: **Azure** (App Service + Container Registry + Postgres Flexible Server). Fits the author's
existing Azure experience.

## 6. Azure deployment (human runs; write the final version into `docs/DEPLOYMENT.md`)

> Verify flags with `az <command> --help` — CLI options evolve. Use an **alphanumeric** DB password
> (avoids URL-encoding problems in `DATABASE_URL`). Pick a region where Postgres B1ms and App Service
> B1 are available (e.g., `centralindia`, `eastus`).

```bash
# ---- variables ----
RG=rg-buybox-radar
LOC=centralindia
SUFFIX=$RANDOM
ACR=radaracr$SUFFIX
PG=radar-pg-$SUFFIX
APP=buybox-radar-$SUFFIX
PLAN=plan-buybox-radar
PGPASS='ChangeMe123AlphaNumeric'

az login
az group create -n $RG -l $LOC

# ---- Postgres (creates default DB "flexibleserverdb") ----
az postgres flexible-server create -g $RG -n $PG -l $LOC \
  --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 16 \
  --admin-user radaradmin --admin-password "$PGPASS" \
  --public-access 0.0.0.0 --yes

# ---- Container registry + build image in the cloud ----
az acr create -g $RG -n $ACR --sku Basic --admin-enabled true
az acr build -r $ACR -t buybox-radar:latest .

# ---- App Service (Linux container) ----
az appservice plan create -g $RG -n $PLAN --is-linux --sku B1
az webapp create -g $RG -p $PLAN -n $APP \
  --container-image-name $ACR.azurecr.io/buybox-radar:latest \
  --container-registry-url https://$ACR.azurecr.io \
  --container-registry-user $(az acr credential show -n $ACR --query username -o tsv) \
  --container-registry-password $(az acr credential show -n $ACR --query "passwords[0].value" -o tsv)

az webapp config appsettings set -g $RG -n $APP --settings \
  WEBSITES_PORT=8080 NODE_ENV=production SEED_ON_BOOT=true \
  CORS_ORIGIN=https://$APP.azurewebsites.net \
  DATABASE_URL="postgresql://radaradmin:$PGPASS@$PG.postgres.database.azure.com:5432/flexibleserverdb?sslmode=require&schema=public"

az webapp restart -g $RG -n $APP
az webapp log tail -g $RG -n $APP     # watch migrations + seed + "listening on 8080"
echo "https://$APP.azurewebsites.net"
```

**After the evaluation, delete everything to stop charges:** `az group delete -n $RG --yes`.
**Fallback (10 min):** Render or Railway — connect the GitHub repo, use the Dockerfile, add a Postgres
add-on, set `DATABASE_URL`, `SEED_ON_BOOT=true`, `PORT` per platform.

## 7. Deliverables

### 7.1 Video script (target 110–120 s, ~280 words — record screen + voice; keep it honest)

| Time | Visual | Say (edit into your own voice) |
|---|---|---|
| 0:00–0:15 | Title + SaaSquatch screenshot | "I studied SaaSquatch — a $20/month lead-gen tool for acquisition entrepreneurs. It's great at *finding* companies, but searchers still end up with long lists and no clear priority. I built BuyBox Radar to fix prioritisation." |
| 0:15–0:30 | Buy-box form, click a preset | "A searcher starts with a thesis — say HVAC companies in Texas with 10 to 50 employees and $1–8M revenue. That's the buy-box." |
| 0:30–1:05 | Results table, expand a row | "Every company gets a 0–100 fit score — and I show *why*: industry, location, size, revenue, tenure as a succession signal, and whether the owner is reachable. Duplicates from multiple sources are merged first, so the list is clean." |
| 1:05–1:25 | Filters, shortlist, export | "Filter by score or owner contact, shortlist the best, reject the rest — rejected never come back — and export a CSV straight into a CRM." |
| 1:25–1:45 | Architecture slide / README diagram | "Stack: React and TypeScript front end; Node/Express API; PostgreSQL with Prisma; an in-memory LRU cache so repeat searches return in milliseconds; one Docker image on Azure App Service. Scoring and dedupe are pure, tested functions." |
| 1:45–2:00 | Back to table | "I used synthetic data on purpose — no scraping risk — behind a provider interface, so real sources plug in. Next: Redis, live providers, learning weights from user shortlists. Thanks!" |

Rules: show the live URL; mention AI-assisted development if you used it; don't claim anything unbuilt.

### 7.2 README outline (agent writes in M7)

1. Title + one-line pitch + screenshot/GIF placeholders (`docs/screenshots/`)
2. **Why** (problem, persona, positioning vs SaaSquatch — honest, cite that SaaSquatch analysis is from public info)
3. Features (P0/P1 actually built)
4. **How scoring works** (table of 6 components, bands) → link `docs/SCORING.md`
5. Architecture diagram + data flow → link `docs/ARCHITECTURE.md`
6. Tech stack table (01 §13)
7. **Quick start** (≤ 6 commands): `git clone` · `npm i` · `docker compose up -d db` · `cp server/.env.example server/.env` · `npm run db:migrate && npm run db:seed` · `npm run dev`
8. API reference (table from 01 §8)
9. Testing (`npm test`) and what is covered
10. Deployment (Docker, Azure summary → `docs/DEPLOYMENT.md`)
11. Data & ethics: **dataset is synthetic** (reserved TLDs/phone ranges), generator is deterministic (seed 42)
12. Limitations & roadmap (no auth, single-instance cache, synthetic data, scoring weights are heuristic; next: Redis, live providers, learned weights, CRM integrations)
13. **AI-assistance disclosure** (what was AI-assisted: scaffolding/implementation; what the author designed/reviewed)

### 7.3 Business-understanding material (human writes final answers in own words)

The handbook asks for 3–4 paragraphs each on: *Caprae's mission*, *why you want to work at Caprae*,
*how Caprae is changing the ETA space and broader PE*. **Do not paste generic text — graders see
thousands of applications.** Build from facts, then add your voice. Verify every claim against the
handbook, the founder's posts and the webinar before using it.

| Question | Facts from the handbook / public sources to anchor on | Your angle |
|---|---|---|
| Mission | Transform businesses through strategic initiatives rather than relying on financial engineering; help companies adopt AI for decision-making and operations; SaaS + MaaS (M&A-as-a-Service) models support companies *post*-acquisition; M&A viewed as a ~7-year journey where most value is created after the deal; "founder/operator first" culture; hiring for character, courage, creativity (and "crazy" = drive) | Restate in your words; tie "AI-readiness" to what you built |
| Why Caprae | They build their own tools (SaaSquatch built in-house instead of renting software); value "horsepower over mileage"; this exact challenge is a product-engineering task | Your MERN/TypeScript + Azure background and ~1 year of client project work; the build you just did is your proof — mention one concrete decision (e.g., explainable scoring) and one tradeoff |
| Changing ETA / PE | SaaSquatch: low-priced ($20/mo vs. $1,000+/mo incumbents) tooling for searchers; positions search-as-a-service; operator-led post-acquisition value creation + AI | Give your view: lowering the cost/skill barrier to find targets; where you'd push next (e.g., fit-scoring tied to a searcher's thesis) |

Also answer the short questions truthfully and yourself: US work status, ≥ 40 h/week, expected
salary, "Why Caprae", and the employment-terms confirmation.

⚠️ **Hours check before investing time:** the handbook requires **9AM–6PM Eastern** during the 2–3
month training period plus some off-hours availability. From India that is roughly **7:30 PM–4:30 AM IST
during US standard time (EST)** and **6:30 PM–3:30 AM IST during US daylight time (EDT)**. Confirm this works
for you, and be accurate about US work authorisation, before submitting.

### 7.4 Submission package & email

Send to **recruiting@capraecapital.com**. Subject exactly:
`Full Stack Developer - Handbook Submission - <Your Full Name>` (use the exact role title from the
posting you applied to).

```
Hi Caprae Recruiting Team,

Please find my Full Stack Developer handbook submission:

• GitHub repo: <url>            (README, setup steps, dataset included)
• Live demo: <azure url>
• 2-min video walkthrough: <url>   (unlisted YouTube/Loom)
• Business understanding answers + short-answer responses: attached PDF/Doc
• Resume: attached

Project: BuyBox Radar — explainable, thesis-fit lead ranking with dedupe and CSV export.
Stack: React/TypeScript, Node/Express, PostgreSQL (Prisma), LRU cache, Docker, Azure App Service.

Thank you for your time.
<Name> · <phone/LinkedIn>
```

Checklist: repo public (or access granted) · README renders · demo URL loads in an incognito window ·
video link opens without login · resume attached · subject line exact · sent **before** the deadline
(no extensions are allowed).

## 8. Milestone plan (execute in order)

> Time boxes are the human's 5-hour budget; the agent should simply work in this order. After each
> milestone: run **Done when** commands, then commit with the given message.

### M0 — Scaffold (0:00–0:25)
**Create:** all root files (02 §2), `shared/` + `server/` + `web/` skeleton `package.json`/`tsconfig` files,
`docker-compose.yml`, `.github/workflows/ci.yml`, empty `docs/DECISIONS.md`. Copy brief files to `docs/agent-brief/`.
**Done when:**
```bash
npm install
npm run typecheck          # passes (even with near-empty src)
docker compose up -d db && docker compose ps   # db healthy
```
**Commit:** `chore: scaffold monorepo (workspaces, tooling, docker compose db)`

### M1 — Shared domain + database (0:25–0:55)
**Create:** `shared/src/*` (01 §4), `server/prisma/schema.prisma` (01 §9), `server/src/config/env.ts`,
`server/src/lib/{prisma,logger,errors}.ts`, `.env` from `.env.example`.
**Run:** `npm run db:migrate -w server -- --name init`
**Done when:**
```bash
npm run typecheck
npx prisma validate --schema server/prisma/schema.prisma
ls server/prisma/migrations        # init migration exists
```
**Commit:** `feat(shared,db): domain types, zod schemas, prisma schema + init migration`

### M2 — Dedupe + synthetic data (0:55–1:35)
**Order:** (1) write `normalize.test.ts` + `dedupe.test.ts` (01 §6.3) → (2) `normalize.ts`, `dedupe/index.ts`
→ (3) `scripts/generate-seed.ts` (01 §10) → (4) `seed/seed.ts` (01 §10.2).
**Done when:**
```bash
npm test                              # dedupe + normalize tests green
npm run seed:generate                 # writes companies.json (~1,296 rows) + manifest.json
npm run db:seed                       # prints: Seed: input ~1296 → output ~1200 (duplicatesRemoved ~96)
```
AC-9: removed ≥ 90 % of `manifest.injectedDuplicates`, output ≥ 1,190. If not met, tune matching
thresholds **only within the rules in 01 §6.2** (e.g., ensure generator duplicates keep a legitimate match key).
**Commit:** `feat(server): record-linkage dedupe engine and deterministic synthetic dataset`

### M3 — Scoring engine (1:35–2:25)
**Order:** (1) write `scoring.test.ts` from 01 §5.5 → (2) `format.ts`, `components.ts`, `confidence.ts`, `index.ts`.
**Done when:**
```bash
npm test                  # includes A=100, B=52, C=64 and rangeScore checks
npm run typecheck && npm run lint
```
**Commit:** `feat(server): explainable fit-scoring engine with unit tests`

### M4 — API, cache, export (2:25–3:05)
**Create:** `lib/{cache,hash,csv,csv.test}.ts`, `middleware/*`, `services/*`, `routes/*`, `app.ts`, `index.ts`,
`__tests__/api.test.ts`; rate limiter (FR-14).
**Done when:**
```bash
npm test && npm run typecheck && npm run lint
npm run dev -w server &            # API on :4000
BODY='{"industries":["hvac"],"states":["TX"],"cities":[],"employees":{"min":10,"max":50},"revenue":{"min":1000000,"max":8000000},"minYearsInBusiness":10,"requireOwnerContact":false,"limit":100}'
curl -s -X POST localhost:4000/api/searches -H 'content-type: application/json' -d "$BODY" | head -c 600   # 201 + results
curl -s -o /dev/null -w "uncached %{time_total}s\n" -X POST localhost:4000/api/searches -H 'content-type: application/json' -d '{"industries":["plumbing"],"states":["FL"],"cities":[],"employees":{"min":5,"max":40},"revenue":{"min":800000,"max":6000000},"minYearsInBusiness":10,"requireOwnerContact":false,"limit":100}'
curl -s -o /dev/null -w "cached   %{time_total}s\n" -X POST localhost:4000/api/searches -H 'content-type: application/json' -d '{"industries":["plumbing"],"states":["FL"],"cities":[],"employees":{"min":5,"max":40},"revenue":{"min":800000,"max":6000000},"minYearsInBusiness":10,"requireOwnerContact":false,"limit":100}'
curl -s -X POST localhost:4000/api/searches -H 'content-type: application/json' -d '{"industries":[]}' # 400 VALIDATION_ERROR shape
```
Expected: second call faster (< 50 ms) and returns `200` with `meta.cacheHit:true`.
**Commit:** `feat(server): search, shortlist and CSV export API with LRU cache`

### M5 — Web UI (3:05–4:05)
**Create:** everything in `web/` (02 §5). Include P1: localStorage restore (FR-13), pagination (FR-15).
**Done when:**
```bash
npm run typecheck && npm run build -w web
npm run dev                      # open http://localhost:5173
```
Manual QA (tick all):
- [ ] Preset chip fills form and runs search; table shows ranked rows
- [ ] Expand row → 6 bars + reasons (match 01 §5.4 wording); points sum equals score
- [ ] Filters (min score, has email, has owner, shortlisted only, text, sort) change rows instantly
- [ ] Star toggles instantly; refresh + re-search preserves shortlist
- [ ] Reject removes row; same search no longer returns it
- [ ] Second identical search shows **Cached** badge and ms time
- [ ] CSV downloads, opens correctly, honours filters
- [ ] Validation: set employees max < min → inline error, no request sent
- [ ] Zero-results state and API-down error banner both render
- [ ] Keyboard: Tab reaches all controls; focus ring visible
- [ ] Layout OK at 1440 px and 390 px widths
**Commit:** `feat(web): buy-box form, ranked results, score breakdown, filters, export`

### M6 — Docker, CI, release build (4:05–4:35)
**Create/verify:** `Dockerfile`, `docker-entrypoint.sh`, `.dockerignore`, `ci.yml`.
**Done when:**
```bash
docker build -t buybox-radar .
docker compose --profile full up --build      # app on http://localhost:8080
curl -s localhost:8080/api/health
```
Open `http://localhost:8080` → the same UI works end-to-end with seeded data.
**Commit:** `build: production docker image, entrypoint (migrate+seed), CI workflow`

### M7 — Documentation & polish (4:35–5:00)
**Write:** `README.md` (7.2), `docs/ARCHITECTURE.md`, `docs/SCORING.md`, `docs/DEPLOYMENT.md` (§6),
`docs/VIDEO_SCRIPT.md` (§7.1), complete `docs/DECISIONS.md`. Run a final pass: `npm run format`, `npm run lint`, `npm test`.
**Done when:** AC-1…AC-12 in 01 §18 all tick. Print the Final Report (00 §8).
**Commit:** `docs: readme, architecture, scoring, deployment, video script`

**After M7 (only if time remains):** P2 items (FR-17, FR-18).

## 9. Risks, mitigations, and cut list

| Risk | Likelihood | Mitigation |
|---|---|---|
| Fuzzy dedupe false merges | Med | Block by state, require same city (and industry for fuzzy), threshold 0.92, generator guarantees unique `(normalizedName, city)` among base rows, test case 4/5 |
| Prisma + Docker/openssl runtime errors | Med | `node:20-bookworm-slim` + `apt install openssl` in **both** stages; copy full `node_modules` |
| `@radar/shared` not resolvable at runtime | Med | tsup `noExternal: ['@radar/shared']`; Vite resolves via workspace symlink |
| Azure setup eats time | Med | Do M0–M6 first; deploy last; Render/Railway fallback (§6) |
| UI polish overruns | Med | Fixed design tokens (01 §11.5), no UI kit, cut list below |
| Scoring feels arbitrary to reviewers | Low | Show weights + reasons in UI and `SCORING.md`; state "heuristic weights; next step is learning them from shortlist behaviour" |
| Over-claiming vs SaaSquatch | Med | Teardown labelled "from public sources"; human verifies in the live demo |
| Time-box honesty | — | The brief makes the *build* fast; keep your own hands-on time ≤ 5 h and state AI assistance in the README/video |

**Cut list (drop in this order if behind):** FR-18 → FR-17 → FR-15 pagination → FR-13 localStorage →
FR-14 rate limit → `docs/VIDEO_SCRIPT.md` copy → fancy skeletons. **Never cut:** scoring + breakdown,
dedupe, shortlist/reject, CSV export, scoring/dedupe tests, Docker image, README.

## 10. Human-only checklist (the agent cannot do these)

- [ ] Use the real SaaSquatch demo for 15 min; correct §2 and the video's opening claim
- [ ] Review the scoring weights make business sense to *you* (you must defend them in the interview)
- [ ] Run the Azure deployment (§6); confirm the public URL works in incognito
- [ ] Take 3–4 screenshots/GIF into `docs/screenshots/` and link them in the README
- [ ] Record the ≤ 2-minute video (script §7.1); upload unlisted; test the link logged out
- [ ] Write the business-understanding essays + short answers in your own words (§7.3)
- [ ] Confirm EST/EDT working hours, US work authorisation answer, salary expectation
- [ ] Email the package (§7.4) before the deadline
- [ ] Afterwards: `az group delete -n rg-buybox-radar --yes` to stop Azure charges
