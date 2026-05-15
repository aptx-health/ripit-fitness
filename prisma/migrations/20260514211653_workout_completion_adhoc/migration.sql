-- Ad-hoc workout support: completions can exist without a programmed Workout parent.
-- See issue #695 / #738.

ALTER TABLE "WorkoutCompletion" ALTER COLUMN "workoutId" DROP NOT NULL;
ALTER TABLE "WorkoutCompletion" ADD COLUMN "isAdHoc" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkoutCompletion" ADD COLUMN "name" TEXT;

CREATE INDEX "WorkoutCompletion_userId_isAdHoc_status_idx"
  ON "WorkoutCompletion" ("userId", "isAdHoc", "status");
