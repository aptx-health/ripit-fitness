Report: complete

# 181 handback: iOS slice 6 (finish summary and saved workouts) review

## Verdict
**All 7 scenarios pass when walked by real taps, and the code is sound. Accept after one small fix:**
1. **A blank rename shows a raw error.** Clear the name in the Rename alert and tap Rename, and you get "Something went wrong / nameRequired" (`ios-t7-rename-blank.png`). Fix: disable Rename while the trimmed name is empty, as Save already does.

Also recommended, and cheap enough to do in the same fix item:
2. **Show the saved workout's name while it is open.** Right now the same workout is called three different things: the logger title says "Workout", the in-progress card and prompt say "Ad-hoc workout", and the summary says "Garage Day Renamed". The name is already stored on the workout (`workoutCompletion.name`; the summary reads it). See Question 1.

Note: there is no `reviewer` skill, so I followed the review section of the V3 operating agreement, as in 176.

## Check
- `mise run ios-check` → exit 0. 205 tests in 34 suites pass, then xcodegen and the simulator build succeed.

## First pass (unaided, kept as written)

### Hands-on by real taps
Simulator `parity-disco-173` (iOS 27.2), driven by a scratch XCUITest harness that taps the real controls (no repo edits). The data came from a copy of the v1 fixture with 5 extra imported saved workouts covering each group: a coach "New" one, a pinned one, two old ones, and an archived one. The import reported "6 saved workouts".

| Scenario | Result |
|---|---|
| Summary after Finish | Finishing a workout started from a saved one opens "Workout complete": #3, Last 7 Days 1, **16 Total reps** (bodyweight day), 2 working sets, 1 exercise, 15s, and Pull-Up "2 sets · 16 reps · +10 REPS VS LAST" (the parity quirk the lead kept). A weighted day leads with **200 Volume (lbs)** and "top 25 × 8". A warm-up-only workout gets the minimal summary, "Marked complete. Nice work.", with no tiles and no Save. **Pass** |
| Save an ad-hoc workout | Save opens with **"Workout — November 7"** (the same as the web's suggestion), plus optional notes and 20/100 and 0/2,000 counters. Save → "Saved to your workouts" → **Open Library › Workouts** switches tabs and the new workout is under Recent. A program workout's summary ("Pull") has **no Save**. **Pass** |
| Library › Workouts groups | From the import: New (Coach Push Day), Pinned (Pinned Pulls), Recent (Garage Day, created 27 days ago), **Older (2) closed** (Sep 1 before Jul 1), **Show archived (1) closed**. **Pass** |
| Manage | All by real taps: pin, unpin (it falls to Older by date), **Rename** through the alert (prefilled with the old name), Archive from the ··· menu, **Restore** (back to Older by date), **Dismiss** on the New row (goes to archived), and Delete. Delete asks first; dismissing the prompt keeps the workout, and confirming removes it. After terminating and relaunching, every group was exactly as left. **Pass, with finding 1** |
| Start a saved workout | Detail sheet (plan "2 × 20m", "2 × 8 RIR 1", note) → **Start this workout** → the logger opens with plan chips; Pull-Up reps are prefilled to 8, and Sled Push's "20m" leaves reps empty. Library then shows last used "Nov 7". With a workout open, Start asks "Ad-hoc workout is in progress", and **Discard it and start Garage Day Renamed** opens the saved one. **Pass, with finding 2** |
| Training Pinned and Recent | Pinned shows one-tap **Start**. Recent shows the last 3 finished workouts with date and duration ("Oct 6 · 1h 05m"). Each had sets, so each has Repeat; the no-sets case is covered by tests only. **Pass** |
| Repeat | Repeat opens a new workout with only the exercises that were logged (Pull-Up, with its note), ready to log. With a workout open it asks first, and **Discard** then opens the repeat. **Pass** |

**Dark mode** (not checked by the build): Training, Library, the summary and Save all read correctly, with no light-only colours (`ios-sheet-dark.png`).
**Largest text size, light and dark:** the summary tiles go one per row and the exercise rows stack, so nothing breaks mid-word (`ios-axdark2-summary*.png`). Training's Start and Repeat buttons stack full width, and Restore and Delete stack too.

### Defects and risks
1. **A blank rename shows "nameRequired" (should fix).** In `LibraryView.swift` ~84, the alert's Rename stays enabled with an empty field, and `WorkoutStore.write` puts `"\(error)"` in `lastError`. Disable Rename for an empty trimmed name. A friendlier message for `SavedWorkoutError` in general would also help.
2. **A started saved workout has no name while open (recommend fixing now).** The logger title says "Workout", and Training's card and the Resume/Discard prompt say "Ad-hoc workout" (`ios-t3-04-prompt-saved.png`). Yet the summary a minute later says "Garage Day Renamed". The web logger shows no name either, so this isn't a parity gap, but on the phone the prompt "Discard it and start Garage Day Renamed" over "Ad-hoc workout is in progress" is confusing when both are saved workouts.
3. **The delete prompt points at the wrong row (cosmetic).** The `confirmationDialog` is attached to the whole Library view. In iOS 26+ it shows as a popover, and its arrow pointed at Coach Push Day's Delete button while I was deleting Ancient Full Body from Older's ··· menu (`ios-t1-06-delete-confirm.png`). There's no Cancel button; you tap outside to dismiss. That's the system style, but anchoring the dialog to the row would read better.
4. **At the largest text size the pin and ··· touch** on Library rows, though both remain separate targets (`ios-sheet-ax.png`). Small.
5. **The summary's "vs last" runs up to 50 queries** (`previousSets` loops per workout). This is fine on local SQLite. It copies the web's 50-workout look-back.
6. `renameSavedWorkout` stamps `Date()` itself, not an injected date like the other writes. Harmless.

Code read: `SavedWorkoutsStore.swift` matches the rules in its header. One-open-workout is enforced in the database (`refuseIfOpen`) and in the UI (`pendingStart` now has a kind). The summary opens from the full-screen cover's `onDismiss`, so it never stacks over the logger. Views stay thin, and wording comes from RipitCore. `prefill()` now takes reps and warm-up from the next planned set, and only for whole-number reps.

## Questions (answered from the files, as in 176)
1. **Workout name now or later?** 180's handback asks this too. My recommendation: **now**, in the fix item. It needs only a `name` on `WorkoutDetail` / `inProgressWorkout`, and the column is already filled.
2. **Is "Garage PullsWorkout — November 7" a bug?** No. That was my harness: its tap put the cursor at the start of the field, so my text was added in front of the suggested name. The field itself works.
3. **Should Pinned show when empty, as on the web ("PINNED WORKOUTS 0")?** iOS hides it. I think hiding is right on a phone, so this needs no decision unless you want strict parity.

## Revised review
After my first pass I read `work/180-handback.md`. It lists the unnamed workout as an open question, the two parity quirks as lead decisions, and every flow I tapped as "not tapped by hand". All of those flows now pass by real taps, including Rename, Discard-and-start for both saved and repeat, Open Library after Save, Dismiss and Restore. Nothing changes my verdict: **accept after fix 1; fix 2 recommended now.**

## Web comparison (local web at 390 px; images `web-*` and `ios-*` in `initiatives/ios-app/handoff/slice6-assets/`)
| Area | Web | iOS | Deliberate or gap |
|---|---|---|---|
| Summary | Modal: #8 / Last 7 Days 5, Total Reps hero, tiles, "Bench Press 2 sets · 10 reps", Save Workout to Repeat, Got feedback? (`web-rollup.png`) | Sheet with the same numbers and wording, plus the workout's name on top (`ios-t2-05-summary.png`) | Matches; the name on iOS is a small gain; feedback is out of scope |
| Save | Dialog; same suggested name; hint "Rename to something memorable…"; after Save the modal shows "Saved to your workouts" | Pushed page; no hint; after Save, a page with "Open Library › Workouts" | Deliberate; the missing hint is tiny |
| Library rows | "1 exercise · Today", tab badge "Workouts 1" | "2 exercises · Nov 7" | **Small gap:** the web uses relative dates ("Today", "Last done Today") |
| Detail | "1. Bench Press 2 × 5", Start This Workout | The same, plus notes and superset tags | Matches |
| Started workout | Target "2 × 5 · set 1 next", reps prefilled 5 | Plan chips, reps prefilled | Matches in substance |
| Training Pinned | Block shown even when empty ("0") | Hidden when empty | Deliberate |
| Repeat with a workout open | Inline "Finish your current workout before starting a new one." (`web-repeat-with-draft.png`) | Asks Resume or Discard | iOS is better, and it is what the spec asks for |
| Recent names | Freestyle shows "Open Workout — November 7, 2026" | The workout's own name or "Open Workout" | Matches the rule |

## Outside the item (not fixed)
- **Web: "Start a freestyle workout" fails with "Could not start freestyle workout. Please try again."** when a freestyle draft is already open (`DRAFT_EXISTS` in the log). Training showed no in-progress card for that draft either, so there was no way back to it except the URL. This is close to 176's note; worth a web item.
- Web Library's saved-workout row reads "Today" for last used; if the phone should match, that's a small follow-up.
- The two parity quirks the lead kept (kg summed as lbs; bodyweight "vs last") are visible on the phone: "+10 REPS VS LAST" for 8 + 8 today against last time's top set of 6.
- A weighted Pull-Up after a bodyweight one shows no "vs last" at all (`ios-light-full-summary.png`). This is probably web parity (zero previous volume), but I didn't check it against the web.

## Cleanup for Dustin
- Simulator `parity-disco-173` (`06CEC7E3-537B-4866-8153-F71E8CC87FA1`), shut down: `xcrun simctl delete 06CEC7E3-537B-4866-8153-F71E8CC87FA1`. Its app data now holds the fixture copy's workouts and saved workouts.
- Docker `fitcsv-postgres-review155` (stopped) and volume `fitcsv-pgdata-review155`. The local test user now has a saved workout "Workout — November 7", and an **open freestyle draft** started from it. The old 176 draft is now finished as workout #8.
- `next dev` on 3955 is stopped. I did not run `prisma db push` (it wanted to drop tables), so the review DB schema was used as is.
- Scratch (harness, DerivedData `dd/`, logs, shots, fixture copy, Playwright scripts): `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/e707016a-8e70-425e-b299-c1acfaf8cd6c/scratchpad`
- A stray `ios-check` log outside the scratchpad: `/var/folders/h9/x7jsdhy915scf8vf47smkshc0000gn/check181.log`
- `initiatives/ios-app/handoff/slice6-assets/` (45 images, git-ignored). `ios/Ripit.xcodeproj` was regenerated by `ios-check` (git-ignored). Nothing committed. Nothing deleted: one `rm` of a scratch glob matched no files.
