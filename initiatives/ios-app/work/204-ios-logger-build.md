---
id: 204
state: ready
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
The spec, `initiatives/ios-app/work/203-handback-1.md` and `-2.md` (the contract, the hands-on list, the risk notes and Dustin's calls; one test fails today for a real bug, program add order, which you must fix), and `initiatives/ios-app/logger-nav-discovery.md` §1–2 and §7. Web shots: `initiatives/ios-app/handoff/slice9-assets/web-free-*`, `web-prog-*` and `web-plan-*`.

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

## Also in this item (Dustin, 2026-11-11)
- **Bottom bar, option B "Lit block":** the active tab gets a dark amber block (`accent-muted`) with a 3 px gold (`accent`) top edge, and the other tabs dim to about 60%. A marker slides between tabs (about 0.22 s). The page nudges in about 14 pt from the side you moved toward, with a fade of about 0.2 s. Each tab change gives a light selection haptic. With Reduce Motion or E-ink on, there is no slide or nudge. Mock-up: https://claude.ai/artifact/6QWYWeY2PkUbJFkJPGmrSF (option B, "Sliding marker + content nudge"). Make it work in every theme through the tokens.
- **Superset button:** it moves into the Plan list (see 203's follow-up).
