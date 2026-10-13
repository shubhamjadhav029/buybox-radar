# BuyBox Radar

> **Explainable, thesis-fit lead ranking for acquisition entrepreneurs.**

BuyBox Radar evaluates prospective small-business acquisition targets against an investor’s bespoke thesis ("buy-box"). Instead of returning unprioritized directory dumps, BuyBox Radar produces a **ranked shortlist** with an explainable **0–100 fit score**, transparent dimension breakdown, duplicate detection, and CRM-ready CSV export.

---

## 1. Why BuyBox Radar?

### The Problem
Acquisition entrepreneurs and search-fund searchers spend dozens of hours reviewing broad lists returned by conventional lead-generation tools (such as SaaSquatch, Apollo, or scrapers). These tools answer *"Does this company exist and how can I contact them?"*, but fail to answer:
> *"Does this business actually match **my** specific investment criteria, and should I call them before anyone else?"*

### Persona
A searcher conducting cold outreach to small business owners seeking succession sales:
- Focused on specific niches (e.g. HVAC, plumbing, commercial services).
- Seeking specific size ranges ($1M–$8M revenue, 10–50 employees, 10+ years tenure).
- Needs owner contact information up front to avoid wasting time on unreachable targets.
- Demands deduplicated records so the same target doesn't appear under slight name variations.

### Positioning vs. SaaSquatch
*(Based on public teardown of SaaSquatch and Caprae Capital materials)*:
SaaSquatch provides discovery, revenue estimation, and contact data. **BuyBox Radar builds on that foundation by acting as the decision and prioritization layer**:
- Computes thesis fit relative to the entrepreneur's buy-box rather than generic data confidence.
- Provides per-component mathematical explainability (visual breakdown bars + human-readable justifications).
- Delivers sub-50ms repeat searches powered by an in-memory LRU cache.

---

## 2. Features

- **Thesis-Driven Buy-Box**: Specify target industries (1–5), geographic states and cities, employee range, revenue bounds, minimum operating tenure, and owner-reachability toggles.
- **Explainable 0–100 Fit Score**: Pure mathematical score evaluating 6 dimensions with full credit, partial deviation credit, or disqualification.
- **Record-Linkage Deduplication**: Multi-attribute record linkage (state blocking + union-find clustering + domain/phone/fuzzy Levenshtein matching) removes duplicate directory entries at ingest.
- **Interactive Drill-Down Breakdown**: Expand any lead to view 6 score progress bars with reason templates, contact information, owner LinkedIn links, and actions.
- **Shortlist & Rejection Workflow**: Star leads to shortlist them across searches; reject unviable targets to permanently omit them from future queries.
- **Client-Side Filtering & Instant Sorting**: Filter on the fly by score slider, email presence, owner presence, or search text; sort by score, employees, revenue, or tenure.
- **One-Click CSV Export**: Download filtered, ranked shortlists formatted for CRM and spreadsheet import with CSV-injection protection and UTF-8 BOM encoding.
- **Performance & Cache Visibility**: Sub-second uncached database searches; repeat identical queries return in <50ms with a visible `Cached` latency badge.
- **One-Click Preset Theses**: Instantly test real-world scenarios ("HVAC · Texas", "Home services · Florida", "Dental · AZ & GA").

---

## 3. How Fit Scoring Works

Fit scores range from 0 to 100 based on six thesis dimensions. Full details are documented in [docs/SCORING.md](docs/SCORING.md).

| Dimension | Max Pts | Core Criteria |
|-----------|:-------:|---------------|
| `industry` | **25** | 25 pts for exact match; 12 pts for defined adjacent industry (e.g. HVAC ↔ Plumbing) |
| `location` | **15** | 15 pts for target state/city match; 8 pts for target state outside specific target cities; 0 if outside states |
| `size` | **20** | Full points if within employee bounds; partial points down to 50% relative deviation |
| `revenue` | **15** | Full points if within revenue bounds; partial points down to 50% relative deviation |
| `tenure` | **15** | 15 pts if $\ge \text{minYears} + 10$ (strong succession signal); 10 pts if $\ge \text{minYears}$; partial if below |
| `owner` | **10** | Outreach reachability: +5 owner identified, +3 email available, +2 phone available |

- **Fit Bands**: **Strong Fit** ($\ge 75$), **Possible** ($50–74$), **Weak** ($< 50$).
- **Data Confidence**: Independent metric reflecting profile completeness ($0.0–1.0$).

---

## 4. Architecture & Data Flow

```
┌─────────────────┐       HTTP / REST       ┌──────────────────────┐
│  React 18 SPA   │ ──────────────────────> │  Express 4 API       │
│  (Tailwind CSS) │ <────────────────────── │  (Node.js 20 LTS)    │
└─────────────────┘                         └──────────┬───────────┘
                                                       │
                                      ┌────────────────┼────────────────┐
                                      ▼                ▼                ▼
                              ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                              │  LRU Cache   │ │ Domain Logic │ │  Prisma ORM  │
                              │ (In-Process) │ │ (Pure TS)    │ │(Postgres 16) │
                              └──────────────┘ └──────────────┘ └──────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for sequence flows and data schemas.

---

## 5. Tech Stack

| Layer | Technologies | Rationale |
|-------|--------------|-----------|
| **Frontend** | React 18, Vite 5, Tailwind CSS 3.4, `@tanstack/react-query` v5, Lucide Icons | Responsive SPA, instant client-side filtering, optimistic updates |
| **Backend** | Express 4, Node.js 20 LTS, Helmet, CORS, `express-rate-limit`, Pino | Lightweight, fast REST API with security and observability |
| **Database & ORM**| PostgreSQL 16, Prisma ORM 5 | Composite indexes, transactional queries, JSONB breakdowns |
| **Shared Domain** | `@radar/shared` with Zod 3 schemas | Strict TypeScript typing and schema validation shared across FE and BE |
| **Testing** | Vitest, Supertest | Fast unit tests for scoring and dedupe; end-to-end API integration tests |
| **Container & Cloud**| Docker (multi-stage), Azure App Service (Linux container) | Single deployable image serving API and static assets |

---

## 6. Quick Start (Run Locally)

Run these commands to launch the full application locally:

```bash
# 1. Install all dependencies across monorepo workspaces
npm install

# 2. Launch local PostgreSQL database
docker compose up -d db

# 3. Setup environment configuration
cp server/.env.example server/.env

# 4. Run Prisma database migrations
npm run db:migrate -w server

# 5. Generate and seed synthetic dataset (~1,296 raw records -> ~1,200 deduplicated)
npm run seed:generate -w server
npm run db:seed -w server

# 6. Run Web UI and API concurrently in development mode
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 7. API Reference

| Method | Endpoint | Request / Params | Response | Description |
|--------|----------|------------------|----------|-------------|
| `GET` | `/api/health` | — | `{ status: "ok", time }` | Liveness health check |
| `GET` | `/api/meta/options` | — | `{ industries, states }` | Industry and state dropdown options |
| `POST` | `/api/searches` | Body: `BuyBox` | `SearchResponse` (201 / 200 on cache hit) | Evaluate and rank leads (Rate limited: 60/min) |
| `GET` | `/api/searches/:id` | — | `SearchResponse` | Retrieve search with fresh lead statuses |
| `GET` | `/api/searches/:id/export.csv` | Query: `minScore`, `shortlistedOnly` | `text/csv` attachment | Download ranked CSV with injection guards |
| `PATCH` | `/api/companies/:id/status` | Body: `{ status: CompanyStatus }` | `{ id, status }` | Shortlist or reject a company |

---

## 8. Testing

Comprehensive unit and integration test coverage:
```bash
npm test
```

### Covered Test Suites:
- `server/src/domain/dedupe/normalize.test.ts`: Name, domain, phone normalization, and Levenshtein similarity.
- `server/src/domain/dedupe/dedupe.test.ts`: Record-linkage dedupe across all 8 specified scenarios (domain matches, phone formats, fuzzy names, city/state blocking).
- `server/src/domain/scoring/scoring.test.ts`: Worked examples A (100), B (52), and C (64); rangeScore deviations; fit bands and confidence calculations.
- `server/src/lib/csv.test.ts`: CSV RFC-4180 quoting, UTF-8 BOM, CRLF formatting, and formula injection guard (`=`, `+`, `-`, `@`).
- `server/src/__tests__/api.test.ts`: Express routes, validation rejection, 404 responses, and status mutation.

---

## 9. Deployment

BuyBox Radar is containerized into a single production Docker container serving the API and precompiled React assets:
```bash
docker build -t buybox-radar:latest .
```

Cloud deployment to **Azure App Service** and **Azure Database for PostgreSQL Flexible Server** is documented step-by-step in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## 10. Data & Ethical Sourcing

- **100% Synthetic Dataset**: All 1,296 base company records were synthetically generated using deterministic seeds (`seed: 42`).
- **No Scraping**: No real website scraping or third-party scraping APIs were used.
- **Fictional Contact Details**: Phone numbers use the reserved `555-01XX` exchange; domain names reside on the `.example` reserved top-level domain; owner names are synthetic.
- **Pluggable Architecture**: External lead sources (e.g. Google Places API) can be integrated via the `LeadProvider` interface in `server/src/providers/LeadProvider.ts`.

---

## 11. Limitations & Future Roadmap

- **Authentication**: Single-tenant demo without user accounts. Production requires JWT authentication and multi-tenant buy-box workspaces.
- **Distributed Cache**: In-process LRU cache is node-local; next phase transitions to a shared Redis instance.
- **Scoring Weights**: Currently heuristic and configurable; future iterations can learn weights automatically from searcher shortlisting behavior.
- **Live CRM Sync**: Direct webhooks and sync to HubSpot, Salesforce, and Attio.

---

## 12. AI-Assisted Development Disclosure

In accordance with ethical AI disclosure standards:
- **AI Tooling Used**: Antigravity IDE (Gemini agent) assisted in boilerplate scaffolding, generating synthetic data generation scripts, writing unit test cases, and implementing components from specification documents.
- **Human Engineering & Architecture**: Problem definition, buy-box mathematical scoring formulas, record-linkage dedupe heuristics, system tradeoffs, code review, and verification were designed and evaluated against the hiring challenge criteria.
