# Training + Library redesign: status

- 2026-10-31 MDT: Started. Request: restructure the app around Training (home) and Library (workouts + programs), from a design agent handoff (docs/design-handoff.md). Size: standard. Lead: lead-ripit-mcp. Dustin answered the open questions (docs/decisions.md): Browse Workouts and Create New Workout deferred; Suggestions for all users (not exercise library), no user undo; Repeat = freeform copy; pin My Workouts only; PR per item, prod once TL1–TL3 are in; phone preview per UI item instead of sign-off forms. Roadmap items TL1–TL5 in ROADMAP.md. Next: discovery 034 over the whole redesign.
- 2026-10-31 MDT: 034 discovery dispatched to implementer (wF:p2).
- 2026-10-31 MDT: 034 discovery accepted. Dustin: non-active programs view-only; TL5 adds a user token screen; suggestions may exceed the 3-program cap. Lead: /library URLs, skipped = done, Repeat without weight. Next: TL1 spec + tests (035).
- 2026-10-31 MDT: TL1 spec (docs/spec.md) and features/training-library/program-detail.feature written. 035 tests dispatched to test-builder (wF:p1).
- 2026-10-31 MDT: 035 accepted (101 tests, 47/47 breaks killed). 036 build dispatched to implementer (wF:p2). Lead: out-of-range week shows current week; declining activation stays on page.
- 2026-10-31 MDT: 036 build back: full suite 1725 passed (lead re-run), tsc clean. 037 review dispatched to reviewer (wF:p3). Starting phone preview for Dustin in parallel.
- 2026-10-31 MDT: 037 review: ship with notes. Fixes #1/#2/#4/#5 sent back to implementer (036 retry); server-side read-only enforcement added to the roadmap (Later).
- 2026-10-31 MDT: 036 retry in (fixes 1/2/4/5). Fix 4 contradicts 2 locked assertions; test updates + new tests for empty program and builder skip sent to test-builder (wF:p1).
- 2026-10-31 MDT: TL1 green after fixes (lead re-run 1733 passed, tsc clean). Preview rebuilt. Waiting on Dustin's phone check before the PR into dev.
- 2026-10-31 MDT: Dustin chose stacked PRs against dev. TL1 committed and opened as the bottom PR; TL2 branches from it.
