Report: complete

(Received from test-builder by cross-session message, 2026-10-27; summarized by the lead.)

- New `training-export.steps.ts`: 41 of 65 failing, all because the tool or route is missing. Changed `training-insights.steps.ts`: 3 of 85 failing, exactly the old-rule cases (abandoned counted for stall in 2 scenarios; bodyweight not counted for effort). Both files read-only and biome clean.
- Export coverage:
  - All 8 scenarios.
  - 2,500-set paging with mid-session boundaries and an independent sort as the oracle.
  - Arg errors; date-only and ISO ranges; `until` exclusive and defaulting to now.
  - 401 variants (none, revoked, unknown, empty Bearer, Basic, `?token=`), with auth checked before validation.
  - 1096-day cap; formula guard and RFC quoting; a negative number is never guarded.
- Pass-proof: a scratch fake passed 150/150, and all 50 broken variants were caught. The fake was deleted.
- Assumptions: a final full page has a null `nextCursor`; date-only means UTC midnight; MCP rows aren't guarded; the filename uses the date strings as given; rate limiting is bypassed in tests; the route is tested via its exported `GET` with the db mocked to the test client.
- Not verified: a real Next server, large-range performance.
