---
id: 153
state: accepted
waiting_on:
executor: coach-impl
from: lead (lead-ripit-mcp)
confirmed: 2026-11-07 Dustin (workout rows expand like programs; panel has everything, no ⋯ menu or star; Send for coaches only; New rows expand too, plus Keep/Dismiss)
updated: 2026-11-07
---
# Workout rows expand like programs; quick Send

Checkout: worktree1, branch `feature/workout-row-panel` (from `feature/coaching-send`, PR #1045, not merged yet). No preview running.

Size: small. No separate test-builder: you write the tests from the spec first, then build.

## Goal
Make `features/workout-library/row-panel.feature` true.

## Read
- `features/workout-library/row-panel.feature` (the contract)
- Program pattern to copy: `components/programs/MyProgramsList.tsx` (expandedId, panel at ~L150–300, button styling)
- Workout rows: `components/features/saved-workouts/{SavedWorkoutsList,SavedWorkoutRow,NewWorkoutRow,PinToggle,SavedWorkoutDetailDialog}.tsx`
- Send: `components/coaching/SendToTrainee.tsx` and where the program page and detail dialog use it; trainee list from `GET /api/coaching/trainees`. Fetch trainees once for the list (not per row), and not at all for users who coach no one if that can be known cheaply; no extra request per expand.

## Do
1. Write component tests for every scenario (new file under `__tests__/components/`).
2. Build. Reuse the program panel's styles; consider a shared panel/button component if it keeps both lists simple.
3. Existing tests that assert the ⋯ menu or pin star now break because the rule changed. Amend them only to reach the same actions through the panel, add a `// work 153` comment, keep every assertion's intent. List each amended test in your packet. Locked files (read-only): `chmod u+w`, edit, `chmod a-w`.
4. Phone-width screenshots (390px, light and dark): collapsed list, open workout panel (coach), open program panel with Send. Save to `initiatives/workout-library/docs/assets/153/`.

## Done when
New tests pass; full `npx vitest run` passes; `npx tsc --noEmit` clean; `npm run perf:scan -- --changed origin/dev` clean.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet to the lead with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-07 CST: created; confirmed by Dustin; dispatched to coach-impl (wE:pA). Test-builder skipped (small UI item).
- 2026-11-07 CST: back (needs decision: Keep). Lead: Keep was a spec error (no such action ever existed); dropped from the scenario, Dismiss only. origin-new-archive.feature "row menu" → "row panel". 4432 pass per packet.
- 2026-11-07 CST: lead aligned 3 step strings to the "row panel" wording; affected suites 786/786 pass, tsc clean; screenshots checked. Phone preview started (coach-153/sam-153).
- 2026-11-07 CST: Dustin: prod waits for 153/154; Send stays on community-copied programs.
- 2026-11-07 CST: Dustin: "go ahead and move forward" without his review; lead accepted on the re-run checks and screenshots.
