Report: complete

# 191 handback: iOS slice 8 (picker filters and custom exercises) review

## Verdict
**Accept.** All 8 scenarios pass by real taps. Search and filter results match the local web row for row in all 16 cases I compared. The code is sound. Nothing blocks.

Recommended, cheap enough for one small fix item:
1. **Don't show the "required" errors when the editor opens.** A new exercise opens with two red errors ("At least one equipment type is required" and "At least one primary muscle group is required") before you've touched anything. The web shows field errors only after you try to save. 190 chose this on purpose, so Save being off has a visible reason. I'd still show them only after a field is touched or Save is tapped (`pairs-create-dark.png`, panel 1).
2. **Keep the duplicate warning in view.** It sits above the Name field. While you type, the keyboard scrolls it under the nav bar, half cut off (`pairs-create-dark.png`, panel 2). Moving it under the Name field, next to the red border, would fix it. The web puts it in the same place, but its form doesn't scroll there.

One small call is under Needs a call: imported exercises the phone doesn't know show as MINE.

There is no `reviewer` skill. I used the method from 176, 181 and 186.

## Check
- `mise run ios-check` → exit 0. 262 tests in 42 suites pass, then xcodegen and the simulator build succeed.

## First pass (unaided, kept as written)

### Scenarios by real taps
I used simulator `ripit-review` (iPhone 17, iOS 27.2, created for this review) with a scratch XCUITest harness that taps the real controls. No repo edits.

| Scenario | Result |
|---|---|
| Search like the web | I searched 8 texts: bench, curl, pull up, row, squat, ohp, rdl, Press. The visible rows match the web's in order. Aliases work ("ohp" finds Overhead Press, "rdl" finds Romanian Deadlift), and so do normalized names ("pull up" finds Pull-Up). **Pass** |
| Filter by muscle group | Chest, then Hamstrings, then All Muscle Groups to clear it. Same rows as the web. One choice at a time; the sheet ticks the current choice. **Pass** |
| Filter by equipment | Dumbbell, Kettlebell, and Other (specialized equipment). Other includes bands and the ab wheel, as on the web. The sheet has the web's 9 choices. **Pass** |
| Search and filters together | "squat" + Quads + Barbell gave 3 rows. "press" + Triceps + Other gave 4 rows. Both match the web. Photos show on filtered rows. **Pass** |
| Pick several at once | I ticked 3 curls, unticked and re-ticked one (it moved to last), then searched "bench" and ticked one more. Ticks survive a new search. The button read Add (4), and the logger got all 4 in tick order. **Pass** |
| Create a custom exercise | "Zercher Carry" found nothing, so I tapped Create "Zercher Carry". The name was prefilled. Equipment and primary muscle are one choice each. Secondary is multi and leaves out the primary. The counter reads 49/1000. Save was off until everything was valid. "barbell bench press" got the duplicate warning and Save went off. "!!!" got "Name must include a letter or number". After Save, the exercise was ticked straight away with a MINE badge. Opening Create again with the same text showed the warning. **Pass, with findings 1 and 2** |
| Edit a custom exercise | Built-in exercises have no Edit button; I counted 0 on the bench results. I renamed Zercher Carry to Zercher Walk, and the new name showed in search. I renamed Sled Push to Sled Push Heavy, and it showed in the open logger, the Info sheet, History's workout detail, Progress's pinned lift and the program's Up next. **Pass** |
| Custom exercises everywhere | I used Sled Push in a workout: logged 100 × 10, finished, and saved the workout. Progress pinned it from the picker with one tap ("100×10 · e1RM 133"). A new workout showed "Last time 100 lbs × 10 × 1". The program builder took Sled Push and Bench Press in one Add (2), and Up next lists both. After a relaunch, it's still in search. Importing `ripit-export-v1.json`, which has its own "Sled Push", matched mine: the search still shows one Sled Push, and the import added 0 custom exercises. **Pass** |

### Look
- **Largest text (AX5):** names wrap between words, photos sit above the text, the filters stack, the editor's name wraps, and sheets fit (`pairs-ax5.png`). With the keyboard up, filters, the bottom bar and the keyboard leave room for less than one result row (panels 2 and 5). Dismissing the keyboard or scrolling gets the room back. Acceptable, but worth knowing.
- **Dark (RIPIT dark) and light:** both read well. The tick fill, MINE badge, Edit link, sheets and editor all use theme colors (`pairs-light.png`). In dark mode the disabled Add is still a fairly bright green with dim text. It reads as nearly enabled, but it's the existing `FilledButtonStyle`.

### Side by side with the web (local web at 390 px)
- **Results:** I ran the same 16 cases through the web's own `/api/exercises/search` with the picker's parameters. The first 8 names match iOS in all 16. The web's result counts (bench 9, curl 27, chest 38, other 49, and so on) agree with the goldens.
- **Picker:** the web shows text cards (name, primary, secondary, equipment, and an Add button per row) with no photos. iOS shows tick boxes and photos, and leaves out secondary muscles. The web's add button reads "Add 1 exercise" or "Add all (n)"; iOS's reads "Add (n)". Both are fine.
- **Create:** the web doesn't prefill the name from the search; iOS does, as the spec asks. The web also has Category, Notes and a Preview tab, and counts the name to 100. The duplicate warning matches the web's wording and place (`pairs-web-vs-ios.png`).

### Code read
- `Picker.swift` does what its header says, including the three PHONE rules. The duplicate check runs inside the write transaction. A rename also updates `exercise.name`, so History, the logger and programs follow. Saved workouts keep their JSON copy (known).
- Search runs off the main thread over about 316 rows, with no debounce, and each keystroke cancels the last task. There is no network. The editor's duplicate check runs a small SQLite read on the main thread each time the view redraws. That's cheap at this size. I didn't run the throttled tap test; nothing here touches the network.
- A query with letters but no a–z or 0–9 (for example "é") matches everything through the normalized-name rule, as on the web. The PHONE letter-or-digit rule doesn't catch it. Rare, so I'm noting it only.
- If a save is refused (only possible in a race now that the warning blocks Save), the error goes to `lastError`. The alerts that show it sit under two sheets, so Save would seem to do nothing. Very unlikely.

## Questions (answered from the files, as in 186)
1. **Were the up-front editor errors deliberate?** Yes. 190's decisions say "The editor shows a field's error under it as soon as the field is invalid". Still recommendation 1.
2. **Was the rename walked through History, Progress and saved workouts?** No, only by tests. I walked it, and it passes.
3. **Was import walked?** No. I walked it: it matched by name, with no duplicate.

## Revised review
I read `work/190-handback.md` after my first pass. Its "Not verified" list (perf tap test, rename everywhere, import) is what I covered by hand, and those all pass. Its Needs a call items are the two the lead already settled. The verdict stands: **accept; fixes 1 and 2 recommended.**

## Needs a call (not blocking)
- **Imported exercises that the phone's catalog doesn't know show as MINE and can be edited.** The import fixture refers to "Barbell Bent-Over Row", a web exercise that isn't in the phone's catalog. Import keeps it as a non-system row (`Import.swift` `resolveRef`, from the import slice). Slice 8 now shows it with a MINE badge and an Edit button. The editor opens with no equipment or muscles. This can only happen for web built-ins added after the phone's catalog was built. Options: mark these rows as built-in (no badge, no edit), or leave them. **I recommend marking them built-in**: one flag at import. Evidence: `ios-e-03-import-bent.png`, `ios-f-00-edit-imported-ref.png`.

## Outside the item (not fixed)
- The local web's ad-hoc draft from earlier reviews ("Workout — November 7") is still open on the review database, so `POST /api/workouts/adhoc` returns 409. I worked inside that draft and added nothing to it.

## Cleanup for Dustin
- Simulator `ripit-review` (`0BFD652D-9ECD-47F3-BB5B-5C9C86218466`), shut down and kept for reuse as the item asks. Its app data holds my test workouts, a program "Custom Test" and the imported fixture. `initiatives/ios-app/handoff/sims.sh` doesn't match `ripit-review`, so it won't delete it.
- Docker `fitcsv-postgres-review155` was started, then stopped again. `next dev` on 3955 is stopped. On the web I only ran searches and opened the create form; nothing was saved.
- Scratch, about 890 MB (harness, DerivedData `dd/`, shots, web scripts): `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/9c611678-5060-43c6-b710-8440369bc735/scratchpad`. `pw/node_modules` is a symlink to an older scratch's copy.
- 81 images in `initiatives/ios-app/handoff/slice8-assets/` (git-ignored):
  - `ios-*`: iOS screenshots
  - `web-*`: web screenshots
  - `pairs-*`: comparison sheets
- `ios/Ripit.xcodeproj` and `ios/build` were regenerated by `ios-check` (git-ignored). Nothing committed, nothing deleted.
