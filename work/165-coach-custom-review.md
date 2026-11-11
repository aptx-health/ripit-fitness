---
id: 165
state: waiting
waiting_on: 164
executor: coach-review
from: lead (lead-ripit-mcp)
confirmed: 2026-11-10 Dustin (plan 163 → 164 → 165)
updated: 2026-11-10
---
# Review: coach sends carry their custom exercises

Independent review of `git diff origin/dev...feature/coach-bundle-custom` against `features/coaching/custom-exercises.feature` and `work/164-coach-custom-build.md`. Read the code first, not the packet. Focus: trainee can only pick exercises they can see; copies owned by the trainee; transaction safety; snapshot immutability; earlier-copy reuse can't be spoofed by another user's exercise; name collision handling; the review screen at 390px.

## Hand back
Verdict, findings ranked, Not verified. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-10 CST: created; waits on 164.
