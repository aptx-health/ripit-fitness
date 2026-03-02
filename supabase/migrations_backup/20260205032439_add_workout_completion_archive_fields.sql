-- AlterTable
ALTER TABLE "WorkoutCompletion" ADD COLUMN     "cycleNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "WorkoutCompletion_userId_isArchived_idx" ON "WorkoutCompletion"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "WorkoutCompletion_workoutId_userId_isArchived_idx" ON "WorkoutCompletion"("workoutId", "userId", "isArchived");

