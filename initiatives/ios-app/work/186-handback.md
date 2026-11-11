Report: needs decision

# 186 handback: iOS slice 7 (Settings and the web's look) review

## Verdict
**The code is sound, and iOS now looks close to the web: same colors, type, square shapes and folder tabs, screen by screen. 8 of the 10 scenarios pass by real taps. Accept after 2 fixes:**
1. **Four themes get a black status bar on a dark screen.** On the web, DOOM, CYBER, SYNTHWAVE '84 and DRACULA stay dark in "light" mode (their light tokens are dark). iOS picks the color scheme from the mode (`RipitApp.swift:108`). So in those 4 themes' light mode, the clock and battery are black on near-black, and the tab bar, switches and alerts are light (`ios-light-mode-dark-themes-statusbar.png`). Fix: choose light or dark from the theme's `background` brightness, not from the mode.
2. **Picking E-INK doesn't do what the web does.** The web's `pickTheme` (`hooks/useThemePreference.ts:74`) turns E-ink display on and remembers your mode. Leaving E-INK restores that mode. On iOS, RIPIT dark → E-INK → RIPIT lands on **Light**, and E-ink display stays off (`SettingsView.swift:348`). Fix: port `pickTheme`'s 3 rules.

**Two calls for Dustin** (see Needs a call): E-ink motion, and E-ink's colored text and borders.

Recommended, and cheap enough to go in the same fix item:
3. **Keep the theme list where it was after a pick.** Tap OKABE near the bottom, and the list jumps to the top, so you lose sight of your pick (`ios-rebuild-scroll-reset.png`).

There is no `reviewer` skill. I followed the method of 176 and 181, and the review section of the V3 operating agreement.

## Check
- `mise run ios-check` → exit 0. All 241 tests in 39 suites pass, then xcodegen and the simulator build succeed.

## First pass (unaided, kept as written)

### Scenarios by real taps
I used simulator `parity-disco-186` (iOS 27.2) with a scratch XCUITest harness that taps the real controls (no repo edits). The fresh-install run started with the app uninstalled.

| Scenario | Result |
|---|---|
| Settings tab | Look, Workouts, Training targets and Help, as on the web. Every change saved at once. After terminate and relaunch, these were all as left: E-ink display on, tracking on, RPE, kg, target 5, RIPIT light. **Pass** |
| Themes | A fresh install opens on **RIPIT, Dark**. I tapped all 13 themes in dark and checked all 13 in light. The colors match the web's tokens, and the tokens table is the golden byte for byte. E-INK shows "Mode: E-INK is light only", disabled. **Pass, with findings 1 and 2** |
| E-ink display | Text goes one weight bolder in any theme (`pairs-eink-display.png`). **Motion doesn't visibly change** (finding 4). **Partial** |
| Workout settings | Tracking off: no effort picker. On: the picker follows the rating type, RPE then RIR. A new exercise starts in kg. The next set keeps the unit of the set before it. There is no RPE/RIR switch in the header. Progress reads "3 of 5" after target 5, and shows kg. Its settings sheet is gone. **Pass** |
| Help | Learn opens Safari at ripit.fit. The version reads 0.1 (1). Send feedback does nothing visible, because the simulator has no Mail. **Pass (Mail not verifiable)** |
| Type | Rajdhani, uppercase and tracked, on labels, buttons, folder tabs and titles. Body text and numbers are plain Medium. **Pass** |
| Shapes | Square corners on cards, buttons, inputs and chips. Primary buttons have the hard offset shadow (none on E-ink, as on the web). Folder panels match the web's. **Pass** |
| Folder tabs | These switch in place: Pinned and Recent, Up next and Active program, Records and Lifts, and Info and History in the exercise sheet. Notes appears only when there are notes. **Pass** |
| Native | Sheets, alerts, the keyboard and the glass tab bar are native. Targets are at least 44pt. The ⓘ and ··· are separate. **Pass** |
| Largest text (AX5) | No word breaks mid-word on Training, Library, Progress, Settings, the logger, the exercise sheet or the E-ink screens. The program title wraps between words, the superset badge grows, and the ⓘ and ··· have room. **Pass, with finding 6** |

### Side by side with the web (local web at 390 px)
I compared Training, the logger, Library, Progress and Settings in RIPIT dark, RIPIT light, DRACULA dark, E-INK and RIPIT dark with E-ink display on. Pairs are in `initiatives/ios-app/handoff/slice7-assets/`: `web-<theme>-<screen>.png` with `ios-<theme>-<screen>.png`, and the sheets `pairs-*.png`.

| Screen | How close | Differences |
|---|---|---|
| Training | Very close: the same folder blocks, tab tones, START WORKOUT with its shadow, and REPEAT and START outlines | The web shows the Up Next workout name in display caps ("UPPER BODY"); iOS shows "Lower A". On iOS, Programs and Ad-hoc are buttons; on the web they are under the Workout button (deliberate). |
| Logger | Same colors, chips, tabs and type | The structure differs: the web logs one exercise at a time with steppers, and iOS shows a list. That is earlier slices' design, not this slice. Web page titles glow slightly; iOS's don't. |
| Library | Close | The web has Workouts and Programs tabs; iOS has Workouts only (programs are under Training). |
| Progress | Close: report card, Records and Lifts tabs, PR chips | The web's Records tab has a count badge ("12"). The week navigator reads "Week of Nov 2" on the web and "This week" on iOS (earlier slices). |
| Settings | Close: the same blocks, rows, segmented choices and switches | The web picker shows light and dark previews of each theme, plus "Light only". iOS shows one swatch in the current mode. The web puts the weekly target inside Workouts. iOS gives it a Training targets block, as the spec asks. |
| E-INK | Close, except for colors | The web turns colored text and colored borders black (`globals.css:2754`). iOS keeps the Up Next box blue, the Pinned box green, "STRENGTH BASE" blue and "+1h 30m" blue (`pairs-eink.png`). This is finding 5. |

### Defects and risks
1. **The color scheme follows the mode, not the background (should fix).** See Verdict 1. Four of the 13 light modes are affected.
2. **The E-INK pick doesn't follow the web's `pickTheme` (should fix).** See Verdict 2.
3. **A theme pick resets scroll and folder-tab picks.** The rebuild (`.id(lookKey)`) puts the theme list back at the top after a pick near the bottom. That one feels wrong. Settings also jumps to the top after Mode or E-ink display while scrolled (`ios-rebuild-scroll-reset.png`). Training's Recent pick goes back to Pinned, but you're on another tab when it happens, so it's barely noticeable. Fix the theme list (scroll to the selected row on appear); leave the rest.
4. **E-ink display's "motion off" has no visible effect.** I filmed the Programs push 3 ways: baseline, E-ink display on, and iOS Reduce Motion on (I set it by tapping in the OS Settings app). The push slides the same way each time: about 0.35 to 0.47 seconds, 24 to 36 frames (`ios-motion-push-eink-and-os-reduce-motion.png`). The root `.transaction` doesn't reach UIKit's navigation push. The app has no `withAnimation` or `.animation` of its own, so nothing else is turned off either. The code path is right (`DisplayRules`, OR), but in practice nothing changes. See Needs a call.
5. **E-INK keeps colored text and colored borders.** See the table above. The 185 handback says this was left out on purpose.
6. **Inline navigation titles don't scale with text size** (small). "UPPER A", "THEME" and the sheet titles stay at 17pt at AX5 (`Theme.swift:37`, a fixed `UIFont`).
7. **Send feedback can't be checked in the simulator.** On a phone without Mail, iOS offers to restore Mail. The address is the known placeholder.

**Code read.** `Settings.swift` does what its header says. A save closes the migration window. `load()` normalizes, and the target range is checked before anything is written. Tokens come from a bundled copy, and the token tests compare it to the golden, so drift would fail the tests. No hardcoded colors, rounded shapes or system fonts are left in `ios/App` outside `Theme.swift`. The logger reads `LoggerRules`, and an effort is saved only when the picker is shown. `WorkoutView.swift` is 528 lines (it was 520 before this slice).

**Perf.**
- First launch with the fonts: 3.48 seconds on average, against 3.46 for the slice 6 build on the same simulator (`XCTApplicationLaunchMetric`, 5 runs each). The fonts add nothing measurable.
- Theme switch: 1.44 to 1.47 seconds from tap to selected, against 1.40 to 1.44 for a plain folder-tab tap. Both numbers are mostly XCUITest overhead, so the rebuild adds under about 50ms.

## Questions (answered from the files, as in 176)
1. **Did the build know the web's `pickTheme` rules?** No. 185 mentions the light-only Mode row, but not the E-ink display switch-on or the remembered mode. So it's a gap, not a decision.
2. **Was leaving out E-ink's colored-text rule deliberate?** Yes: "I didn't port the web's 'colored text turns black' rule." It still needs a call, because the E-INK pairs show the difference plainly.
3. **Was Reduce Motion checked?** Only the code path. I toggled the OS setting by real taps, and it changes nothing visible (finding 4).

## Revised review
I read `work/185-handback.md` after my first pass. Its "Not verified" list matches what I found: Reduce Motion, Mail and Safari, and perf. Its decisions (Training targets block, rebuild, bundled tokens, native tab bar) all hold up. Nothing changes my verdict: **accept after fixes 1 and 2; fix 3 recommended; two calls below.**

On the item's question about the rebuild resetting scroll and tab picks: only the theme list feels wrong. The other resets happen on tabs you aren't looking at.

## Needs a call
- **E-ink motion.** Should E-ink display (and iOS Reduce Motion) stop native pushes and sheet slides? Option A: accept native motion, and change the hint to say it only makes text bolder on iPhone. Option B: turn off UIKit animations app-wide while it's on (`UIView.setAnimationsEnabled(false)`), so pushes and sheets appear instantly, which is easier on an e-ink screen. **I recommend B**, because the switch otherwise does nothing it promises.
- **E-INK colors.** Should E-INK map colored text and colored borders to black, as the web does? Tab and button fills stay colored there too. **I recommend yes**: it's what makes E-INK read as paper on the web, and it can be done in one place (`TabTone.edge` and a few text styles).

## Outside the item (not fixed)
- In the web logger, I couldn't start a program workout from the program page with Start Workout. The click sent no request. An open draft from earlier reviews may block it. I didn't dig into it, so I'm noting it only.
- `WorkoutView.swift` is over 500 lines (it already was).

## Cleanup for Dustin
- Simulator `parity-disco-186` (`E5D3C467-6F9A-4DE0-BFBF-E31F8E268D92`), shut down: `xcrun simctl delete E5D3C467-6F9A-4DE0-BFBF-E31F8E268D92`. Its iOS Reduce Motion is set back to off, and its text size back to Large.
- Docker `fitcsv-postgres-review155` was started, then stopped again. `next dev` on 3955 is stopped. The web runs only read pages and set theme preferences in throwaway browser contexts; one run opened the existing program draft through its resume link.
- Scratch (harnesses, DerivedData `dd/` and `dd-old/`, a slice 6 copy of `ios/` in `old/`, videos, shots, Playwright scripts): `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/79a9abe2-03cb-4a79-97c9-4f587c871889/scratchpad`
- I added about 70 images to `initiatives/ios-app/handoff/slice7-assets/` (git-ignored), next to 185's. `ios/Ripit.xcodeproj` was regenerated by `ios-check` (git-ignored). Nothing committed, nothing deleted.
