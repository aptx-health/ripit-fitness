---
id: 204
state: waiting
executor: ios-impl
skill: handoff-implementer
waiting_on:
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-10 Dustin (slice 9 go; answers on 196: supersets in order + badge, the web's keypads, reorder today only + light haptic; install after independent review)
updated: 2026-11-11
---
# iOS slice 9b: one-exercise logger, build

## Goal
Make 203's tests pass and build `features/ios-app/one-exercise-logger.feature`.

## Read first
The spec, `initiatives/ios-app/work/203-handback.md` (the contract, the hands-on list and the risk notes), and `initiatives/ios-app/logger-nav-discovery.md` §1–2 and §7. Web shots: `initiatives/ios-app/handoff/slice9-assets/web-free-*`, `web-prog-*` and `web-plan-*`.

## Do
- **The logger:**
  - one exercise per screen, with a header
  - the ‹ Log set › bar, attached with `bottomBar` inside the full-screen cover
  - swipe between exercises
  - the web's keypads
  - the Plan sheet
  - a light haptic on Log set
- **Keep every slice 5–8 feature working inside it:**
  - warm-ups, effort and Last time
  - Info / Notes / History
  - the rest stopwatch
  - the summary
  - the picker, including multi-pick and Create
- **The largest text size must stay usable.**

## Done when
- `mise run ios-check` exit 0, with 203's tests unchanged.
- Every hands-on item is seen by real taps on `ripit-impl` (reuse it), at default size and at AX5, in dark and light.

## Don't touch
Tests, `initiatives/ios-app/work/`, `STATE.md`, `status.md`, the roadmap. Don't `rm`.
