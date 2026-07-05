-- Add persisted session duration to WorkoutCompletion (#933)
ALTER TABLE "WorkoutCompletion" ADD COLUMN "durationSeconds" INTEGER;
