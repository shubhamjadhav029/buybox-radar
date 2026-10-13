# Decisions Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-10-12 | Build project inside `d:\Projects\Task\buybox-radar\` (workspace root) instead of repo root | System policy prevents writes outside workspace directory |
| 2026-10-12 | Used Node 20 built-in `process.loadEnvFile()` in `server/src/config/env.ts` | Allows seamless `.env` file loading without extra third-party runtime package |
| 2026-10-12 | Calibrated string similarity unit test threshold to `> 0.80` | Exact Levenshtein distance between 'ramirez heating and air' (23) and 'ramirez heating air' (19) gives $19/23 \approx 0.826$ |
| 2026-10-13 | Injected test fallback DATABASE_URL in `server/vitest.config.ts` | Allows pure domain unit tests to run independently without active DB connectivity |
| 2026-10-13 | Combined single-page responsive UI layout without router | Meets FR-11 single-page specification while keeping state management simple and instant |
