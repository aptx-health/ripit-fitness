# Ripit iOS slice 7: Settings and the web's look

**What you need to do:** install with `scripts/ios/install.sh` and look around: switch a few themes in Settings, then log a workout. Then review slices 5–7 (links at the bottom). I've paused new work until you have. Nothing is pushed.

## Outcome

iOS now looks close to the web on every screen. The independent reviewer compared both side by side at phone width in RIPIT dark and light, DRACULA, and E-INK. Every scenario passes by real taps, and a re-check accepted the fixes. `mise run ios-check` passes: 241 tests, plus the simulator build.

- **Settings tab:** Look, Workouts, Training targets and Help. Every change saves at once and survives a relaunch.
- **All 13 web themes, in light and dark.** Tests check that the colors equal what the web shows, byte for byte. The status bar follows the theme, so DOOM, CYBER, SYNTHWAVE '84 and DRACULA stay dark in "light" mode, as on the web.
- **E-INK theme** with black text and borders, like the web. The E-ink display switch makes text bolder (no motion work, as you asked).
- **Workout settings:** effort tracking on or off, RPE or RIR, default unit, weekly target. The RPE/RIR switch has left the workout header, and the Progress sheet is gone.
- **The web's look:**
  - Rajdhani everywhere, uppercase and tracked for labels and buttons
  - square corners and hard offset shadows on primary buttons
  - folder tabs that switch in place: Training (Up next | Active program, Pinned | Recent), Progress (Records | Lifts), the exercise sheet (Info | Notes | History)
- **Native where it matters:** sheets, alerts, the keyboard and the tab bar.
- **Largest text size** is clean on every screen, including the old program-title and superset-badge problems.

## Side by side (web, then iOS)

![RIPIT dark](slice7-assets/pairs-ripit-dark.png)

![RIPIT light](slice7-assets/pairs-ripit-light.png)

![DRACULA dark](slice7-assets/pairs-dracula-dark.png)

![E-INK](slice7-assets/ios187-fix4-eink-vs-web.png)

![Logger](slice7-assets/pairs-logger.png)

![Dark themes in light mode](slice7-assets/ios187-fix1-dark-themes-light-mode.png)

## Calls I made (overrule any)

1. **A new install starts RIPIT dark.** The web follows the phone's setting until you pick one.
2. **Settings' RPE/RIR choice drives new sets.** The web stores this setting but never reads it. A planned RPE/RIR still fills in first.
3. **Weight unit is a Settings row on the phone only.** The web has none. Each new set still keeps the unit of the set before it.
4. **The weekly target sits in its own Training targets block** (the spec's layout). The web puts it under Workouts.
5. **Feedback goes by email** to `feedback@ripit.fit` (you confirmed).
6. **Remaining differences from the web,** all from earlier slices' design:
   - the logger shows every exercise at once
   - Library has only Workouts
   - the theme picker shows one swatch, not light and dark previews

## Not verified

- **Not on your phone yet.**
- **Send feedback opens Mail:** the simulator has no Mail.
- **E-INK:** charts and tints are still drawn in color (the web draws them solid). This is minor, and out of scope by your E-ink call.

## Waiting for your review

- Slice 5, logging help: `ios-slice5-logging-help`
- Slice 6, finish summary and saved workouts: `ios-slice6-saved-workouts`
- Slice 7, this page

Records: `work/184`–`188` with handbacks; `features/ios-app/settings-look.feature`.
