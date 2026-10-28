Report: complete (Part A)

(Received from test-builder, 2026-10-27; summarized by the lead.)

- 11 new plain tests in training-export.steps.ts; the file is re-locked and biome clean. agent-tools: 10 failed, 386 passed. The failures are 8 guard cases (tab, CR, whitespace before a trigger) and 2 empty-until cases (route and MCP).
- Controls that pass today: " hello" and "a =b" are not guarded; an empty since is still required.
- Pass-proof: a wrapper fake passed 78/78, and one-rule-dropped variants failed only their targets. The fake is deleted.
- Note for Part B: guarded tab/CR cells must stay RFC-quoted.

---
Report: complete (Part B)

(Received from implementer, 2026-10-27; summarized by the lead.)

- training-export 78/78. Full suite: 1254 passed, 4 skipped. tsc, biome and eslint clean.
- The guard regex is now `/^(?:[=+\-@\t\r]|\s+[=+\-@])/`; quoting still runs after the guard. `parseRange` treats an empty value as absent. The filename falls back to today.
- One line outside the named files, in `lib/mcp/tools.ts`: the cursor range check treats `until: ""` as absent, so paging with an empty until works. The lead kept it: it is needed for "behaves the same".

---
Re-review (reviewer, 2026-10-27): ship. Both fixes match the spec; the tools.ts cursor line is correct and needed. agent-tools 396/396. Optional gap: no multi-page walk with until "" (recorded, not done).
