# Ripit iOS slice 5: logging help

**What you need to do:** try it on your phone: re-run `scripts/ios/install.sh`, then log a workout. Overrule any of my calls below. Nothing is pushed.

## Outcome

The workout screen now has the help the web logger gives. All 10 scenarios pass when walked by real taps, and a re-check after the fixes accepted it. `mise run ios-check` passes: 181 tests, plus the simulator build.

- **Rest timer** on each exercise, starting when you log a set. It kept true time through a 2-minute device lock.
- **Workout clock**, still right after a relaunch.
- **"Last time" line** with that workout's sets and date. Tap **Use** to fill the next set.
- **RPE/RIR** with the web's presets, and the planned value offered first. Progress's effort number counts it.
- **Warm-up** toggle. Warm-ups are labelled, and left out of records and Progress.
- An **ⓘ button** on each exercise opens Info (photos, instructions, muscles, equipment), Notes (only when the plan has notes) and History (last 4 workouts, e1RM, PR, warm-ups tucked away).
- **Finish asks first.** Cancel keeps the workout going.
- At the **largest text size**, every logger screen reads without words breaking apart.

## Screens (iOS)

![Rest timer](slice5-assets/ios-rest.png) ![Last time](slice5-assets/ios-lasttime.png) ![Effort menu](slice5-assets/ios-effort-menu.png) ![Info](slice5-assets/ios-info-top.png) ![History](slice5-assets/ios-history-warmups.png) ![Finish](slice5-assets/ios-finish.png)

Largest text size: ![Logger](slice5-assets/recheck-ax-10-logger-top.png) ![Set rows](slice5-assets/recheck-ax-12-logger-set.png)

Web for comparison: ![Web rest](slice5-assets/web-c-rest8.png) ![Web last time](slice5-assets/web-lasttime.png) ![Web finish](slice5-assets/web-c-finish.png)

## Calls I made (overrule any)

1. **RPE is whole numbers only (6–10).** The web shows 6.5 and 7.5, but its database stores whole numbers, so they get cut off. The web bug is on the backlog.
2. **The RPE/RIR switch sits in the workout header** until a Settings screen exists (slice 7).
3. **No long-press menu to mark a warm-up.** It didn't work reliably; edit a set, then tap Warm-up, instead.
4. **Warm-up sets save no effort.**
5. **Effort can't be changed on a set you've already logged** yet. That comes later, with Settings.
6. **Info, Notes and History open in one sheet** from ⓘ. The web uses tabs inside the logger. iOS shows every exercise at once, so a sheet fits better.

## Not verified

- **Not on your phone yet.** The simulator was driven by real taps, but the device itself hasn't been tried.
- **VoiceOver** labels were read through the test tool; nobody listened to them with VoiceOver.

## Found along the way (on the roadmap backlog)

- At the largest text size, the program screen's title breaks mid-word ("Streng / th Block"). That's a slice 3 screen; I'll fold it into slice 7's look pass.
- Web: Start Workout does nothing, without saying why, while a freestyle workout is open.
- Seed data: Barbell Bench Press has decline-bench instructions, in both apps.

Records: `work/174`–`178` with handbacks; `features/ios-app/logging-help.feature`.
