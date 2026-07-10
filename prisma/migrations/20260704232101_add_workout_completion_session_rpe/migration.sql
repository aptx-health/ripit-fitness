-- Add session-level effort rating (RPE-equivalent 6-10) to WorkoutCompletion
ALTER TABLE "WorkoutCompletion" ADD COLUMN "sessionRpe" INTEGER;
