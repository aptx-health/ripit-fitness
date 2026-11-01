Report: complete. Relayed by SendMessage 2026-10-31; saved by the lead (condensed).

**Verdict:** ship with notes. Fix #1 before the PR.

**Checks:** the TL1 tests (101) pass, tsc is clean, and biome shows 2 existing warnings.

**First pass, written before reading the handback**
- Page glue, authz, the `?resume=` gating, links and the active-program paths are all OK.
- No path shows another user's data.

**Findings**
1. **Medium.** `StrengthActivationModal.tsx:48`: skip now only closes the modal.
   - The builder (`useProgramActions.ts:166`, `ProgramBuilder.tsx:252`) and `ConsolidatedProgramsView` share this modal.
   - Skipping after you finish building a program leaves you on the builder. It used to go to `/programs?tab=strength`.
   - This path is untested.
2. **Low.** `lib/db/program-week.ts:51`: a program with zero weeks returns null, so it gets a 404.
   - An active empty program sends `/training` to a 404. It used to show `NoActiveProgram`.
3. **Low, outside the item.** Read-only is enforced only in the UI.
   - The skip, draft, sets and complete-week APIs don't check that the program is active.
   - This exposure isn't new.
4. **Low.** The history link has no `?week`, so it opens the current week, not the session's week.
5. **Nit.** The detail page has a leftover `revalidate = 30`.

**Test quality:** good. The untested parts are the page glue, the redirects and the builder skip path.
