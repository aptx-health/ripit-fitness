Report: complete

# 195 handback: iOS slice 8 re-check (194's fixes)

## Verdict
**Accept.** 194 fixed both of my 191 findings and made the two extra changes, and nothing else in slice 8 broke. I found no new problems.

## Check
- `mise run ios-check` → exit 0. 263 tests in 42 suites pass, then the build succeeds.

## By real taps (simulator `ripit-review`, reused; scratch XCUITest harness, no repo edits)

| Check | Result |
|---|---|
| **Finding 1: errors wait for a try** | In dark, light and AX5, the new-exercise form opens with no errors (`recheck-*-01-open.png`). Save stays tappable. Tapping it on an invalid form shows both required errors and doesn't save (`-02-save-invalid`). Picking equipment clears that field's error at once. **Fixed** |
| **Finding 2: duplicate warning in view** | The warning now sits under the Name field. With the keyboard up it stays fully visible in dark, light and AX5 (`-03-dup-keyboard`). At AX5 it is 188 pt tall and still on screen above the keyboard. Tapping Save while it shows keeps you in the editor. **Fixed** |
| **4000 instructions limit** | 4000 characters read "4000/4000" with no error. At 4001 the counter reads "4001/4000" and the error "Instructions must be 4000 characters or less" shows. Save does nothing. Deleting one character lets it save, and reopening the exercise shows 4000/4000 (`recheck-r4-01` to `-03`, `-07`). **Pass** |
| **Imported unknown web exercise** | After a fresh install I created Zercher Carry, then imported `ripit-export-v1.json`. "Barbell Bent-Over Row" shows no MINE badge and no Edit button (`recheck-r4-04-import-bent.png`). My own Zercher Carry and the file's own custom Sled Push both still show MINE and Edit (`-05`, `-06`). The import reported "1 custom exercise" added. **Pass** |
| **Spot check: search, filters, multi-pick** | I re-ran 191's two walks. All 19 result lists are identical to 191's, and the multi-pick still adds 4 in tick order. **Pass** |

Code read: the diff does only what 194 says. The editor tracks touched fields and a `tried` flag. Save is guarded by `problems.isEmpty && !duplicate`. The limit is `CustomExerciseDraft.maxInstructions = 4000`, used for both the counter and the check. `resolveRef` now inserts with `isSystem = 1`.

## Notes (not blocking)
- **Already-imported rows aren't changed.** An unknown exercise imported before 194 keeps `isSystem = 0`: no migration, and a re-import matches it by id. This matters only if a phone imported before this fix, and the app hasn't shipped, so I'm noting it only. My earlier 191 data on `ripit-review` was reset for this check.
- **A prefilled duplicate name doesn't scroll.** The scroll-to-warning runs only when the duplicate state changes. If Create opens with a name that is already a duplicate, nothing scrolls. The warning is right under the name at the top then, so it's in view anyway.

## Cleanup for Dustin
- Simulator `ripit-review` (`0BFD652D-9ECD-47F3-BB5B-5C9C86218466`): shut down and kept.
- 17 new `recheck-*` images in `initiatives/ios-app/handoff/slice8-assets/` (git-ignored).
- Scratch: the same folder as 191, `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/9c611678-5060-43c6-b710-8440369bc735/scratchpad`. New in it: `uitest/UITests/RecheckTests.swift` and `ui-R*.log`, plus 191's logs copied to `ui-A-191.log` and `ui-B-191.log`.
- No web or Docker this time. Nothing committed, nothing deleted.
