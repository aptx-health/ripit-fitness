Report: needs decision

# 192 hand-back: smart picker discovery

**Note:** `initiatives/ios-app/smart-picker-discovery.md`
**Screenshots (23, phone width):** `initiatives/ios-app/handoff/smart-picker-assets/`

**Summary:** the web's sorts (A–Z, Neglected, Recovery) and the Anchors view appear only in the freestyle "Add exercise" picker. They reorder the muscle-group drop-down, never the exercise list. Swap, the program builder and program-logger pickers are plain. All the maths is pure and portable. The phone has every input except target movements (not in the export) and the aggregates data that Recovery's heavy and comeback terms use.

## Proposed slices
- **A, Smart picker (M):** A–Z, Neglected (with "+N planned"), Recovery (heavy and comeback terms off) and Anchors in the logger's add picker. Also import `balanceSettings`, and add Settings › Target movements (6 patterns, up to 5 each, using slice 8's multi-pick).
- **B, Muscle balance settings (M):** 18 ratios, secondary credit, ignore warmups, live preview, reset. Reuses A's snapshot port.
- Both depend on slice 8's sheet and multi-pick. Each scenario is in the note in plain English, ready for a `.feature`.

## Needs Dustin (details and recommendations in the note)
1. The web's "Completed workouts" balance field does nothing. The window is really `lookbackDays`, 14 days, and it has no control. Recommend: phone fixes the window at 14 days; file a web bug.
2. Recovery's heavy and comeback terms need the web's aggregates job. Recommend leaving them off, which is the web's own cold-start behavior.
3. Target movements aren't in the export. Recommend setting them on the phone only for now.
4. The Equipment checklist only feeds web suggestions, MCP and the planner, not the picker. Recommend leaving it out.

## Outside this item (not fixed)
- **Slice 8 mismatch to check:** `picker-custom.feature` "Filter by equipment" says "one or more equipment types". The web picker's equipment drop-down is single-choice (`ExerciseSearchInterface.tsx`, `FilterChoiceSheet`; seen in `web-sheet-equipment.png`). The lead may want to check that wording against 189/190.
- **Web bug candidate:** in `MuscleBalanceSettingsEditor` / `MuscleBalancePanel`, "Last X of Y completed workouts" mixes a 14-day count with an unused workout count.
- **Golden-test note:** the sheet-row logic (`fauOptions`) and `calculatePlannedFAUVolume` aren't exported. Slice A's test builder must copy them or get a small web refactor approved.
- **Environment:** `dev.sh` still fails in this worktree because `/tmp/fitcsv-overmind-wt1.sock` is held. That socket isn't mine; I didn't touch it. The workaround is in the note's "How observed" section.

## Cleanup for the lead (I didn't delete anything)
- Scratch: `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/2398943b-3d0b-42af-9089-e59e838587db/scratchpad/` (Playwright scripts, `pw/node_modules`, dev logs).
- Docker container `fitcsv-postgres-wt1`: stopped, not removed. Volume `fitcsv-pgdata-wt1` holds the local seed plus my test data for `bodybuilder@synthetic.test`: target movements, a draft freestyle workout, and a "Disco 192 builder" program. All local; staging untouched.
- Servers: `next dev` on port 3192 is stopped, and so is Postgres on 5434.
