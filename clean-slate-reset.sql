-- ============================================================================
-- CLEAN SLATE RESET: Delete old program data and variant exercises
-- ============================================================================
--
-- WARNING: This is DESTRUCTIVE and will delete:
-- - All your programs, weeks, workouts, exercises, and logged sets
-- - 19 variant ExerciseDefinitions that conflict with the clean library
--
-- After running this, you'll re-run the exercise library seed for a fresh start.
-- ============================================================================

-- ============================================================================
-- STEP 1: PREVIEW - See what will be deleted (RUN THIS FIRST!)
-- ============================================================================

-- Preview: Your programs that will be deleted
SELECT
  id,
  name,
  description,
  "isActive",
  "createdAt"
FROM "Program"
WHERE "userId" = (SELECT id::text FROM auth.users LIMIT 1);
-- ⬆️ If you have multiple users, replace (SELECT id::text FROM auth.users LIMIT 1) with 'your-user-id'

-- Preview: Count of related data that will be cascade deleted
SELECT
  (SELECT COUNT(*) FROM "Program" WHERE "userId" = (SELECT id::text FROM auth.users LIMIT 1)) as programs,
  (SELECT COUNT(*) FROM "Week" w
   JOIN "Program" p ON w."programId" = p.id
   WHERE p."userId" = (SELECT id::text FROM auth.users LIMIT 1)) as weeks,
  (SELECT COUNT(*) FROM "Workout" wo
   JOIN "Week" w ON wo."weekId" = w.id
   JOIN "Program" p ON w."programId" = p.id
   WHERE p."userId" = (SELECT id::text FROM auth.users LIMIT 1)) as workouts,
  (SELECT COUNT(*) FROM "Exercise" e
   JOIN "Workout" wo ON e."workoutId" = wo.id
   JOIN "Week" w ON wo."weekId" = w.id
   JOIN "Program" p ON w."programId" = p.id
   WHERE p."userId" = (SELECT id::text FROM auth.users LIMIT 1)) as exercises,
  (SELECT COUNT(*) FROM "LoggedSet" ls
   JOIN "WorkoutCompletion" wc ON ls."completionId" = wc.id
   WHERE wc."userId" = (SELECT id::text FROM auth.users LIMIT 1)) as logged_sets;

-- Preview: The 19 variant exercises that will be deleted
SELECT
  id,
  name,
  "normalizedName",
  "isSystem"
FROM "ExerciseDefinition"
WHERE "normalizedName" IN (
  'overhead cable triceps extension (bar)',
  'biceps pushdown (bar)',
  'cable reverse fly',
  'cable lateral y-raise',
  'low incline smith machine press',
  'incline db curl',
  'overhead barbell triceps extension',
  'cross-body lat pullaround (kneeling)',
  'cable paused shrug-in',
  'lying paused rope face pull',
  'neutral-grip lat pulldown',
  'seated db shoulder press',
  'hammer preacher curl',
  'cable reverse flye',
  'machine hip adduction',
  'paused assisted dip',
  'bent-over cable pec flye',
  'chest press machine',
  'bottom 2/3 constant tension preacher curl'
)
ORDER BY name;

-- ============================================================================
-- STEP 2: DELETE - Run these only after reviewing the previews above
-- ============================================================================

-- Delete all programs for your user (cascades to weeks, workouts, exercises, sets)
DELETE FROM "Program"
WHERE "userId" = (SELECT id::text FROM auth.users LIMIT 1);
-- ⬆️ If you have multiple users, replace (SELECT id::text FROM auth.users LIMIT 1) with 'your-user-id'

-- Delete workout completions and logged sets for your user
DELETE FROM "WorkoutCompletion"
WHERE "userId" = (SELECT id::text FROM auth.users LIMIT 1);
-- ⬆️ If you have multiple users, replace (SELECT id::text FROM auth.users LIMIT 1) with 'your-user-id'

-- Delete the 19 variant ExerciseDefinitions
DELETE FROM "ExerciseDefinition"
WHERE "normalizedName" IN (
  'overhead cable triceps extension (bar)',
  'biceps pushdown (bar)',
  'cable reverse fly',
  'cable lateral y-raise',
  'low incline smith machine press',
  'incline db curl',
  'overhead barbell triceps extension',
  'cross-body lat pullaround (kneeling)',
  'cable paused shrug-in',
  'lying paused rope face pull',
  'neutral-grip lat pulldown',
  'seated db shoulder press',
  'hammer preacher curl',
  'cable reverse flye',
  'machine hip adduction',
  'paused assisted dip',
  'bent-over cable pec flye',
  'chest press machine',
  'bottom 2/3 constant tension preacher curl'
);

-- ============================================================================
-- STEP 3: VERIFY - Confirm the deletions
-- ============================================================================

-- Should return 0 programs
SELECT COUNT(*) as remaining_programs
FROM "Program"
WHERE "userId" = (SELECT id::text FROM auth.users LIMIT 1);

-- Should return 0 workout completions
SELECT COUNT(*) as remaining_completions
FROM "WorkoutCompletion"
WHERE "userId" = (SELECT id::text FROM auth.users LIMIT 1);

-- Should return 0 (or much fewer) ExerciseDefinitions
SELECT COUNT(*) as remaining_exercises
FROM "ExerciseDefinition"
WHERE "normalizedName" IN (
  'overhead cable triceps extension (bar)',
  'biceps pushdown (bar)',
  'cable reverse fly',
  'cable lateral y-raise',
  'low incline smith machine press',
  'incline db curl',
  'overhead barbell triceps extension',
  'cross-body lat pullaround (kneeling)',
  'cable paused shrug-in',
  'lying paused rope face pull',
  'neutral-grip lat pulldown',
  'seated db shoulder press',
  'hammer preacher curl',
  'cable reverse flye',
  'machine hip adduction',
  'paused assisted dip',
  'bent-over cable pec flye',
  'chest press machine',
  'bottom 2/3 constant tension preacher curl'
);

-- Total ExerciseDefinitions remaining (should be around 115 if starting from 134)
SELECT COUNT(*) as total_exercise_definitions
FROM "ExerciseDefinition";

-- ============================================================================
-- STEP 4: RESEED - After verification, run the exercise library seed
-- ============================================================================
--
-- Now run: prisma/exercise-library-seed.sql
--
-- This will give you a clean 75-exercise library with proper FAUs and equipment.
-- ============================================================================
