# ripit-export v1

One JSON file holding one user's training data. The web app writes it
(`GET /api/me/export`, Settings → Account → Download my data) and the iOS app
imports it. It also suits "bring your own agent" scripts.

- Builder: `lib/export/ripit-export.ts` (`buildRipitExport`).
- Example: `docs/fixtures/ripit-export-v1.json`, written by the builder from a
  test database (`WRITE_EXPORT_FIXTURE=1 npm run test:run -- ripit-export`).
- Filename: `ripit-export-YYYY-MM-DD.json` (the UTC date of `exportedAt`).

## Rules

- Field names and ids are the Prisma ones (`prisma/schema.prisma`), unchanged.
  Every scalar column of an exported row is present, nulls included.
- Dates are ISO 8601 strings in UTC (`2026-11-07T18:04:05.123Z`).
- Every row belongs to the exporting user. Nothing from another user is
  included, except the id and name of an exercise they reference (below).
- Plan and reality stay apart: `PrescribedSet` rows hang off exercises,
  `LoggedSet` rows hang off workout completions. Neither is derived from the other.
- `LoggedSet.weight` is a number and `weightUnit` is `"lbs"` or `"kg"`; nothing is
  converted. `PrescribedSet.weight` is free text (`"135lbs"`, `"65%"`, `"RPE 8"`).
- A reader must refuse a file whose `format` is not `"ripit-export"` or whose
  `version` it does not know. Later versions may add keys; v1 readers ignore
  keys they don't know.
- Arrays are in a stable order (below); a reader shouldn't rely on it for meaning.

## Top level

| Key | Type | What |
|---|---|---|
| `format` | `"ripit-export"` | Always this string. |
| `version` | `1` | Format version. |
| `exportedAt` | ISO string | When the file was built. |
| `userId` | string | The exporting user's id. |
| `settings` | UserSettings or `null` | `UserSettings` row; `null` if the user never saved settings. |
| `balanceSettings` | UserMuscleBalanceSettings or `null` | Muscle-balance targets (`targets` is the stored JSON). |
| `customExercises` | ExerciseDefinition[] | The user's own exercises (`isSystem: false`, `userId` = the user), every column. By `name`. |
| `exerciseRefs` | `{ id, name }[]` | Every other exercise definition the file mentions (system exercises, by id plus name; never copied). By `name`. |
| `programs` | Program[] | Every `Program` row, active, archived and soft-deleted (`deletedAt` set) included, nested below. Soft-deleted ones are kept because past sessions point at their workouts. By `createdAt`. |
| `workoutCompletions` | WorkoutCompletion[] | Every session: finished, abandoned, in progress, archived, program-linked and ad-hoc. By `completedAt`. |
| `savedWorkouts` | SavedWorkout[] | Saved workout templates. `workoutData` is the stored JSON snapshot (see `types/saved-workout.ts`). By `createdAt`. |
| `pinnedExercises` | PinnedExercise[] | Lifts pinned on Progress. By `position`. |

Every `exerciseDefinitionId` anywhere in the file (exercises, saved workout
snapshots, pinned exercises) resolves to an entry in `customExercises` or
`exerciseRefs`. Each `Exercise` row also carries its own `name`.

## Programs

```
Program
  weeks: Week[]                     by weekNumber
    workouts: Workout[]             by dayNumber
      exercises: Exercise[]         by order
        prescribedSets: PrescribedSet[]   by setNumber
```

- Only one program has `isActive: true` (at most).
- Supersets and circuits: exercises in one workout that share a non-null
  `exerciseGroup` value (for example `"A"`) are done together, in `order`.
- `Exercise.workoutId` is the parent workout; `workoutCompletionId` is null and
  `isOneOff` is false for program exercises.

## Workout completions

Each completion has the row's columns plus:

- `exercises: Exercise[]` (by `order`): exercises that belong to this session
  only, each with `prescribedSets` (by `setNumber`). For an ad-hoc session
  (`isAdHoc: true`, `workoutId` null) these are all its exercises. A
  program-linked session lists here only exercises added during the session
  (`isOneOff: true`); its planned exercises are under `programs`.
- `loggedSets: LoggedSet[]` (by the exercise's `order`, then `setNumber`): what
  was actually done. `LoggedSet.exerciseId` points either at an exercise in
  this completion's `exercises`, or at an exercise of the workout named by
  `workoutId` under `programs`.

`status` is `"completed"`, `"abandoned"` or `"draft"` (in progress).
`cycleNumber` counts repeats of a program workout. `savedWorkoutId` is set when
the session was started from a saved workout.

## Not in v1

Cardio programs and logged cardio sessions, training profile, learned exercise
preferences, aggregates, agent tokens and proposals, coaching links, articles
and feedback.
