# Ripit iOS slice 9b: one-exercise logger

**What you need to do:** it's on your phone now. Try a workout, then accept the slice or tell me what to change. Slices 8, 9a and 9b are all waiting on you, so I've paused new work.

## Outcome

The workout screen now works like the web's logger: one exercise at a time, with a bar at the bottom.

**Checks:**
- An independent reviewer accepted it after two rounds of fixes.
- Every scenario passes by real taps, in a program workout and a freestyle one, in dark and light, at the largest text size, and in all 13 themes.
- `mise run ios-check` passes: 352 tests, plus the app build.

**What's new:**
- **One exercise at a time.** Swipe, or use ‹ ›, to move between exercises. The tabs are Log, Info, History and Notes.
- **The bar: ‹ LOG SET ›.** After the planned sets it changes to + EXTRA SET and NEXT EXERCISE, and the panel says "✓ ALL PLANNED SETS LOGGED".
- **The inputs sit at the bottom,** near your thumb, as you asked. The keypads do too, and the weight pad has a decimal key (cap 2000).
- **The Plan list (top left):** jump, reorder, swap, delete, add, and group or ungroup supersets. These change today only; your program is never changed.
- **Confirm buttons use your theme's accent:** gold in RIPIT, purple in Blossom. FINISH stays green, and Discard stays red.
- **The tab bar:** a soft, fading highlight that slides, with a light tick when you change tabs. Inactive tabs dim to 80%. E-ink shows only the underline.

## Screens

The logger and keypad in Blossom and RIPIT:

![Blossom](slice9b-assets/fix206-blossom-logger.png)
![RIPIT](slice9b-assets/fix206-ripit-logger.png)

After the planned sets, phone next to the web:

![After planned](slice9b-assets/review207-afterplanned-web-ios.png)

Dialogs in the accent:

![Dialogs](slice9b-assets/review210-dialogs.png)

The tab bar in several themes and E-ink:

![Tabs](slice9b-assets/review210-tabs.png)

Largest text:

![AX5](slice9b-assets/review210-ax5.png)

## Calls made (overrule any)

1. **Your calls during the build:**
   - The inputs sit at the bottom, and confirm buttons use the accent. Both differ from the web.
   - Inactive tabs dim to 80%.
   - The active tab has no gold line on top.
   - A lone superset ends for today.
   - Exiting with nothing logged closes without asking.
   - The Plan list takes the logger's colour.
2. **Faint themes, phone only:** Dracula, Forest light and Catppuccin light got a stronger muted-text colour so the tab labels are readable. Dracula light's secondary text is visibly lighter, and easier to read.
3. **The phone's logger header uses the web's colour (`secondary`).** With green, the green FINISH disappeared into it.
4. **Web extras not added yet:**
   - the keypad tip cards
   - the one-column RIR list with SKIP
   - the ☐ set boxes in the Plan list
   - "last:" under each planned set

## Not verified

- **Haptics:** the simulator has none, so this is your first chance to feel them.
- **VoiceOver on a real phone:** checked through labels only.
- **Test runs only, not something you'd see:** a test run sometimes waits 60 s after the exercise picker opens from the Plan list. It points to an animation that never reports done. It happened twice in many runs.

## Small leftovers (backlog)

- **Wrong instructions:** Bench Press's Info shows decline-bench instructions. This is catalog data.
- **History count:** History counts an added exercise that has no sets.
- **AX5 text:** at the largest text, "RESTING" breaks mid-word.
- **Hidden set row:** at default size, a set row can sit half-hidden behind the inputs.

Records: `initiatives/ios-app/work/203`–`210` with their handbacks; `features/ios-app/one-exercise-logger.feature`.
