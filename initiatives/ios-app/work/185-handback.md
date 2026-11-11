Report: needs decision

## Verdict
Checks out, with adjustments. Settings, all 13 themes and the web look are in, and they switch live. 184's tests pass unchanged. One small call is open: the feedback email address (see Needs a call). Not committed.

## Verified
- `mise run ios-check` → 241 tests passed, app build OK, exit 0. 184's locked files are untouched (`tokens.json` is still read-only, and git shows no test diffs).
- **Real taps** with a scratch XCUITest walk on a fresh install (simulator `ripit-185-impl`): **24 of 24 checks pass**. They cover:
  - a new install starts on RIPIT, dark
  - Dracula, then Light, applied live
  - E-INK makes Mode read "light only"; E-ink display on
  - tracking, RPE, kg and target 4 all survive a relaunch
  - Progress shows "of 4", and its settings sheet is gone
  - a new exercise starts in kg with the RPE picker; there's no header switch; with tracking off there's no picker
  - folder tabs Recent, Active program, Lifts and History
  - the Learn and feedback links, and version 0.1 (1)
- Screenshots: 31 in `initiatives/ios-app/handoff/slice7-assets/` (git-ignored). They cover RIPIT light and dark, Dracula, GitHub light, Okabe dark and E-ink, plus the largest size (AX5) on Training, Settings, the theme list, the logger, the program page, Progress, the Library detail and the Summary.
- AX5 backlog fixed: the program title wraps between words, the superset badges grow instead of clipping, and the logger's ⓘ and ··· sit 16pt apart. AX5 also showed theme names breaking mid-word ("CATPPUCCI-N"). Fixed: they now shrink to fit one line.

## Not verified
- iOS Reduce Motion: only the code path. The root turns animations off through `DisplayRules.reducedMotion`; I didn't toggle the OS setting.
- I didn't open Mail or Safari. The simulator has no Mail, and the walk only checked that both links exist.
- I didn't run `perf-check`.

## Needs a call
- **Feedback email.** The web sends feedback through a form, and I found no address in the repo. I used `feedback@ripit.fit` (`HelpLinks.feedbackEmail`). Confirm it, or give me the real one.

## Decisions beyond the handoff
- **Training targets** holds the weekly target, because the phone has none of the web's rows (muscle balance and so on). Workouts holds tracking, the rating type and the **weight unit**. The weight unit row is phone-only, because the web has no such row.
- **Live switching**: changing the look rebuilds the tab view (`.id(Look.key)`). The selected tab and each tab's navigation path are kept. Scroll position and folder-tab picks reset.
- **Tokens are bundled** as `RipitCore/Resources/theme-tokens.json`, a copy of the fixture. The token tests catch it if the copy drifts. After regenerating the fixture, copy it again (this is noted in the `Settings.swift` header).
- **Rajdhani everywhere**, as on the web: Medium for body text, SemiBold and Bold for display text. It's scaled ×1.12 to read like SF, and it follows Dynamic Type. E-ink display moves each weight one step bolder.
- **Native parts stay native**: the iOS 26 glass tab bar keeps SF, and so do the system bar buttons (Done, Cancel). Sheets, alerts and the keyboard are untouched.
- E-ink theme: no shadows, 2pt lines, a border on filled buttons. I didn't port the web's "colored text turns black" rule.
- `-demoSettingsTab`, `-demoThemePicker` and `-demoTab` added to DebugHooks.

## Where to look first
- `ios/App/Theme.swift`: `Look`, `Palette`, fonts, `FolderTabs`, buttons.
- `ios/App/RipitApp.swift`: the rebuild, color scheme and motion.
- `ios/App/WorkoutView.swift`: the logger uses `LoggerRules`.

## Files changed
- `RipitCore/.../Settings.swift`: the 184 API filled in. Also `Package.swift`, `Resources/theme-tokens.json`.
- `App/SettingsView.swift` (new): the model, the four blocks, the theme list.
- `App/Fonts/` (new): Rajdhani Medium, SemiBold, Bold and `OFL.txt`. Also `project.yml` and `Info.plist` (UIAppFonts).
- `App/Theme.swift`, `RipitApp.swift`, `TrainingView`, `ProgressTabView`, `LiftPageView`, `ExerciseHelpSheet`, `WorkoutView`, `LoggingHelpViews`, `ProgramViews`, `LibraryView`, and fonts and corners in the rest.

## Cleanup (not deleted)
- Simulator `ripit-185-impl`.
- Scratchpad `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/690bd726-172a-46d9-a380-7c6304e3b4c4/scratchpad/`: the UI walk, shots and Rajdhani-Regular.ttf.
