# 130 handback (reviewer, 2026-11-03)
Report: complete. `.claude/skills/perf-check/` (SKILL.md; scripts static-scan.mjs, tap-test.mjs, serve-build.sh; allowlist.json), `lib/test/query-count.ts` (countQueries), `lib/test/database.ts` (query events), example test in `__tests__/api/progress-week.test.ts` (11 queries for 1 and 10 workouts), npm scripts `perf:scan`, `perf:tap` (Playwright pinned via npx 1.63.0).
Proof on PR #1035's tree, phone-throttled (150 ms RTT, 1.5 Mbps, CPU 4×), median of 3: without loading.tsx feedback 212 ms → FAIL; with it 44 ms → PASS (content 426/539 ms, chain 3). Static scan flags the missing loading.tsx and nothing with it.
Today on dev: no-loading 36 pages (only library and training have loading.tsx), sequential-awaits 8 (1 deliberate PgBouncer batch), await-in-loop 11 (4 retry loops to allowlist), mount-fetch 14 (report only).
Checks: suite 3726 pass; tsc/eslint/Biome clean. Data: scratch DB clone dropped; wt1 DB untouched and stopped.
Outside: Playwright not a devDependency; dev_personal lacks BETTER_AUTH_SECRET under next start (serve-build sets a throwaway); wt1 DB behind dev's migrations (db-pushed).
Lead (2026-11-03): re-ran perf:scan (same counts). Applied the brief lines as one AGENTS.md Testing bullet (reviewers and implementers both read AGENTS.md). Roadmap: loading.tsx for the main tabs; allowlist the deliberate cases.
