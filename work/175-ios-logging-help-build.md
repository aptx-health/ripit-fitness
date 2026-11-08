---
id: 175
state: review
waiting_on:
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (slice 5 as written, autonomous)
updated: 2026-11-07
---
# iOS slice 5: logging help, build

## Goal
Make 174's tests pass and build the screens, so every scenario in `features/ios-app/logging-help.feature` works on the phone.

## Read first
- `features/ios-app/logging-help.feature`, `work/174-handback.md` (contract and hands-on list).
- The parity screenshots `initiatives/ios-app/handoff/parity-assets/web-workout*.png` show how the web logger looks.
- Web: the oracle files listed in the spec header.

## Do
- Implement the `RipitCore` stubs, then the UI in `ios/App/`:
  - a rest timer and workout clock on the logger
  - a "Last time" line that fills the next set when tapped
  - RPE/RIR and warm-up controls per set
  - Info / Notes / History per exercise (a sheet or tabs)
  - a confirm before Finish
- The effort type (RPE or RIR) has no Settings screen yet, so default it to RPE with a small toggle in the logger; slice 7 moves it to Settings.
- Keep touch targets at 44pt or larger.
- Run it in your **own** simulator and screenshot each new screen.

## Lead decisions from 174
- RPE: whole numbers only on the phone (6–10). `rpe` stays `Int?`. The web's half-step bug is a separate item for later.
- The quirks 174 lists as copied from the web stay as they are (single set reads "× 1", mixed units, archived workouts count).
- Read the `SetDetail` rpe/rir/isWarmup fields in `AppDatabase.detail`, as 174 noted.
- The test files and `history.json` are mode 444. Don't unlock them; if a test looks wrong, raise it in your packet.

## Done when
- `mise run ios-check` exits 0, with all of 174's tests passing and none removed or weakened.
- Every scenario works when you try it by hand in your simulator.

## Decide alone
- Layout details: sheet vs tabs for Info/Notes/History, and where the timers sit.

## Escalate to Dustin when
- A scenario can't be met as written.

## Don't touch
- 174's tests (if one is wrong, say so in the packet). `work/`, `STATE.md`, `status.md`, the roadmap.
- Don't `rm`; list temp files under Cleanup for Dustin.

## Hand back
The implementer packet, with screenshots.

## Log
- 2026-11-07: created (waiting on 174).
- 2026-11-07: 174 done (178 tests, 46 notImplemented, re-run by the lead). Ready.
- 2026-11-07 18:57 MST: dispatched to ios-impl (running)
- 2026-11-07: handed back complete. Lead re-ran ios-check: exit 0, 178 pass. Committed. Goes to review 176.
