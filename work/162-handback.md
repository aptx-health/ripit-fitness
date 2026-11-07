Report: needs decision

# 162 handback: iOS slice 2 import review

**Verdict (provisional, pending 3 questions):** `4d3a414c` meets the four phone scenarios in `features/ios-app/import.feature`, and it is safe for a first import. It runs in one transaction, refused files change nothing, a repeat import adds nothing, and a kill mid-import leaves nothing behind. One real-data risk remains: importing a *later* export doesn't update rows that changed on the web, but it does add their new child rows (finding 1). Decide that before Dustin imports more than once.

Worked in `~/projects/worktrees/ripit-fitness/worktree6` (detached at `4d3a414c`). Fresh simulator `ripit-162-review` (D43E5170-51DB-4D32-A864-483EC7F914D6, iPhone 16, iOS 18.6). I didn't read `work/160-handback.md`.

## Check
`swift test --package-path ios/RipitCore --skip Program`: 60 tests in 10 suites passed. The simulator build of the app passed (xcodegen + xcodebuild, exit 0).

## Hands-on (files dropped into the app's Documents, imported via the `-demoImport` debug hook)
| Test | Result |
|---|---|
| Fixture, fresh install | Pass. 2 programs ("Strength Block" active), 3 sessions, 12 logged sets, 1 saved workout, Sled Push custom. History: "Saturday Garage 2 exercises · 4 sets", "Squat + Press 3 exercises · 7 sets", matching the fixture. Weights kept, e.g. `80.0 kg ×1`, `135.0 lbs ×5`. |
| Fixture again | Pass. Row counts identical (2/3/12/1/2/11). |
| Not JSON, other format, v2, truncated JSON, wrong type (`weight: "heavy"`), dangling `exerciseId` | Pass. Each gives a plain alert and no rows. v2 says "newer Ripit export (version 2)". |
| Exercise not in catalog | Pass. "Barbell Bent-Over Row" (fixture ref, no catalog match) kept as its own non-system row, with its sets. Refs with test-db ids resolved to catalog rows by name (e.g. Pull-Up → `cmiz7vkvr0008vr0m7rv3dapc`). The saved-workout snapshot was rewritten to the catalog id. |
| 300 workouts / 4,962 sets | Launch to all rows written: **1.3 s** (Mac simulator). Re-import changed nothing. History query for 302 rows: 6 ms. 2.0 MB database. |
| 3,000 workouts / 49,500 sets | Launch to done: **12.2 s**, with the "Importing…" overlay. |
| Kill mid-import | App killed at 0.6, 1.0 and 1.5 s into the 12 s import: 0 sessions, 0 sets, `integrity_check ok`. Relaunched clean. |
| Web comparison | The local web app from my 155 run is stopped, and `feature/data-export` lives in worktree3, so I compared against the fixture's content. Names, dates (14:05Z shows as 8:05 AM MDT), set counts and units all match. The abandoned "Pull" session is stored but not shown in history (history is completed only). |

## Findings (most severe first)
1. **A later export updates nothing that changed, but adds its new children.** `Import.swift:162,177,183,193,212,238` skip any row whose id exists. With a later export (`later.json`: abandoned → completed, program renamed, one extra set): the rename and the status change were ignored, but the extra set *was* added to the existing session. So the phone shows the old abandoned session with the new set hidden under it, and the program keeps its old name. `ios/README.md` says a later export "adds only what's new", which hides this. See question 1.
2. **Imported drafts.** A web draft becomes this phone's "In progress" card, even if it is weeks old (screen `i-home-after-later.png`). If the phone already has a local draft, the two coexist. `inProgressWorkout` (`AppDatabase.swift`, `ORDER BY startedAt DESC LIMIT 1`) then shows only the newer one, and the other can never be resumed or discarded. This follows the lead's call ("drafts resumable"), but the stale and double cases aren't covered. See question 2.
3. **The summary counts the file, not what changed.** A second import says "2 programs, 3 workouts, 12 logged sets…" again (`Import.swift:72-74`, `ImportResult.swift`). The message does add "Anything already on this phone was kept, not duplicated", but a person can't tell whether anything new arrived. See question 3.
4. **Minor: ref resolution by name ignores aliases** (`Import.swift:116-121`). That's harmless for real exports, because system ids equal the catalog ids. It only matters for files from another database, like the fixture.
5. **Minor: a program session's detail lists every planned exercise**, including ones with no logged sets (`AppDatabase.swift` detail query, `OR workoutId = ?`). A skipped exercise would show as an empty block.
6. **Minor: non-DB errors aren't refusals.** `importExport` maps only `DatabaseError` to `.corrupt`. An encoding error from `jsonText` would reach the app's generic "couldn't be read" message. That's fine in practice.

Sound: one write transaction; checks format and version before decoding the body; refuses `format` and `version` correctly; ignores keys it doesn't know; keeps plan and logged sets apart; keeps the active program only if the phone has none; runs the import off the main thread (`WorkoutStore.importFile`, `Task.detached`); handles security-scoped URLs. The tests are behavioural.

## Questions (up to 3)
1. **Later exports:** (a) for rows that exist, update the scalar columns from the file (status, completedAt, names, archived flags), so a later export brings the phone up to date. The file wins for rows that came from the web, and rows created on the phone are untouched. (b) Keep insert-only, but say plainly in the README and summary that changed rows aren't updated. (a) is recommended if Dustin will import more than once.
2. **Imported drafts:** (a) import web drafts as resumable only when the phone has no draft and the draft started within the last N hours; otherwise store it as abandoned. (b) Keep it as is.
3. **Summary:** (a) count rows actually inserted ("Added 12 workouts, 140 sets; 3 already here"); (b) keep the file counts.

## Revised review
Pending answers. If Q1 = (b), the verdict becomes accept with a README fix.

## Could only check on a real device
Picking the file through Files/iCloud with `.fileImporter` and the security scope (I imported by path); import time on the phone; memory use for a 50k-set file; the Files app showing Ripit's Documents folder (`UIFileSharingEnabled`).

## Screenshots
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/162/shots/i01-empty-with-import.png (import action on empty history)
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/162/shots/i-fixture-1.png (summary)
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/162/shots/i-history-after-fixture.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/162/shots/i-home-after-later.png (stale web draft as In progress)
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/162/shots/i-detail-adhoc.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/162/shots/i-big-summary.png, i-huge-summary.png, i-after-kill-relaunch.png (same folder)
- Sheets: /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/162/sheet-refused.png (all refusal alerts), /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/162/sheet-import.png (fixture ×2, history, later export)
- Test files and generator: /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/162/files, /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/162/gen

## Cleanup for Dustin
Nothing removed.
- Simulator `ripit-162-review`: `xcrun simctl delete D43E5170-51DB-4D32-A864-483EC7F914D6`
- `ios/Ripit.xcodeproj` generated in worktree6 (git-ignored)
- Scratch DerivedData and files: /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/162
