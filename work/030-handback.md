Report: needs decision (030 workout draft discovery). Full packet relayed to the lead 2026-10-31; key facts below.

- WorkoutCompletion status 'draft' = a live session in progress (start routes set startedAt/completedAt now; one draft per user enforced for ad-hoc and saved-start, 409 DRAFT_EXISTS). Not a plan.
- SavedWorkout (schema.prisma:207-221) is the only standalone template: name, notes, workoutData JSON (types/saved-workout.ts:10-32, sets {setNumber, reps string, rir, rpe, isWarmup}, no weight by design), exerciseCount, lastUsedAt. No program/week. WorkoutCompletion.savedWorkoutId is a plain String? (no FK).
- saved/[id]/start (app/api/workouts/saved/[id]/start/route.ts:95-129) copies the JSON into a draft completion with isOneOff Exercises + PrescribedSets.
- The ad-hoc logger never loads prescribedSets (app/(app)/training/adhoc/[completionId]/page.tsx:48-90; AdHocLoggerView.tsx:765,780), so planned sets are invisible while logging.
- SavedWorkoutDetailDialog shows only exercise names (components/features/saved-workouts/SavedWorkoutDetailDialog.tsx:23-27,143). QuickActionSheet "Pick a workout · Coming soon" is disabled (:423-428); "My saved workouts" row shows when count > 0.
- No saved-workout helper takes a tx; logic is inline in routes. lib/proposals/program.ts has a private prescribedSet zod schema (:11-19) and createProgram(tx) (:103) to model after.
- MCP SDK 1.32.1 supports annotations.readOnlyHint; ToolDescriptor (lib/mcp/tools.ts:40-44) and listTools() (:612-618) have none. 13 read tools listed.
- Dev DB wt2: 0 SavedWorkout rows.

Proposed: kinds saved_workout.create / saved_workout.update; tools propose_workout_create / propose_workout_update; reads list_saved_workouts, get_saved_workout, optional get_active_draft. Update conflict per touched field (balance pattern). Create revert deletes, refused once any completion has that savedWorkoutId. Update revert restores before if touched fields still equal applied values.

Choices: 1) land as SavedWorkout (rec); 2) UI: weight + logger shows planned sets (rec), dialog shows sets optional; 3) editing the live in-progress draft out of scope, read only (rec).

Outside the item: adhoc exercises route looks up definitions without visibleTo (app/api/workouts/adhoc/[completionId]/exercises/route.ts:71-74); programmed draft route doesn't enforce one draft per user.
