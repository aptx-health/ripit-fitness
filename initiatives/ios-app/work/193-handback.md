Report: complete

## Verdict
Done. The tests now cover both review-191 fixes. Against the current implementation, only the new or changed cases fail: 14 issues in 6 tests, all from the old 1000 limit or the old "unknown ref is mine" behaviour. Everything else passes. Nothing is committed.

## Changes
1. **Instructions limit is 4000.**
   - The picker golden was regenerated from the web code (`MAX_INSTRUCTIONS_LENGTH = 4000`).
   - The 1000 and 1001 create cases are now 4000 (ok) and 4001 (invalid), and "everything at once" uses 4001.
   - New case: "ok: instructions of 1001 (over the old limit of 1000)". Creates go from 32 to 33.
   - Text updated in the `CustomExerciseGoldenTests` header and count, and in one header line of `Picker.swift`, `:29`, a comment only.
2. **An imported ref the phone's catalog doesn't know is built-in.**
   - New test in `CustomExerciseTests`, `importedUnknownIsBuiltIn`, using the fixture's "Barbell Bent-Over Row". It checks:
     - it is found by search with no MINE flag, and is not in `customIds()`
     - `customExercise(id)` is nil, and `updateCustomExercise` throws `.builtIn` and changes nothing
     - the export's own "Sled Push" stays mine and editable
     - a re-import changes neither
   - `ImportExerciseTests` had the old rule (unknown ref = non-system). I changed it:
     - the header rule
     - the Bent-Over Row and "Landmine Press" rows are now `isSystem == true`
     - the only non-system row is Sled Push
     - `systemExerciseIds().count` after an import is now `catalogSize + 1`

## Verified
- Real implementation, `swift test`: 263 tests, 14 issues, all in the changed or new cases:
  - 4 import-exercise checks
  - the create golden at "ok: instructions of 4000"
  - 7 checks in the new import test

  The create test stops at its first throw, so its later cases (4001, everything at once) have only run against the fake.
- Golden generated twice: byte-identical (sha `c6b3e27d`). `biome check` is clean.
- Scratch fake: the real `Picker.swift` and `Import.swift` with both fixes, swapped in temporarily, then restored byte for byte. All 263 tests pass.
- Break matrix, targeted, with one full baseline: **5 of 5 killed**:
  - limit still 1000
  - limit 4001
  - message still says 1000
  - unknown ref left non-system
  - the export's customs stored as built-in

## Decisions beyond the handoff
- "Stored as built-in" is tested as `isSystem = 1`, so `systemExerciseIds()` now counts the catalog plus such refs. If ios-impl would rather mark these refs some other way, the `catalogSize + 1` lines are where to change it.

## Outside the item (not fixed)
- `ios/App/CustomExerciseEditor.swift:96-98` still shows a `/1000` counter and turns red over 1000. That is app code, so ios-impl should move it to 4000.
- The `resolveRef` comment in `Import.swift` ("Not in the catalog: keep it under its own id") will need the built-in wording when ios-impl fixes it.

## Locked
- `chmod a-w` on `picker.json`, `CustomExerciseGoldenTests.swift`, `CustomExerciseTests.swift` and `ImportExerciseTests.swift`. Unlock with `chmod u+w <file>`.

## Cleanup (not deleted)
- `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/3b78e369-d8c9-4578-ab14-19da0c1828f9/scratchpad/f193/`: backups of the real sources, logs, `breaks.tsv`, `matrix.out`.
- Break logs from this run are also in `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/3b78e369-d8c9-4578-ab14-19da0c1828f9/scratchpad/fake/logs/` (from the reused runner).
