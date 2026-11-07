---
id: 165
state: running
executor: programs-review
skill: reviewer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal; lead runs the loops)
updated: 2026-11-07
waiting_on:
---
# iOS slice 3 review: programs

## Goal
An independent verdict on slice 3 (commits 62d69024..590d0570, merged into `feature/ios-skeleton`): does it meet `features/ios-app/programs.feature`, and does it work for a real lifter following a program?

## Where
Use `~/projects/worktrees/ripit-fitness/worktree5` (branch `feature/ios-programs` at 590d0570); ios-impl is editing the lead worktree. Item files are in the lead worktree `/Users/dustin/.herdr/worktrees/ripit-fitness/worktree-brave-field-c150`.

## Read first
`features/ios-app/programs.feature`, `work/157-ios-programs-tests.md` and `work/161-ios-programs-build.md` with their Logs (the lead's calls). Don't read `work/161-handback.md` before your first pass.

## Do
Follow the operating agreement's Review section (`~/.claude/skills/project-structure-v3/references/operating-agreement.md`). `mise run ios-check` must pass.
Hands-on in your own simulator (if you can't tap, install a tap tool such as `idb` or drive it with XCUITest; don't just use launch hooks):
- Build a 2-week, 3-day program by hand in the builder, with free-text weights and a superset.
- Activate it, follow Up Next through week 1, check that week 2 becomes current, finish everything, and restart.
- Edit prescribed sets after logging, rename an exercise, and archive the active program.
- Import the fixture (`ios/RipitCore/Tests/Fixtures/ripit-export-v1.json`) and check that the imported active program behaves the same way.
Compare with the web at phone width: local web app `/training`, `/programs/[id]`, `/programs/[id]/edit` (`DOPPLER_PROJECT=fitcsv DOPPLER_CONFIG=dev_personal ./scripts/dev.sh start -l postgres,app` from worktree3 or worktree5; dmays@test.com / password). This worktree's slot collides with worktree1.
Also judge the untested editor calls in `ProgramsEditing.swift`.

## Hand back
A review packet with first line `Report: ...` and a verdict, sent to wX:p1. Report only. Screenshots in your scratchpad, with full paths. Don't run rm.

## Log
- 2026-11-07 CST: created (fresh reviewer; ios-review is on 155/163).
- 2026-11-07 12:36 MST: dispatched to programs-review (running)
- 2026-11-07 CST: verdict checks out with 3 should-fixes; all 10 scenarios driven by taps, including the imported program. Lead answers: per-week editing for now; one workout in progress on the phone (deliberate). Fixes in 170.
