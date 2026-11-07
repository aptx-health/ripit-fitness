---
id: 151
state: accepted
waiting_on:
executor: coach-review
from: lead (lead-ripit-mcp)
confirmed: 2026-11-07 Dustin (slice 2 spec)
updated: 2026-11-07
---
# Coaching slice 2: review

Checkout: worktree1, branch `feature/coaching-send`, uncommitted; stacked on `feature/workout-library-origin` (#1043), so diff against `origin/feature/workout-library-origin` plus untracked files. Read-only except your report and screenshots.

## First pass: before reading any handback
Read only `features/coaching/send.feature`, `initiatives/coaching/docs/136-discovery.md` and the code. Focus on:
- Security and privacy: only a coach on an active link sends; only their own sources; the trainee's data never reaches the coach (listSent, routes, Library New row); a coach send never notifies Discord/Bark; the proposal service's new sender input can't be abused by the MCP/agent path (e.g. an agent setting coachLinkId).
- Converters: round trip of programs (weeks, warmups, RPE/RIR, supersets, notes) and saved workouts; behaviour on CSV-imported programs with odd superset labels.
- The coach-name lookup fallback in `app/api/workouts/saved/route.ts`: does a swallowed error hide a real prod failure; is the raw BetterAuth query safe and scoped.
- Accept gives origin 'coach' without hard-coding; decline adds nothing; ended link rules.
- Confirm the Library program page really renders the Send button (the test only greps the file).
- UI at 390px in light, dark, E-INK: Send button/picker/sheet/refusal, Sam's Training and review, the Sent list. Preview data: coach-preview@test.com / sam-preview@test.com / alex-preview@test.com, password1, in the wt1 DB (`DOPPLER_PROJECT=fitcsv ./scripts/dev.sh start -l postgres,app` or a production build).
- `perf-check`: perf:scan and perf:tap for the Send tap and Settings → Coaching.

## Second pass
Then read `work/148-handback.md` and `work/150-handback.md` (in worktree2's `work/` if missing here) and check their claims and "Not verified".

## Hand back
Findings ranked by severity with file:line and a failure scenario; verdict (ship / fix first); screenshots in `initiatives/coaching/docs/assets/151/`. First line `Report: complete | needs decision | further handoff`. Don't edit code, `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-07 CST: created; dispatched to coach-review (wE:pB), worktree1.
- 2026-11-07 CST: back: ship; fixes 152 for findings 1–4.
- 2026-11-07 CST: Dustin approved slice 2 on the preview ("everything works really well"). Accepted.
