Report: complete

# 176 handback: iOS slice 5 (logging help) review

## Verdict
**Meets all 10 scenarios when walked by real taps. Accept after two small fixes.**
1. **Largest text size breaks the logger header.** The exercise name splits mid-word, the rest timer stacks one character per line, and the History header wraps word by word.
2. **The planned effort is lost after switching scale.** Switching RPE↔RIR mid-workout no longer offers the planned RPE/RIR.

Also make a call on **long-press → "Mark as warm-up"**. It never appeared in my runs, and a long-press opened set editing instead. Either fix it, or drop it and rely on edit + Warm-up, which works.

Note: there is no `reviewer` skill. I followed the review section of the V3 operating agreement (`project-structure-v3/references/operating-agreement.md`).

## Check
- `mise run ios-check` → exit 0. 178 tests in 31 suites pass, then xcodegen and the simulator build succeed.

## First pass (unaided, kept as written)

### Hands-on by real taps
Simulator `parity-disco-173`, iOS 27.2. I used a scratch XCUITest harness (no repo edits) that taps the real controls. Data came from the v1 fixture, `-demoHistory` / `-demoEffort` (synthetic), and a copy of the fixture with a plan note on Deadlift.

| Scenario | Result |
|---|---|
| Rest timer starts / resets | Log → "0:01", after 6 s → "0:07", log again → "0:00". It is per exercise: Hip Thrust, with no sets, shows no timer. **Pass** |
| Rest timer keeps true time | Switching to Settings for 128 s added +128 s to both clocks (2:06 → 4:14). **Locked** the device for 126 s (screenshot confirms the lock screen): the rest timer went 4:23 → 6:29 and the clock 4:52 → 6:58. **Pass** |
| Workout clock across relaunch | Terminated and relaunched: the clock read 1:08, then 1:49 a minute later, with the rest timer consistent. **Pass** |
| Last time | Repeated bench: "Last time, Sat, Nov 7: 160 lbs × 5 × 3 @ RPE 8". Tapping **Use** filled 160 / 5 / RPE 8. A never-logged exercise (Barbell Hip Thrust) shows no line. **Pass** |
| Logging effort | Real tap on the RPE menu: None, then 6, 7, 8, 9, 10 with the web's descriptions (whole numbers only, as decided on 174). Picking RPE 9 saved "@ RPE 9" on the sets, in workout history detail too. Progress effort read **RPE 8.6, 57% of sets at 9+**, which I checked by hand: (3×8 + 4×9)/7 = 8.57, and 4/7 = 57%, warm-ups excluded. Planned default: with RIR already selected, Deadlift (plan RIR 2) offered **RIR 2**, and the logged set showed "@ RIR 2". **Pass, with defect 2** |
| Warm-up sets | Warm-up toggle (real tap) → logged set shows **W**, and the toggle resets to Off after logging. Editing a set, tapping Warm-up, then Save also marks it. History detail labels both. Progress working sets = 13 (warm-ups left out, checked by hand). Records exclusion is covered by unit tests only. **Pass, with finding 3** |
| Exercise info | Photos, instructions, Primary/Secondary muscles and Equipment (below the fold): all present. **Pass** |
| Exercise notes | Deadlift with a plan note: an inline "Brace hard; reset each rep." line, and the sheet has a Notes tab. Pull-Up (no note): no line, and tabs are Info/History only. **Pass** |
| History while logging | Newest first. e1RM 187/177/181 lbs, all checked by hand (Epley). PR on the 187 session. "1 warm-up set" is collapsed and expands on tap. A new exercise shows "No finished workouts with this exercise yet." **Pass** |
| Finish asks first | "Finish this workout? 6 sets logged. It goes into history." Cancel keeps the workout open with the clock running. Finish → it goes to history. **Pass** |

### Defects and risks
1. **Largest text size: the logger header is unreadable (should fix).** `WorkoutView.swift` ~205–230 puts the name, `RestTimerChip`, ⓘ and ··· in one `HStack`. At the largest size the name breaks as "Bar-bell Ben ch Pres s" and the chip stacks "1 / : / 3 / 8". The History header (`ExerciseHelpSheet.swift` `SessionCard`) wraps "Open Work out" beside "PR e1RM 187 lbs". Light and dark at default size are fine. See `ios-ax-workout.png` and `ios-ax-history.png`. Fix: stack the timer under the name, or switch to a `VStack` at accessibility sizes, as `entryRow` already does.
2. **The planned default is lost after switching scale (small).** `.onChange(of: effortKind) { effort = nil }` (`WorkoutView.swift` ~293). Start on RPE and switch to RIR: Deadlift shows "RIR none" instead of its planned RIR 2 (`ios-rir-default.png` shows it working only when RIR was set before opening). The spec says the planned value "is offered as the default". Re-run the prefill effort on the switch instead of clearing it.
3. **Long-press "Mark as warm-up" never appeared.** In three tries (element press 1.2 s, 2.0 s, and a coordinate press 1.5 s), the press opened set editing (the Save button appears) and no menu showed (`ios-longpress.png`). The `.contextMenu` sits on the set row's `Button` (`WorkoutView.swift` ~255). This could be an XCUITest quirk, so try it once by finger on the phone. Either way the scenario is met through edit + Warm-up.
4. **A warm-up set keeps the chosen effort.** It is logged as "160 × 5 @ RPE 9 W", because effort carries over to the next set while warm-up resets. Harmless for Progress, since warm-ups are excluded, but it reads oddly. Low priority.
5. **Effort can't be changed when editing a set.** The menu is hidden while editing, and `updateSet` has no effort field. Not required by the spec; a gap next to the web.
6. **VoiceOver doesn't hear the tags.** The set row's `accessibilityLabel` ("Set 1, 160 lbs times 5. Tap to change") overrides `SetTags`, so "warm-up" and "RPE 9" are not read out. Small.
7. **`ExerciseInfo.swift` has no tests** (flagged by the item). The logic is simple: JSON decode with a fallback to empty, trimmed instructions, muscle name map. The risk is low, but `muscleName`'s map can drift from the web's `FAU_DISPLAY_NAMES`. One small test would pin it.

Code read: the core is clean and matches the rules in its header. One shared `finishedSessions` query serves Last time and History, ties and PR rules match the web, and the rest timer reads `createdAt`, so true time is free. Views stay thin. Store reads happen in `body`, but only once per render, since `TimelineView` ticks don't re-query.

## Questions (for the lead or Dustin)
1. **Long-press:** keep it and fix it, or remove it, since edit + Warm-up covers the scenario? I recommend checking once by finger on the phone: if it works, keep it; if not, remove it rather than debug it.
2. **Effort on warm-ups:** should logging a warm-up clear the effort (or leave it blank)? I recommend yes; it's a one-line change.
3. **Editing effort on a logged set:** in scope for the fix item, or later? I recommend later, with Settings (slice 7).

## Revised review
I answered from the files: `work/175-handback.md` (read after the first pass) says clearing effort on a scale switch was intended and that editing changes only warm-up. That makes defect 5 a known choice, but defect 2 stands: the spec asks for the planned default, and clearing it on a switch loses that. Nothing else changed. **Verdict unchanged: accept after fixes 1 and 2**, plus the long-press call.

## Web comparison (local web at 390 px, freestyle logger; images in `initiatives/ios-app/handoff/slice5-assets/`)
| Area | Web | iOS | Deliberate or gap |
|---|---|---|---|
| Rest timer | One "RESTING 0:13" row under the sets, dismissible (`web-c-rest8.png`) | A chip per exercise beside its name (`ios-rest.png`) | Deliberate: iOS shows all exercises at once |
| Last time | "LAST TIME: 135–155 lbs × 8,5 (Today)", plus per-set "last: 8 × 135" (`web-lasttime.png`) | Line with date "Sat, Nov 7" and a **Use** button; no per-set "last:" | Relative date and per-set hints are small gaps |
| New exercise | "First time logging this — see Info tab for guidance" | Nothing | Small gap (the spec only requires no Last time line) |
| Effort | Inline "RIR --" picker next to weight; scale from Settings | Menu under the entry row; RPE/RIR toggle in the workout header | Deliberate until Settings exists (slice 7) |
| Info | Instructions; "More images to come" when there are none (`web-b-free-info.png`) | Photos, instructions, muscle and equipment chips | iOS is ahead (muscle and equipment chips) |
| History | Tab in the logger; empty: "First time doing this one…" | A sheet from ⓘ; empty: "No finished workouts…" | Deliberate (a sheet versus web tabs) |
| Finish | "COMPLETE THIS WORKOUT? 2 sets · 93 min — Cancel / Confirm" (`web-c-finish.png`) | "Finish this workout? 6 sets logged…" | Matches; the web also shows the duration |
| Look | Uppercase display font, square panels, fixed LOG SET bar | SF, rounded, inline Log | The known look gap (parity inventory, slice 7) |

## Outside the item (not fixed)
- **Web: Start Workout silently does nothing while a freestyle draft is open.** On the program page and Training › Up Next, Start just reloads; only Quick actions explains "Continue or discard your draft to unlock other actions". Worth a web item: say why, or offer to resume.
- **Seed data: Barbell Bench Press has decline-bench instructions** ("Secure your legs at the end of the decline bench…") in `prisma/seeds/exercise-definitions.json`, id `cmiz7vjju0000vr0m4b1o6bec`. Both apps show it.
- **iOS (slice 3): Deadlift prefilled no weight** despite the plan's "275lbs", so a set logged without typing saved as "BW × 5". Check `computePrefillValues` parity.
- On the web, Playwright role queries (`getByRole`) found nothing on `/training` this run, although the elements render. I used text and coordinate clicks instead. Unverified whether a hidden `aria-hidden` wrapper causes this, which would matter for screen readers.
- `slice5-assets/` holds failed-attempt shots alongside the good ones. Use `web-b-*`, `web-c-*`, `web-lasttime.png` and `ios-*`. Junk to delete: `web-free-*`, `web-workout*.png`, `web-rest-8.png`, `web-info-bottom.png`, `web-settings-intensity.png`, `web-b-free-finish.png`, `web-b-free-full.png`, `web-b-free-resume.png`.

## Cleanup for Dustin
- Simulator `parity-disco-173` (`06CEC7E3-537B-4866-8153-F71E8CC87FA1`), shut down: `xcrun simctl delete 06CEC7E3-537B-4866-8153-F71E8CC87FA1`
- Docker `fitcsv-postgres-review155` (stopped) and volume `fitcsv-pgdata-review155`. The local test user now has **intensity tracking on**, and the open freestyle workout holds 2 Bench Press sets (still a draft).
- Scratch (harness, DerivedData `176/uidd`, logs, shots, fixture copies): `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/dc0702dd-f34d-46ac-8b2a-ec5acf33b91b/scratchpad/176` (plus `web6.mjs`–`web11.mjs` in the scratchpad root)
- `ios/Ripit.xcodeproj` regenerated by `mise run ios-check` (git-ignored). Nothing committed.
