---
id: 182
state: review
waiting_on:
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (slice 6 autonomy covers review fixes)
updated: 2026-11-07
---
# iOS slice 6: fixes after review 181

## Goal
Close review 181's findings so slice 6 can be accepted.

## Read first
- `work/181-handback.md`: the review, with file pointers and screenshots.

## Do
1. **Blank rename:** disable Rename while the trimmed name is empty, as Save already does. Show a plain-English message for any `SavedWorkoutError` instead of the raw case name (for example "Give the workout a name.").
2. **Show the workout's name while it's open:** a workout started from a saved one (or repeated) shows its name in the logger title, Training's in-progress card and the Resume/Discard prompt. Add `name` to `WorkoutDetail` / the in-progress read; the column is already filled. A plain ad-hoc workout keeps today's wording. Add a test for the new field.
3. **Delete confirm:** anchor it to the row being deleted, not the whole Library view.
4. **Largest text size:** give the pin and ··· on Library rows some space, so they don't touch.

## Done when
- `mise run ios-check` exits 0. 179's locked tests are unchanged.
- Each fix is checked in your simulator, with screenshots, including the largest text size for 2–4.

## Not in this item (backlog)
- Relative dates ("Today") on Library rows. The empty Pinned block (iOS hides it; keep that).

## Don't touch
- `work/`, `STATE.md`, `status.md`, the roadmap. Don't `rm`.

## Hand back
The implementer packet.

## Log
- 2026-11-07: created from review 181 (lead: name-while-open now, as reviewer and builder both suggested).
- 2026-11-07 21:48 MST: dispatched to ios-impl (running; context 27%, kept)
- 2026-11-07: handed back complete; lead re-ran ios-check (exit 0, 208 pass); committed. Re-check in 183.
