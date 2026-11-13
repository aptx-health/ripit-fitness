# Ripit iOS: first sweep review

**What you need to do:** look over the screens below, overrule any of my calls you disagree with, then install the app on your phone (about 10 minutes, steps at the bottom). Nothing is pushed or merged yet.

## Outcome

The 4-hour goal was slices 1–3. All four slices are built and reviewed:

| Slice | What it does | Reviewer verdict |
|---|---|---|
| 1. Skeleton | Log an ad-hoc workout with 312 bundled exercises and 594 photos; resume and discard; supersets | Accept (after 2 rounds of fixes) |
| 2. Import | The web gets "Download my data" (JSON); the phone imports it, and re-imports update what changed | Accept (after 2 rounds of fixes) |
| 3. Programs | Build/edit a program, Up Next, log against the plan, week rollover, restart, archive | Accept (after 2 rounds of fixes) |
| 4. Progress (stretch) | Weekly report, records, trend, pinned lifts, lift page with chart; numbers match the web | Meets all 6 scenarios; small fixes (rounding, large text) made after review and checked by tests, not re-reviewed by hand |

- **Check:** `mise run ios-check` → 155 tests pass (exit 0), plus the simulator build.
- **iOS branch:** `feature/ios-skeleton`, in worktree `brave-field-c150`.
- **Web export branch:** `feature/data-export`, in `worktree3` (a separate PR to dev, so it can be released on its own).
- **Agents:** every slice had a test builder, an implementer and an independent reviewer. Reviewers drove the app by tap in their own simulators and compared it with the web.

## Screens

Slice 1, logging and search:

![Workout](assets/s1-workout.png) ![Search with photos](assets/s1-picker.png) ![History, light](assets/s1-history-light.png)

Slice 2, import:

![Import summary](assets/s2-summary.png) ![History after import](assets/s2-history.png)

Slice 3, programs:

![Program by week](assets/s3-program.png) ![Builder](assets/s3-builder.png) ![Resume card](assets/s3-resume.png) ![Program complete](assets/s3-complete.png)

Slice 4, Progress:

![Progress](assets/s4-progress.png) ![Lift page](assets/s4-lift.png)

## Calls I made (overrule any)

1. **Logged weight:** a number plus a unit, as on the web (you approved this). Planned weight stays free text.
2. **Unit entry:** a per-set lbs/kg toggle that remembers the last unit. The web takes it from Settings. Progress displays in one unit you choose.
3. **Workouts in progress:** one at a time on the phone (the web allows one per workout). Starting another asks "Resume or discard".
4. **Restart and rename:** these follow the web. Restart archives the old round, and renaming an exercise renames it in history.
5. **Import rules:**
   - Exercises match the catalog by id, then by name.
   - A later export updates rows that came from the web; anything logged on the phone is never touched.
   - Your active program wins only if the phone has none.
   - Web drafts older than 24 h come in as abandoned.
   - Weights over 2000 import unchanged.
6. **Program editing:** per week only, for now.
7. **Deferred to the backlog:**
   - Progress: the lift page's Top set/Volume tabs and the "Week 2 of 8" line.
   - Cardio, the training profile, themes other than ripit, saved-workout library screens, MCP/agents, coaching.

## Not verified (matters)

- **Never run on a real phone.** `scripts/ios/install.sh` has not been run; agents weren't allowed to install unattended. To check on the device:
  - free signing
  - scroll smoothness with the photos
  - the Files picker from iCloud
  - import time for your real history
- **Your real data needs the export in prod.** The export endpoint is only on the branch. Until it's released, you can only import from a local or staging export.
- **Seed ids:** I assume the bundled exercise ids equal prod's (the seed JSON has prod-style cuids). If they differ, name matching catches most, and the rest become custom exercises.
- **Web download untested on iPhone Safari** (the PWA download path).
- **Lint is already red on dev** (81 biome, 5 eslint errors), unrelated to this work. The new files are clean.

## Next steps

1. Install on your iPhone: plug it in, then run `scripts/ios/install.sh` (details in `ios/README.md`; macOS may ask for your password once). If `fit.ripit.ios` is refused, switch to `io.dustin.ripit` as the README says.
2. Say whether I should open the two PRs into dev (the iOS one and the web export one).
3. Clean up: review and run `initiatives/ios-app/handoff/cleanup.sh`. It removes the agents' simulators, stray dev stacks and containers, scratchpads and build output, and was collected because agents didn't delete anything while you were away.

Records: `initiatives/ios-app/status.md`, `work/153`–`work/172` with handbacks.
