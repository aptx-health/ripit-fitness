Report: complete

# 188 handback: iOS slice 7 re-check after fixes (187)

## Verdict
**Accept.** Every finding from 186 that was in scope is closed, checked by real taps, and the regression pass found nothing broken. Following Dustin's answer, I didn't check E-ink motion.

## Check
- `mise run ios-check` → exit 0. All 241 tests in 39 suites pass, and the app builds.

## The fixes, by real taps
I used simulator `parity-disco-186` with the scratch XCUITest harness from 186, and new `RecheckTests`. The round trip ran on a fresh install.

| 186 finding | Result | Screenshot |
|---|---|---|
| 1. Status bar in dark-in-light themes | **Fixed.** DOOM, CYBER, SYNTHWAVE '84 and DRACULA in light mode now have a white status bar and a dark tab bar. RIPIT light has a black status bar and a light tab bar. RIPIT dark is unchanged. Switches follow the scheme (DRACULA light shows dark switches). | `recheck-sheet-color-scheme.png` |
| 2. Leaving E-INK | **Fixed.** RIPIT dark → E-INK → RIPIT lands on **Dark**. Light → E-INK → DRACULA lands on **Light**. It also works across a relaunch while on E-INK. While on E-INK, Mode reads "E-INK is light only" and is disabled. E-ink display stays off, as Dustin asked. | `recheck-sheet-eink-roundtrip.png` |
| 3. Theme list keeps its place | **Fixed.** After picking OKABE near the bottom, OKABE is still in view, and the same holds for BLOSSOM. After picking RIPIT at the top, the list shows the top. | `recheck-sheet-picker-place.png` |
| 5. E-INK black text and borders | **Fixed, and it matches the web.** Folder borders, "STRENGTH BASE", "+1h 30m", pins, check marks and outline buttons are now black. Tab, button, chip and switch fills stay colored. Compared with the web's `web-ei-*` on Training, the logger, Progress and Library. | `recheck-sheet-eink-vs-web.png` |
| 6. Inline titles at AX5 | **Fixed.** "THEME", "PROGRAMS", "UPPER A" and the sheet title grow with text size. The growth is modest: about 1.25×, from about 17pt to about 21pt, measured from glyph height. 187 reported about 1.5×. The titles still read well and fit the bar, so I'm noting the gap rather than flagging it. | `recheck-sheet-titles-default-vs-ax5.png` |
| Hint | **Done.** The hint reads "Makes text bolder for e-ink screens". | `recheck-eink-roundtrip-*.png` |

## Regression pass
- **Themes:** I checked RIPIT dark, DRACULA light, GITHUB light and E-INK on Training, the logger, Library, Progress, Settings and the exercise sheet. All were as in 186, with nothing new wrong (`recheck-sheet-regression.png`, `recheck-{rd,dl,gl,ei}-*`).
- **AX5:** I checked Training, Settings, the theme list, Programs, the logger, the superset logger, the exercise sheet and Progress, in RIPIT dark and E-INK. No words break mid-word, the superset badge still grows, and the ⓘ and ··· have room (`recheck-sheet-ax5.png`, `recheck-ax5*`).
- **Workout settings:** the logger shows the RIR picker with tracking on and lbs. Settings still has Intensity tracking, Weight unit and Weekly target. Progress reads "3 of 3".
- One harness step failed, as in 186: the sheet has no Notes tab. It shows only when there are notes, and the demo data has none.

## Small notes (not defects)
- On E-INK, chart marks and translucent tints are still drawn in color. The web draws them solid. 187 left this out on purpose, and it's outside this item.
- When no mode was saved, leaving E-INK falls back to the device's appearance. That would apply to someone who was on E-INK before this build. I didn't tap through that case, and neither did 187.
- I read `work/187-handback.md` after my checks, but before writing this packet. It changed nothing above, except that I now note the 1.25× versus 1.5× gap.

## Outside the item
- Nothing new.

## Cleanup for Dustin
- Simulator `parity-disco-186` (`E5D3C467-6F9A-4DE0-BFBF-E31F8E268D92`) is shut down, with its text size back to Large and Reduce Motion off. To delete it: `xcrun simctl delete E5D3C467-6F9A-4DE0-BFBF-E31F8E268D92`.
- The scratch harness, logs and shots are in `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/79a9abe2-03cb-4a79-97c9-4f587c871889/scratchpad`. The new test file is `uitest/UITests/RecheckTests.swift`.
- I added about 75 `recheck-*` images to `initiatives/ios-app/handoff/slice7-assets/`, a git-ignored folder.
- No code edits, nothing committed, nothing deleted.
