# Ripit iOS: what's missing next to the web

**What you need to do:** pick the order of the next slices (my pick is below), and say whether agents should get your phone data through an export file. Nothing was built in this pass.

## Bottom line

The iOS app has the bones of the main loop: logging, history, programs and progress. What makes it feel basic is the **in-workout help** the web gives you, plus **no Settings, no Library and only one theme**. All 60 web pages are in the inventory. Each row says whether it was seen running (O) or only read in the code (C).

## Top gaps

1. **Logging a set:** iOS has no rest timer, no "last time" line, no RPE/RIR entry, no notes, and no Info or History tab for each exercise.
2. **Finishing a workout:** iOS has no summary at the end and no "save to repeat". Saved workouts you import are stored but can't be seen, and there's no Pinned or Repeat way to start one.
3. **Settings and look:** iOS has no Settings tab and only the ripit theme. It uses mixed-case system text and rounded corners, where the web has an uppercase display font, square corners and folder tabs that switch in place.

## Side by side (web left, iOS right)

Training home: ![web](parity-assets/web-training.png) ![ios](parity-assets/ios-training.png)

Logging: ![web](parity-assets/web-workout.png) ![ios](parity-assets/ios-workout.png)

Exercise picker: ![web](parity-assets/web-picker-search.png) ![ios](parity-assets/ios-picker.png)

Progress: ![web](parity-assets/web-progress.png) ![ios](parity-assets/ios-progress.png)

Settings (web only): ![web](parity-assets/web-settings.png)

## Proposed next slices

1. **Logging help** (1–3 days): rest timer, "last time" line, RPE/RIR, notes, and an Info + History sheet for each exercise.
2. **Finish summary + saved workouts** (1–3 days): the end-of-workout summary with "save to repeat", a Library with your workouts, and Pinned/Repeat on Training.
3. **Settings + look** (1–3 days): a Settings tab (themes including e-ink, effort defaults, weekly target), plus a pass to match the web's font, corners and folder tabs.
4. **Picker + custom exercises** (under a day to 3 days): muscle and equipment filters, picking several at once, creating your own exercise.
5. **Export from iOS + agent round trip** (1–3 days): iOS writes the same JSON as the web export, and imports a proposals file for you to approve on the phone. It's also your backup.
6. **Progress and program leftovers** (under a day): Top set/Volume tabs, "Week N of program", skip day, complete week.

## Decisions for you

1. **Order:** I recommend 1 → 2 → 3. I'm confident logging should go first; 2 and 3 could swap if the look bothers you more.
2. **Agents and MCP on a local-only phone:** I recommend an export file plus importing a proposals file (slice 5), not syncing to the server. Coaching and community: leave out for now. Curated programs could ship bundled later.

## Also found

- On iOS, Finish ends the workout in one tap, with no confirm. This was noted in review 155 and is still open; I'll fold it into slice 1 or 2.
- `dev.sh` can't start in this worktree. Worktree1's old overmind process holds slot 1's socket.
- Possible web bug: `/library?type=programs&tab=browse` opens My Programs instead of Browse. Seen only in Playwright; not checked by hand.

Full inventory: `initiatives/ios-app/parity-inventory.md`.
