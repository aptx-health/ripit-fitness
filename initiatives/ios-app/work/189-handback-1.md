Report: needs decision

## Verdict
Done. The contract stubs, tests and web golden for slice 8 are in place. The tests pass against a correct scratch fake and catch 46 of 47 single-rule breaks. The lead's spec correction is in: filters are single-choice. Some web behaviour looks like bugs we'd be copying (see Needs a call). Nothing is committed.

## Verified
- `mise run ios-check` → 73 issues, **all `notImplemented`**; every earlier test passes. The swift step fails, so `set -e` skips the app build. I ran xcodegen and xcodebuild on their own: exit 0.
- Golden generator run twice: byte-identical (sha `3725785a`).
- Fake swapped in: all 262 tests pass. Changed one golden value (the cgbp result name) → only that case failed. Restored it.
- Break matrix (targeted by suite, one full baseline, 47 breaks): **46 killed**.
  - search: 21 of 21 (trim, case, normalized name, alias equal vs contains, punctuation-only query, the filters, "other", built-in first, collation, limit before score, each score term, photos, mine flag)
  - validation: 10 of 10
  - duplicates: 7 of 7
  - edit: 4 of 5
  - pick list and add-several: 4 of 4
  - The survivor is `editAlwaysChecks`. It can't be seen: an unchanged name's normalized form is unique, so checking again changes nothing.
- `biome check` is clean on the generator.

## Not verified
- No Swift coverage tool was run.
- Web collation was en_US.utf8 in the test container. I didn't check prod.
- Whether the web shows a renamed custom exercise in old workouts. The tests follow the spec: it shows.
- Creating from search text, the sheets, and badges are UI only (see the hands-on list).

## Assumptions and decisions beyond the handoff
- **Lead's correction:** `ExerciseSearch.equipment` is a single `String?`. I made `muscle` single too (`selectedFAU` on the web, and the spec says "a muscle group"). I removed the golden's two-value cases.
- The API is in `Sources/RipitCore/Picker.swift`, and its header lists every rule. No migration.
- The draft holds the spec's fields only: name, equipment, primary, secondary, instructions. The web form also has aliases and category.
- `ExerciseCatalog.search` (slice 1) is untouched and differs from the web. The app picker should move to `searchExercises`.

## Needs a call
- **The name is stored untrimmed** ("  Spaced Name  "). The tests copy the web. I recommend trimming on the phone; it's a one-case golden flip.
- Other quirks, all copied (are they intended?):
  - A punctuation-only query matches everything.
  - Alias matches are exact only.
  - The 50-row limit is cut before the score sort.
  - "Other" includes resistance bands.
  - "Farmer's Walk" and "!!!" can be created.

## Where to look first
- `ios/RipitCore/Sources/RipitCore/Picker.swift:1` (rules)
- `scripts/ios/picker.goldens.ts`

## How to run
- `mise run ios-check`: 73 `notImplemented` now; all green once implemented.
- Regenerate the golden (Docker, Colima env from `docs/TESTING.md`): `npx vitest run --config scripts/ios/vitest.goldens.config.ts scripts/ios/picker.goldens.ts`

## Cases
| Targets | Cases |
|---|---|
| Search text, score, order, limit | 24 |
| Muscle / equipment / both / none | 3 / 5 / 5 / 2 |
| Create (validation, duplicates) | 28 |
| check-duplicate / edit | 10 / 9 |
| Behaviour (relaunch, everywhere, edit, import, pick) | 13 tests |

Over the ~3-per-rule cap for text and create, because each case targets a distinct rule.

## Feared bugs
- Swift's sort differs from en_US.utf8 ("Band Lat Pulldown" after "Band Lateral Raise"). Caught by `plainSort`.
- The limit applied after scoring (`limitAfterScore`).
- Alias match by contains (`aliasContains`).
- A rename not reaching the copied `exercise.name` (`editNoRenameCopies`).

## Locked
- `chmod a-w` on `PickerSearchGoldenTests`, `CustomExerciseGoldenTests`, `CustomExerciseTests`, `PickerSupport` and `Fixtures/picker/picker.json`. Unlock with `chmod u+w <file>`.

## Hands-on list (reviewer)
- **Muscle-group sheet and equipment sheet:** one choice each, with "All" to clear. The equipment sheet offers the web's 9 (incl. "Other (specialized equipment)").
- **Photos:** they show in results while filtered.
- **Multi-select:** ticking shows a selected state. The Add button shows the count and adds them in tick order.
- **Create from search text:**
  - The name is prefilled from the search.
  - Equipment and primary muscle are single-choice, as on the web; secondary is multi, excluding the primary.
  - Instructions show a 1000-character counter.
  - The duplicate warning shows even when the name equals the search text (the web skips it there).
  - Save is disabled while required fields are missing or the name is a duplicate.
- **After saving:**
  - The new exercise shows in search with a "mine" badge.
  - It can be added at once from every picker entry point: ad-hoc, program builder and editor, mid-workout.
  - The editor is offered only on custom exercises, never on built-in ones.
- **Rename:** the new name shows in the open logger, History, Progress and saved workouts.
- **Relaunch, then import a ripit export containing the same custom:** no duplicate.

## Cleanup (not deleted)
- `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/3b78e369-d8c9-4578-ab14-19da0c1828f9/scratchpad/fake/`: fake, stub backup, break logs.
