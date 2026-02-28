-- Add partial unique index to prevent multiple active completions for the same workout/user
-- This is a safety net to prevent bugs like having both a 'completed' and 'draft' completion
-- Archived completions (from program restarts) are excluded from this constraint

-- First, clean up existing duplicates before adding the constraint
-- Strategy: If a 'completed' exists, archive any 'draft' duplicates
-- If only drafts exist, keep the most recent one and archive others

-- Archive draft completions where a completed completion already exists for the same workout/user
UPDATE "WorkoutCompletion" AS draft
SET "isArchived" = true
WHERE draft."isArchived" = false
  AND draft.status = 'draft'
  AND EXISTS (
    SELECT 1 FROM "WorkoutCompletion" AS completed
    WHERE completed."workoutId" = draft."workoutId"
      AND completed."userId" = draft."userId"
      AND completed.status = 'completed'
      AND completed."isArchived" = false
      AND completed.id != draft.id
  );

-- For remaining duplicates (multiple drafts or multiple completed), keep the most recent one
-- Archive all but the one with the latest completedAt
UPDATE "WorkoutCompletion" AS dup
SET "isArchived" = true
WHERE dup."isArchived" = false
  AND EXISTS (
    SELECT 1 FROM "WorkoutCompletion" AS newer
    WHERE newer."workoutId" = dup."workoutId"
      AND newer."userId" = dup."userId"
      AND newer."isArchived" = false
      AND newer.id != dup.id
      AND newer."completedAt" > dup."completedAt"
  );

-- Now create the unique index
CREATE UNIQUE INDEX workout_completion_unique_active
ON "WorkoutCompletion" ("workoutId", "userId")
WHERE "isArchived" = false;

-- Add a comment explaining the constraint
COMMENT ON INDEX workout_completion_unique_active IS
'Ensures only one non-archived completion exists per workout per user. Archived completions from program restarts are allowed to coexist.';
