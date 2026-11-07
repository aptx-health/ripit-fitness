Report: complete

# 158 handback: iOS slice 2 import tests

## Verdict
24 tests across 4 suites, committed as `0f32091d` (my paths only). With the stub, all 24 fail, and every issue traces to `notImplemented`. The slice 1 suites still pass. Program tests (157) fail separately; they aren't mine.

## Verified
- **Can fail:** stub run gives 27 issues, all from `notImplemented`. Changing one expected count fails only that test.
- **Can pass:** a scratch fake passes all 24.
- **Catches bugs:** 17 single-bug variants of the fake, each run only against its targeted tests. All 17 are caught by assertions (not crashes):
  - storage: dates stored as ISO text, weight cut to an integer, unit dropped
  - idempotency: no id-conflict guard, fresh ids, re-import wipes local work
  - model: active or archived flag dropped, superset group dropped, prescribed sets dropped, plan copied into the session
  - refusal: no format check, no version check, no transaction, one generic reason
  - unknown exercises: mapped by name, marked as system

## Not verified
- Draft (in-progress) sessions and soft-deleted programs: the fixture has neither.
- `settings`, `balanceSettings` and `pinnedExercises` are ignored (no local tables). This is untested.
- No reference implementation exists, so there's no coverage report.

## How to run
- `mise run ios-check`, or `swift test --package-path ios/RipitCore --filter Import`.

## Cases
| Targets | Tests |
|---|---|
| Import contents (counts, ids, active, history, dates, weights, plan vs logged, supersets, custom/saved, unknown keys) | 12 |
| Same file twice | 3 |
| Refused file, unchanged DB, plain reason | 6 |
| Unknown exercise id | 3 |

## Assumptions and decisions beyond the handoff
- API: `AppDatabase.importExport(data:) -> ImportSummary` and `ImportError` (`.notRipitExport`, `.unsupportedVersion(Int)`, `.corrupt`, `.reason`). Stub: `Sources/RipitCore/Import.swift`. The implementer must loosen `dbQueue` from `private` in `AppDatabase.swift`.
- Re-import adds new rows and never deletes local ones.
- Fixture copied to `ios/RipitCore/Tests/Fixtures/` (outside the target, so `Package.swift` is unchanged). The source commit is noted in `ImportSupport.swift`.

## Needs a call
1. **The fixture's exercise ids aren't catalog ids.** They come from a test database, so all 5 refs are "unknown" on the phone, and 4 share names with catalog rows (`normalizedName` is UNIQUE locally). Tests assume an unknown id is **kept under its own id** as a non-system definition. Recommend: keep it (stable ids, survives re-import). The alternative is name matching.
2. **Drafts in the file:** the web sets `completedAt` on create, but local drafts keep it NULL. Should an imported draft become resumable? Recommend: yes, and null its `completedAt`.
3. **Existing active program on the phone plus an active one in the file.** Recommend: the file's wins only on a fresh install.

## Locked
- `chmod 444` on `Tests/RipitCoreTests/Import*.swift` and `Tests/Fixtures/ripit-export-v1.json`. Unlock with `chmod 644`.

## Cleanup (not removed, per no-rm)
- The scratchpad folder `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/42c9e48e-383c-40cc-8a8f-da18d573ba81/scratchpad/`, which holds `fake/` (a package copy with `.build`, about 550 MB), the break logs and the run logs.

---

Report: complete

# 158 round 2: the lead's calls applied (commit `0ff6e408`)

## Verdict
There are now 29 import tests. Against the stub, every one of the 32 issues is `notImplemented`, and the slice 1 suites pass. The tests are locked again (`chmod 444`).

## Changed
- **Exercise refs:** resolved by catalog id, then by catalog `normalizedName` (the web's `normalizeExerciseName`), then kept under their own id as a non-system row. The tests changed to match, and new tests cover name normalization and an unknown id with a unique name ("Landmine Press") staying as its own row.
- **Drafts:** a hand-made variant adds a draft session. It's resumable through `inProgressWorkout()`, with `completedAt` NULL and no history entry.
- **Active program:** if the phone already has an active program, the imported one comes in inactive. If the phone has programs but none active, the file's active program wins. The fresh-phone case is unchanged.

## Verified
- A correct scratch fake passes 29/29.
- 21 broken versions are all caught by assertions. The "mapped by name" break is now "name match skipped". New breaks: name not normalized, snapshot ids not rewritten, draft keeps `completedAt`, file's active program always wins.

## Decision beyond the calls
- Saved workout snapshots (`workoutData`) are rewritten to the resolved exercise id, so every snapshot id points at a real local row. The test is `customAndSaved`.

## Open
- A **custom** exercise whose name matches a catalog row would still clash on the UNIQUE `normalizedName`. The fixture doesn't have this case, and the calls didn't cover it.

## Cleanup (not removed)
- The same scratchpad folder as round 1, now also holding `final-run2.txt`.
