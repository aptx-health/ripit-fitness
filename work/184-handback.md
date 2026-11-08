Report: needs decision

## Verdict
Done. The stubs, tests and the theme golden are in place. The golden is what headless Chrome resolves from `app/globals.css` after the web's own `normalizePreference` and `applyTheme`, for 13 themes × light/dark. Against a correct fake, all the tests pass, and they catch 41 of 42 single-rule breaks. Two calls are open (see Needs a call). Not committed.

## Verified
- `mise run ios-check` → 241 tests, 145 issues, **all `notImplemented`**. Every earlier test passes. (3 issues read "expected invalidTarget, got notImplemented"; that is the stub too.) I ran the app build step on its own: exit 0.
- Ran the golden generator twice: byte-identical (sha `83196ebd`).
- Against a scratch fake, all 241 tests pass. The fake caught a real trap on its first run: a save before the first load, followed by the one-time migration, wiped the save. 16 tests flagged it.
- Break matrix: targeted runs, after one full baseline. **41 of 42 killed:**
  - themes, labels, light-only and default: 4 of 5
  - tokens and colors: 8 of 8
  - motion: 3 of 3
  - defaults: 4 of 4
  - store and target: 9 of 9
  - migration: 10 of 10
  - logger: 4 of 4

  The survivor: the table skipping normalization before the lookup. It is unobservable, because the golden's E-ink dark entry already holds the light tokens.
- Changed one golden value (clyde dark `card`) → only that case failed. Restored it.
- `biome check` is clean on the generator.

## Not verified
- No Swift coverage tool was used. Not covered: Workout mode (Follow Along), the Help links and version, and Training targets. The feature doesn't name these as rules.
- Stored values the phone doesn't know (a corrupted new key) aren't tested, because the storage keys are the implementer's choice.

## Assumptions and decisions beyond the handoff
- The API is in `Sources/RipitCore/Settings.swift`, and its header lists every rule. The tokens are only in the test fixture; the implementer may bundle or generate them.
- **Migration:** `progressUnit`, else `weightUnit` (last logged), becomes the default unit. `weeklyWorkoutTarget` carries over if it is 1–14. `effortKind` carries over. If any of those 4 keys exists, tracking starts **on** (with RPE when `effortKind` is missing), because the old app always showed the picker. It runs once.
- A new set takes the unit of the previous set in that exercise, else the default unit. This keeps item 163's per-set toggle.

## Needs a call
- **A new install's mode.** The spec says RIPIT dark. The web actually follows the OS (light or dark) until you pick one, and only `DEFAULT_THEME` says dark. The tests follow the spec. I recommend keeping dark.
- **The web never reads `defaultIntensityRating`.** Its loggers show whatever the plan prescribes (ad-hoc: RPE if the plan uses RPE, else RIR). The tests follow the spec: the default type when tracking is on. I recommend keeping the spec, and letting a planned value still prefill, as it does today.

## Where to look first
- `ios/RipitCore/Sources/RipitCore/Settings.swift` (header)
- `scripts/ios/theme-tokens-goldens.ts`

## How to run
- `mise run ios-check`: right now, 145 `notImplemented` issues; when implemented, all green.
- Regenerate: `npx tsx scripts/ios/theme-tokens-goldens.ts` (needs Google Chrome, or set `CHROME=`).

## Cases
| Targets | Tests | Why |
|---|---|---|
| Themes, labels, light-only, default | 4 + 13 + 13 | Order, "SYNTHWAVE '84", E-ink only |
| Normalize, tokens, colors | 26 + 26 + 26 + 2 | Every token, exact key set, hex parse |
| Store | 17 | Defaults, each field alone, relaunch, target 0/1/14/15/-1 |
| Migration | 9 | Every legacy key, precedence, bad values, runs once |
| Logger, motion | 7 + 4 | Off/on × RPE/RIR, previous vs default unit, OR |

## Feared bugs
- Hex read in the wrong byte order (`colorBGR`).
- A token filled in that the web leaves undefined, e.g. `accent-active` on cyber (`extraToken`).
- A dark block's missing token not inheriting the light value (`doomDarkFromDotDark`, `darkUsesLight`).
- Migration re-running or losing values (`migrateEveryLoad`, `saveThenMigrate`).
- Motion uses AND instead of OR (`motionAnd`).

## Quirks for a human to mark
- Some themes don't define `accent-active` (cyber, forest, synthwave, dracula, github), so those themes don't have it on the phone either. Intended or accidental?

## Locked
- `chmod a-w` on the 3 test files and `tokens.json`. Unlock with `chmod u+w <file>`.

## Hands-on list (reviewer)
- **Settings tab:** blocks for Look, Workouts, Training targets, Help. Each change applies at once and survives a relaunch.
- **Themes:** switch all 13 live, in light and dark. E-ink offers no dark.
- **E-ink display:** motion is off and text is bolder in any theme. iOS Reduce Motion also stops motion.
- **Workouts:** tracking off hides the picker; RPE/RIR follows the setting; the switch is gone from the workout header; the Progress sheet's unit/target have moved to Settings.
- **Help:** Learn opens ripit.fit, feedback opens mail, the version shows.
- **Type:** Rajdhani, uppercase and tracked for labels, buttons, tab titles and headings; body text and numbers stay plain and readable.
- **Shapes:** square corners on cards, buttons, inputs and chips; the hard offset shadow on primary buttons; web-style folder panels.
- **Folder tabs** switch in place: Training (Up Next | Active Program, Pinned | Recent), Progress (Records | Lifts), the exercise sheet (Info | Notes | History).
- **Native:** sheets, alerts, keyboard and tab bar stay native; touch targets are at least 44pt.
- **Largest text:** no mid-word breaks, especially the program title, the superset badge, and the logger's ⓘ and ···.

## Cleanup (not deleted)
- `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/d54f3816-2aa9-4269-9f06-dbd9cd779fbb/scratchpad/fake/`: fake, stub backup, break logs.
