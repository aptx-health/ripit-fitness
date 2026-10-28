Report: complete

(Received from implementer by cross-session message, 2026-10-27; summarized by the lead.)

- training-export and training-insights: 150/150. Full suite: 1241 passed, 4 skipped. tsc, biome and eslint clean. Break check: with the formula guard off, exactly the guard scenario failed; the guard was then restored.
- Insight rules: `STALL_SESSION_STATUSES` (completed) and `EFFORT_SESSION_STATUSES` (completed and abandoned); effort counts every non-warmup set.
- New `lib/insights/export.ts`: columns, `parseRange`, a single-query `fetchExportRows` (stable order plus an id tiebreak), base64url cursors, and `toCsv` (RFC 4180 with CRLF; formula guard on string cells only).
- MCP `export_training_data` fetches limit+1 rows. The cursor holds the offset plus the resolved range, and a mismatched range is refused.
- Route `app/api/agent/export.csv/route.ts`, in this order:
  1. bearer token (header only);
  2. rate limit;
  3. range check, giving 400 `{ error, field }`.
  - Responds with an attachment and `no-store`.
  - 3 queries per request.
  - 500 with no stack.
- Choices made: offset paging within a fixed range; the CSV is built in memory with no streaming.
- Not verified: a real Next server, the rate limit, very large ranges.
