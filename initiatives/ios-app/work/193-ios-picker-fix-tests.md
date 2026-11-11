---
id: 193
state: done
executor: ios-tests
skill: handoff-test-builder
waiting_on:
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-08 Dustin ("Go for it" on slice 8; same autonomy)
updated: 2026-11-10
---
# iOS slice 8: tests for the review fixes

## Goal
Update 189's tests for two changes that came out of review 191, before ios-impl fixes them.

## Changes
1. **Instructions limit is 4000, not 1000.** The web changed `MAX_INSTRUCTIONS_LENGTH` to 4000 on 2026-11-09 (`lib/validators/exercise-definition.ts`, now merged into this branch). Regenerate the picker golden from the web code, and update any test or header text that says 1000.
2. **Imported exercises the phone's catalog doesn't know are built-in, not mine.** When an import refers to an exercise that isn't in the phone's catalog and isn't one of the export's own custom exercises (a web built-in added after the phone's catalog was made), it's stored as built-in: no MINE flag, and the editor refuses it like any built-in. The export's own custom exercises stay mine. Add tests for both cases. Fixture: `ripit-export-v1.json` refers to "Barbell Bent-Over Row", which the phone doesn't have.

## Read first
- `initiatives/ios-app/work/191-handback.md` (Needs a call), `189-handback-2.md`
- `ios/RipitCore/Sources/RipitCore/Import.swift` (`resolveRef`), `Picker.swift` header

## Done when
- Only the new or changed cases fail (notImplemented or the old behaviour); everything else passes.
- A break for each change is caught against your scratch fake.
- The changed files are locked again.

## Don't touch
`initiatives/ios-app/work/`, `STATE.md`, `status.md`, the roadmap, app code. Don't `rm`; list temp files.
- 2026-11-10 19:25 MST: dispatched to ios-tests (running; context 13%, kept)
