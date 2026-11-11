# Ripit iOS slice 9a: the web's bottom bar and quick actions

**What you need to do:** it's on your phone now. Tap around the new bar and the Workout button, and tell me what feels off. The one-exercise logger (9b) is next and is being built now. Nothing is pushed.

## Outcome

The phone's navigation now matches the web's.
- **Review:** an independent reviewer accepted it after one fix round. Every scenario passes by real taps, on iOS 27 and iOS 18.
- **Check:** `mise run ios-check` passes: 286 tests, plus the simulator build.

What's new:
- **The web's bar:** Training · Library · a raised **Workout** button · Progress · Settings. The active tab has the accent colour and the gold underline. The bar is solid and reaches the bottom edge, and every list scrolls clear of it.
- **Quick Actions** (the Workout button):
  - With no workout open: Continue your program (Week · Day · name), Freestyle workout, and My saved workouts.
  - With a workout open: only Resume, plus a discard that needs a second tap within 4 seconds. The button pulses while a workout is open, but not with E-ink or Reduce Motion on.
- **History** has no tab of its own any more. It lives under Training › Recent › See all, with the import button.
- **Programs** live under Library (Workouts | Programs).
- **Training** lost its Programs and Ad-hoc buttons, as you asked.
- **Each tab keeps its place,** and tapping the active tab takes you back to its first screen. After a workout you land on Training.

## Side by side (web, then iOS)

![Bar](slice9-assets/review9a-pairs-bar-light.png)

![Quick actions](slice9-assets/review9a-pairs-qa.png)

![Quick actions, workout open](slice9-assets/review9a-pairs-qa-draft.png)

![Tabs](slice9-assets/review9a-pairs-tabs.png)

List ends clear the bar (dark, then largest text):

![Ends](slice9-assets/recheck9a-ends-dark.png)

![Ends at largest text](slice9-assets/recheck9a-ends-dark-ax5.png)

## Calls made (overrule any)

1. **The bar hides while the keyboard is up,** as Apple's does. The web's bar stays put under the keyboard.
2. **Training always shows Pinned | Recent,** even when empty, so History and import can always be reached. The web hides it when it's empty.
3. **No "Browse" under Library › Programs.** The phone has no community programs.
4. **Training keeps its In progress card,** as the spec asks. The web has none.

## Not verified

- **The long-press large label on a tab,** at the largest text size, couldn't be captured in the simulator. Try it on your phone.
- **VoiceOver itself:** checked through the accessibility tree only.

## Small leftovers (backlog)

- At the largest text size, the Progress chart's week labels squash into "…".
- Library's empty Workouts screen still offers "Start an ad-hoc workout".
- A freestyle workout is "Open Workout" in Recent but "Ad-hoc workout" in History. This predates 9a.

Records: `initiatives/ios-app/work/196`–`202` with handbacks; `features/ios-app/nav-shell.feature`; discovery in `initiatives/ios-app/logger-nav-discovery.md`.
