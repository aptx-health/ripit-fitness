Report: complete

## Verdict
Checks out. 193's tests pass, none changed. All four fixes were seen by real taps on `ripit-impl`, at default and at the largest text size. Nothing is committed.

## Verified
- Red first: before the fix, only 193's new or changed cases failed (6 tests).
- `mise run ios-check` exit 0: 263 tests pass, the app builds with no warnings. `git diff -- ios/RipitCore/Tests` is empty.
- Real taps: a scratch XCUITest walk (`Walk194Tests`, no repo edits). 4 tests, 0 failures. For each fix:
  1. The counter reads `0/4000`.
  2. After importing `ripit-export-v1.json`, "Barbell Bent-Over Row" has no MINE badge and no Edit button, at default and largest text. The export's own "Sled Push" stays MINE and editable.
  3. A new editor opens with no errors. Opening Equipment and cancelling shows only the equipment error. Tapping Save on the invalid form shows every error and saves nothing.
  4. Typing "barbell bench press" shows the warning under the Name field. It sits below the nav bar and above the keyboard, at both sizes.

## Not verified
- E-ink and other themes. Only the RIPIT dark theme was walked.

## Files changed
- `ios/RipitCore/Sources/RipitCore/Picker.swift`: `CustomExerciseDraft.maxInstructions = 4000`, used by `problems()`.
- `ios/RipitCore/Sources/RipitCore/Import.swift`: `resolveRef` stores an unknown ref with `isSystem = 1`. The header and comment now say built-in.
- `ios/App/CustomExerciseEditor.swift`:
  - errors gated by touched fields or Save tapped
  - Save always tappable; on an invalid form it shows the errors
  - duplicate warning moved under Name, and scrolled into view when it appears
  - counter uses `maxInstructions`, written as plain digits

## Decisions beyond the handoff
- Save stays tappable rather than disabled, so a tap always gives a visible reason. A field counts as touched when it's typed in, or when its chooser sheet is opened.
- At the largest text size the warning is taller than the gap above the keyboard, so it scrolls into view when it appears (`xxxl-04-duplicate-typing.png`).

## Open questions and risks (outside the item, not fixed)
- `AppDatabase.seedCatalog` decides whether to seed by counting `isSystem = 1` rows. Imported unknown refs now add to that count. A future catalog with new rows could skip seeding if imports have padded the count, though `INSERT OR IGNORE` keeps it safe. A fix that counts only rows with `importHash IS NULL` broke `MigrationTests`: the column doesn't exist before v4. So I reverted it. It's worth a small item.

## Where to look first
- `ios/App/CustomExerciseEditor.swift`, `shown(_:)` and `save()`.
- `ios/RipitCore/Sources/RipitCore/Import.swift`, `resolveRef`.

## Screenshots
In `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/592d312a-0b72-4e76-ab6b-97230d1cef66/scratchpad/shots194/`:
- `default-01`…`04` and `xxxl-01`…`04`: open, touched, Save tapped, duplicate
- `import-01`…`03`

## Cleanup (not deleted)
- Scratchpad `ui/UITests/Walk194Tests.swift`, `f194/` (fixture copy), `shots194/`.
- Simulator `ripit-impl` (kept).
