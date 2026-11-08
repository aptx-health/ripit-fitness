# Ripit iOS slice 6: finish summary and saved workouts

**What you need to do:** try it on your phone with `scripts/ios/install.sh`: finish a workout, save it, start it again from Library. Overrule any of my calls below. Nothing is pushed.

## Outcome

All 7 scenarios pass when walked by real taps, and a re-check after the fixes accepted it. `mise run ios-check` passes: 208 tests, plus the simulator build.

- **Summary after Finish:** the same numbers and wording as the web's (volume, or total reps on a bodyweight day; sets; exercises; duration; "vs last" per exercise). A very short workout gets the web's short "Marked complete".
- **Save to repeat** for ad-hoc workouts, with the web's suggested name. Program workouts have no Save, as on the web.
- **A new Library tab** with your saved workouts in New, Pinned, Recent, then closed folds for Older and Archived. You can pin, rename, archive, restore, dismiss and delete (delete asks first). Imported saved workouts show up too.
- **Start a saved workout** from its detail. The logger shows its plan, and the workout carries its name while open.
- **Training** shows your pinned workouts with Start, and your recent workouts with Repeat.
- Dark mode and the largest text size were checked.

## Screens

![Summary](slice6-assets/ios-t2-05-summary.png) ![Save](slice6-assets/ios-t2-07-save.png) ![Library](slice6-assets/ios-t1-02-folds-open.png) ![Detail](slice6-assets/ios-t2-01-detail.png) ![Training](slice6-assets/ios-t3-01-training.png) ![Name while open](slice6-assets/recheck-r-saved-card.png)

Web for comparison: ![Web summary](slice6-assets/web-rollup.png) ![Web library](slice6-assets/web-library-saved.png) ![Web training](slice6-assets/web-training.png)

## Calls I made (overrule any)

1. **Two summary quirks match the web for now:**
   - kg volume is added as if it were lbs. 5 × 100 kg plus 5 × 225 lbs shows "1,625 lbs".
   - Bodyweight "vs last" compares today's total reps with last time's best set.

   Both are on the backlog, to fix in both apps together.
2. **No post-workout rating.** You approved leaving it out; on the web it goes to the server.
3. **The workout's name shows while it's open.** The web doesn't do this; on the phone it makes the Resume/Discard prompt clearer.
4. **An empty Pinned block is hidden**, where the web shows "0".
5. **Library has only Workouts.** Programs stay on Training.

## Not verified

- Not on your phone yet.

## Found along the way (on the roadmap backlog)

- Web: "Start a freestyle workout" fails with a generic error while another freestyle workout is open, and Training offers no way back to it.
- Library rows show the date ("Nov 7"); the web says "Today".

Records: `work/179`–`183` with handbacks; `features/ios-app/saved-workouts.feature`.
