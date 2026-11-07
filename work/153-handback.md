Report: complete

## Amendment (2026-11-07, commit `86be3729`)
Dustin's decision: logged weight works like the web app, a `Double` plus `weightUnit` (default "lbs"). The free-text weight tests are replaced by 4 tests (62.5 kg x 5, the lbs default, fractional and zero values, and a REAL `weight` column with a `weightUnit` column). There are now 32 tests. They are red on the stub, all 32 pass on the fake, and 24 out of 24 breaks are caught, with no crashes. The "Needs a call" item and the free-text rows below no longer apply.

## Verdict
Checks out. 30 Swift Testing tests cover every logic scenario. They all fail on the stub API, pass against a correct scratch fake, and catch 22 out of 22 deliberately broken fakes. Commit `e039c913` on `feature/ios-skeleton`.

## Verified
- `mise run ios-check` → `30 tests in 5 suites failed ... 39 issues`. Every issue is `notImplemented`, except one `!migrationIdentifiers.isEmpty`, which also comes from the stub.
- Scratch fake (GRDB, in the scratchpad, not the repo) → `30 tests passed`.
- Changing one expected value (`setCount == 3`) → only that test fails, at that line. Restored afterwards.
- Break matrix, one `BREAK=` env flag per broken behaviour: 22 out of 22 caught. Each one fails its targeted test.
- Step 7 found a harness bug: `TempDB().open()` deleted the folder while the database was still open. Fixed in `Support.swift`.

## Not verified
- UI only, needs a manual check in 154: the empty-history text, the start/finish photos actually showing, the placeholder view, and the discard confirmation.
- Whether the image files exist. The tests only check image names (2 per matched exercise, 0 for the 15 unmatched).
- Search ranking, and what an empty query returns (the spec doesn't say).
- Starting a second workout while one is unfinished. Discarding a finished workout.
- No coverage tool run, because there is no reference implementation.

## Assumptions and decisions beyond the handoff
- API: `AppDatabase.open(path:upTo:extraMigrations:)`. `ExtraMigration` lets tests add migrations to prove they run in order and only once.
- Table names are fixed in the tests (`MigrationTests.swift:16`): the 9 core tables, camelCase like Prisma.
- Search: punctuation is dropped, not turned into a space. So "lockoff" matches "Lock-Off". Expected sets were recorded from the seed with that rule.
- History is newest first and lists finished workouts only.
- GRDB `from: 7.12.0`. `Package.resolved` is committed.

## Needs a call
- Logged weight: Prisma `LoggedSet.weight` is `Float` plus `weightUnit`, but the spec says free text. The tests store a text column. Slice 2's import will need to turn number + unit into text. I recommend keeping text.

## Where to look first
- `ios/RipitCore/Sources/RipitCore/API.swift:134`: the contract 154 implements.
- `Tests/RipitCoreTests/CatalogTests.swift:66`: the expected "bench" result set.
- `Tests/RipitCoreTests/AdHocLoggingTests.swift:82`: reads `loggedSet.weight` with raw SQL.

## How to run
- `mise run ios-check` → it prints each test as `✔` or `✘`. A pass is `✔ Test run with 30 tests ... passed`.

## Cases
| Targets | Cases | Why |
|---|---|---|
| Fresh install | 3 | version, tables, empty history |
| Migrations order/once/rows kept | 3 | the older-DB scenario |
| Catalog 312 + images | 4 | oracle is the seed + mapping JSON |
| Search name/alias/case/punct | 6 (+5 args) | alias-only and punctuation-only hits |
| Ad-hoc log, date, history order | 4 | local-day bug |
| Free-text weight | 2 (+6 args) | numeric coercion |
| Resume / discard | 5 | reopen, orphans, history unchanged |
| Supersets | 3 | kept after finish, distinct groups, order |

Total: 30. Cap: about 3 per rule. Over the cap: slightly for search. Each extra case hits a different bug.

## Feared bugs
- Migrations rerun or out of order, data dropped: caught by migrations-rerun, migrations-order, drop-data.
- Catalog seeded again on every open: catalog-dupe.
- Weight parsed as a number, or lowercased: weight-numeric, weight-lower.
- UTC date truncation: date-utc-day.
- Drafts showing in history, or wrong order: history-drafts, history-oldest.
- In-progress workout not saved to disk: resume-none.
- Discard leaving orphan rows, or wiping history: discard-orphans, discard-all.
- Superset group lost, or all supersets sharing one group: superset-lost, superset-onegroup.
- Exercise order lost: order-lost.
- Search case, punctuation, alias, duplicates: search-*.

## Coverage of the reference
- No reference implementation, so none. The fake's branches are all hit by the matrix.

## Quirks for a human to mark
- 88 mapping matches are "close", some with low confidence (for example Scorpion Stretch maps to Shoulder Stretch's photos). The tests treat every match as "has an image". Intended or accidental?
- The seed has both "Bench Press" and "Barbell Bench Press". Both show up for "bench".

## Locked
- The test files are `chmod a-w` (local only, since git doesn't keep this). Unlock with `chmod u+w ios/RipitCore/Tests/RipitCoreTests/*.swift`.
- No simulator was used, because everything ran headless.
