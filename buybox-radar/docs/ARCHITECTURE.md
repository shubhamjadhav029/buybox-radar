# BuyBox Radar — System Architecture

This document describes the architectural layout, request lifecycle, data model, and engineering tradeoffs of BuyBox Radar.

---

## 1. System Topology

```mermaid
graph TD
    Client["Browser (React SPA / Vite)"]
    
    subgraph Container ["Docker Container / Azure App Service"]
        Express["Express API Server"]
        LRU["In-Process LRU Cache"]
        Services["Search & Company Services"]
        Domain["Domain Engine (Scoring & Dedupe)"]
    end
    
    Database[("PostgreSQL 16 (Prisma ORM)")]
    
    Client -->|HTTP / JSON REST| Express
    Express -->|Cache check / write| LRU
    Express --> Services
    Services -->|Pure evaluation| Domain
    Services -->|Indexed queries & transactions| Database
```

---

## 2. Request Flow: Search & Fit Ranking

When a user defines a buy-box and clicks **Find & Rank Targets**:

```mermaid
sequenceDiagram
    autonumber
    actor User as Searcher
    participant SPA as React Frontend
    participant API as Express Router
    participant Cache as LRU Cache
    participant DB as PostgreSQL
    participant Scoring as Domain Scoring Engine

    User->>SPA: Selects criteria & submits form
    SPA->>SPA: Validates with BuyBoxSchema (zod)
    SPA->>API: POST /api/searches { buyBox }
    API->>API: Validates body via validateBody(BuyBoxSchema)
    API->>API: Canonicalize buy-box & compute SHA-256 hash
    API->>Cache: Check for cached SearchResponse(hash)
    
    alt Cache Hit
        Cache-->>API: Return cached response
        API-->>SPA: 200 OK (meta.cacheHit = true, <50ms)
    else Cache Miss
        API->>DB: Query candidate companies (state, industry, active status)
        DB-->>API: Returns candidate records
        API->>Scoring: scoreCompany(candidate, buyBox) & rankLeads()
        Scoring-->>API: Returns sorted & sliced ScoredLead[]
        API->>DB: Transaction: Persist Search & SearchResult rows
        API->>Cache: Save response in LRU cache
        API-->>SPA: 201 Created (meta.cacheHit = false, ~100-300ms)
    end
    
    SPA-->>User: Renders ranked table, statistics strip & explainable breakdown
```

---

## 3. Data Model & Indexing Strategy

```mermaid
erDiagram
    Company ||--o{ SearchResult : "evaluated in"
    Search ||--o{ SearchResult : "contains"

    Company {
        string id PK
        string name
        string normalizedName "indexed"
        string industry "indexed"
        string state "indexed"
        string city "indexed"
        string website
        string domain "indexed"
        string phone
        string email
        int employeeCount
        int estimatedRevenue
        int yearFounded
        string ownerName
        string status "NEW | SHORTLISTED | REJECTED"
        string[] sources
    }

    Search {
        string id PK
        jsonb buyBox
        string buyBoxHash "indexed"
        int candidateCount
        int resultCount
        int durationMs
        datetime createdAt
    }

    SearchResult {
        string id PK
        string searchId FK
        string companyId FK
        int rank
        int score
        float confidence
        jsonb breakdown
    }
```

### Composite Indexes:
- `Company(state, industry, status)`: Primary candidate retrieval query covering filters.
- `Company(normalizedName, city)`: Duplicate detection at ingest.
- `Company(domain)`: Exact domain record-linkage.
- `Search(buyBoxHash)`: Query audit lookups.
- `SearchResult(searchId, rank)`: Fast ordered retrieval for exports and historical lookups.

---

## 4. Key Architectural Decisions & Tradeoffs

| Area | Choice | Alternative Considered | Rationale & Tradeoffs |
|------|--------|------------------------|-----------------------|
| **Database** | **PostgreSQL 16 with Prisma** | MongoDB | Relational filtering across states, industries, and candidate statuses with foreign key integrity. Postgres JSONB provides schema-less flexibility for score breakdowns while maintaining SQL query speed. |
| **Scoring Execution** | **Query-time evaluation** | Precomputed scores | A company's fit is relative to an entrepreneur's bespoke thesis (buy-box). Evaluating 1,200 pure TypeScript functions takes < 10 ms, avoiding large combinatorial precalculation matrices. |
| **Caching Layer** | **In-memory LRU cache (`lru-cache`)** | Redis | Eliminates additional cloud infrastructure in a time-boxed MVP. Provides sub-millisecond cache hits for identical queries. Tradeoff: Cache is process-local and clears on container restart. Documented next step: Redis. |
| **Record Deduplication** | **Blocking by State + Union-Find Clustering** | Embeddings / LLMs | Deterministic, auditable, and extremely fast. Rules combine exact domain/phone matches, exact normalized names, and Levenshtein similarity ($> 0.92$) within city blocks. |
| **Packaging & Hosting** | **Single Multi-stage Docker Container** | Serverless / Decoupled FE/BE | Eliminates CORS issues in production, ensures unified versioning, and keeps the Node process warm for the in-memory LRU cache. Deploys cleanly to Azure App Service (Linux). |
| **Domain Logic Purity** | **Pure TypeScript domain functions** | Database-tied logic | Scoring and dedupe engines take plain objects and current timestamps as parameters, making them 100% deterministic, testable, and reusable on client or server. |
