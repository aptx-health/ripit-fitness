-- DropIndex
DROP INDEX "CardioWeek_program_user_weekNum_idx";

-- DropIndex
DROP INDEX "LoggedCardioSession_prescribed_user_status_idx";

-- DropIndex
DROP INDEX "Week_program_user_weekNum_idx";

-- DropIndex
DROP INDEX "WorkoutCompletion_workout_user_status_idx";

-- CreateTable
CREATE TABLE "ExercisePerformanceLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "exerciseDefinitionId" TEXT,
    "equipment" TEXT,
    "exerciseName" TEXT NOT NULL,
    "totalSets" INTEGER,
    "totalReps" INTEGER,
    "totalVolumeLbs" DOUBLE PRECISION,
    "maxWeightLbs" DOUBLE PRECISION,
    "estimated1RMLbs" DOUBLE PRECISION,
    "avgRPE" DOUBLE PRECISION,
    "distance" DOUBLE PRECISION,
    "distanceUnit" TEXT,
    "duration" INTEGER,
    "avgPaceSeconds" INTEGER,
    "workoutCompletionId" TEXT,
    "cardioSessionId" TEXT,

    CONSTRAINT "ExercisePerformanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExercisePerformanceLog_userId_completedAt_idx" ON "ExercisePerformanceLog"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "ExercisePerformanceLog_userId_exerciseDefinitionId_complete_idx" ON "ExercisePerformanceLog"("userId", "exerciseDefinitionId", "completedAt");

-- CreateIndex
CREATE INDEX "ExercisePerformanceLog_userId_equipment_completedAt_idx" ON "ExercisePerformanceLog"("userId", "equipment", "completedAt");

-- CreateIndex
CREATE INDEX "ExercisePerformanceLog_userId_type_completedAt_idx" ON "ExercisePerformanceLog"("userId", "type", "completedAt");

