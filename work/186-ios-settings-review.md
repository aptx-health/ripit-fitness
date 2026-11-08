---
id: 186
state: waiting
waiting_on: 185
executor: parity-disco
skill: reviewer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (slice 7 as written; match web closely; all 13 themes; pause after)
updated: 2026-11-07
---
# iOS slice 7: Settings and look, review

## Goal
An independent verdict: does slice 7 meet `features/ios-app/settings-look.feature`, does iOS now look like the web, and is the code sound?

## Read first
- The spec, `work/184-handback.md` (hands-on list), and the diff of `ios/` since the slice 6 acceptance commit `31584e28`. Don't read `work/185-handback.md` before your first pass.

## Do
- Same method as 176 and 181: run `ios-check`, do an unaided first pass, ask up to 3 questions, then give a revised verdict.
- Walk every scenario by real taps.
- **Side by side with the local web at phone width**, in at least RIPIT dark, RIPIT light, one other theme, and E-ink:
  - Training
  - the logger
  - Library
  - Progress
  - Settings

  Judge how close iOS looks to the web, screen by screen.
- Check the largest text size on every screen.
- Screenshots go in `initiatives/ios-app/handoff/slice7-assets/`, as web/iOS pairs.

## Don't touch
- No code edits. `work/`, `STATE.md`, `status.md`, the roadmap. Staging is read only. Don't `rm`.

## Hand back
A review packet with first line `Report: …` and a clear verdict.

## Log
- 2026-11-07: created (waiting on 185).
