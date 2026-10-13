# Video Walkthrough Script: BuyBox Radar

Target length: 110–120 seconds (~280 words).
Format: Screen capture + voiceover.

---

### Script Breakdown

| Timestamp | Visual Cue | Spoken Script |
|-----------|------------|---------------|
| **0:00 – 0:15** | Title slide / app header | *"I studied SaaSquatch — a $20-per-month lead-gen tool for acquisition entrepreneurs. It’s great at discovering companies, but searchers still end up with massive, undifferentiated lists and no clear priority. I built BuyBox Radar to solve prioritisation."* |
| **0:15 – 0:30** | Click preset chip ("HVAC · Texas"), form updates | *"A searcher starts with an acquisition thesis — for example, HVAC companies in Texas with 10 to 50 employees and $1 to $8 million in revenue. That's the buy-box."* |
| **0:30 – 1:05** | Ranked table loads; expand top row showing 6 breakdown bars | *"Every company gets a 0 to 100 thesis-fit score — and we show exactly why: industry match, geography, team size, revenue, business tenure as a succession signal, and owner reachability. Ingested records from multiple directories are deduplicated with union-find record linkage first, so the list is clean."* |
| **1:05 – 1:25** | Filter by min score, star a lead, reject one, click Export CSV | *"Searchers can filter by score threshold or owner contact, shortlist high-conviction targets with a star, and permanently reject bad fits. Then, one click exports the ranked shortlist straight into their CRM or spreadsheet."* |
| **1:25 – 1:45** | Architecture diagram or README overview | *"The architecture uses a React and TypeScript frontend, Express REST API, PostgreSQL with Prisma ORM, and an in-process LRU cache so repeat searches return in milliseconds. The entire app ships in a single production Docker container on Azure App Service. Scoring and dedupe are pure, thoroughly tested domain functions."* |
| **1:45 – 2:00** | Table view with "Cached" latency badge | *"The dataset is completely synthetic and deterministic — eliminating web-scraping risks while demonstrating real-world ranking fidelity behind an extensible provider interface. Thanks for watching!"* |
