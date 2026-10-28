Report: complete

(Received from implementer by cross-session message, 2026-10-27; summarized by the lead.)

- training-insights: 74/74. Full suite: 1165 passed, 4 skipped. tsc, biome and eslint clean on the changed files. Break check: counting effort 8+ as 9+ failed exactly the 3 affected scenarios; then restored.
- New: `lib/insights/stall.ts` (`computeStallSignals`, also exports `INSIGHT_SESSION_STATUSES` and `round1`) and `lib/insights/effort.ts` (`computeEffortSummary`; weeks are `(start, end]`).
- `setEffort` is exported from `lib/aggregates/compute.ts`, with its param narrowed to a `Pick`; behaviour unchanged.
- `lib/mcp/tools.ts`: 2 zod schemas and handlers, one `findMany` each.
- Choices where the spec was silent:
  - stall skips sets with 0 reps (`epleyE1RM` throws), but effort keeps them;
  - the name comes from the definition;
  - `sinceDays` is counted from now;
  - the distribution buckets effort rounded to a whole number, and the percentages use the raw value.
- Not verified: performance on long histories (up to 365 days of working sets loaded), and the HTTP route.
