-- CreateTable
CREATE TABLE "SavedWorkout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "sourceCompletionId" TEXT,
    "workoutData" JSONB NOT NULL,
    "exerciseCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "SavedWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedWorkout_sourceCompletionId_key" ON "SavedWorkout"("sourceCompletionId");

-- CreateIndex
CREATE INDEX "SavedWorkout_userId_lastUsedAt_idx" ON "SavedWorkout"("userId", "lastUsedAt" DESC);

-- CreateIndex
CREATE INDEX "SavedWorkout_userId_createdAt_idx" ON "SavedWorkout"("userId", "createdAt" DESC);

-- AlterTable
ALTER TABLE "WorkoutCompletion" ADD COLUMN "savedWorkoutId" TEXT;

-- CreateIndex
CREATE INDEX "WorkoutCompletion_userId_savedWorkoutId_idx" ON "WorkoutCompletion"("userId", "savedWorkoutId");
