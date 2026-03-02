-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isUserCreated" BOOLEAN NOT NULL DEFAULT false,
    "programType" TEXT NOT NULL DEFAULT 'strength',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "copyStatus" TEXT DEFAULT 'ready',
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "level" TEXT,
    "durationWeeks" INTEGER,
    "durationDisplay" TEXT,
    "targetDaysPerWeek" INTEGER,
    "equipmentNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "focusAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Week" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Week_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "weekId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "aliases" TEXT[],
    "category" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "instructions" TEXT,
    "primaryFAUs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secondaryFAUs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,

    CONSTRAINT "ExerciseDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exerciseDefinitionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "exerciseGroup" TEXT,
    "workoutId" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "isOneOff" BOOLEAN NOT NULL DEFAULT false,
    "workoutCompletionId" TEXT,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescribedSet" (
    "id" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "reps" TEXT NOT NULL,
    "weight" TEXT,
    "rpe" INTEGER,
    "rir" INTEGER,
    "exerciseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PrescribedSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutCompletion" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "WorkoutCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoggedSet" (
    "id" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "weightUnit" TEXT NOT NULL DEFAULT 'lbs',
    "rpe" INTEGER,
    "rir" INTEGER,
    "exerciseId" TEXT NOT NULL,
    "completionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "LoggedSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardioProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "isUserCreated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "copyStatus" TEXT DEFAULT 'ready',
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "level" TEXT,
    "durationWeeks" INTEGER,
    "durationDisplay" TEXT,
    "targetDaysPerWeek" INTEGER,
    "equipmentNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "focusAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "CardioProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardioWeek" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "cardioProgramId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CardioWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescribedCardioSession" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetDuration" INTEGER NOT NULL,
    "intensityZone" TEXT,
    "equipment" TEXT,
    "targetHRRange" TEXT,
    "targetPowerRange" TEXT,
    "intervalStructure" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PrescribedCardioSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoggedCardioSession" (
    "id" TEXT NOT NULL,
    "prescribedSessionId" TEXT,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "name" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "avgHR" INTEGER,
    "peakHR" INTEGER,
    "avgPower" INTEGER,
    "peakPower" INTEGER,
    "distance" DOUBLE PRECISION,
    "elevationGain" INTEGER,
    "elevationLoss" INTEGER,
    "avgPace" TEXT,
    "cadence" INTEGER,
    "strokeRate" INTEGER,
    "strokeCount" INTEGER,
    "calories" INTEGER,
    "intensityZone" TEXT,
    "intervalStructure" TEXT,
    "notes" TEXT,

    CONSTRAINT "LoggedCardioSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCardioMetricPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "customMetrics" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCardioMetricPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "defaultWeightUnit" TEXT NOT NULL DEFAULT 'lbs',
    "defaultIntensityRating" TEXT NOT NULL DEFAULT 'rpe',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "programType" TEXT NOT NULL DEFAULT 'strength',
    "authorUserId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalProgramId" TEXT NOT NULL,
    "programData" JSONB NOT NULL,
    "weekCount" INTEGER NOT NULL,
    "workoutCount" INTEGER NOT NULL,
    "exerciseCount" INTEGER NOT NULL,
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "level" TEXT,
    "durationWeeks" INTEGER,
    "durationDisplay" TEXT,
    "targetDaysPerWeek" INTEGER,
    "equipmentNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "focusAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "community_programs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Program_userId_isActive_idx" ON "Program"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Program_userId_idx" ON "Program"("userId");

-- CreateIndex
CREATE INDEX "Program_userId_isUserCreated_idx" ON "Program"("userId", "isUserCreated");

-- CreateIndex
CREATE INDEX "Program_userId_isArchived_idx" ON "Program"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "Week_programId_idx" ON "Week"("programId");

-- CreateIndex
CREATE INDEX "Week_userId_idx" ON "Week"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Week_programId_weekNumber_key" ON "Week"("programId", "weekNumber");

-- CreateIndex
CREATE INDEX "Workout_weekId_idx" ON "Workout"("weekId");

-- CreateIndex
CREATE INDEX "Workout_userId_idx" ON "Workout"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Workout_weekId_dayNumber_key" ON "Workout"("weekId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseDefinition_normalizedName_key" ON "ExerciseDefinition"("normalizedName");

-- CreateIndex
CREATE INDEX "ExerciseDefinition_normalizedName_idx" ON "ExerciseDefinition"("normalizedName");

-- CreateIndex
CREATE INDEX "ExerciseDefinition_isSystem_idx" ON "ExerciseDefinition"("isSystem");

-- CreateIndex
CREATE INDEX "ExerciseDefinition_createdBy_idx" ON "ExerciseDefinition"("createdBy");

-- CreateIndex
CREATE INDEX "ExerciseDefinition_primaryFAUs_idx" ON "ExerciseDefinition"("primaryFAUs");

-- CreateIndex
CREATE INDEX "ExerciseDefinition_userId_idx" ON "ExerciseDefinition"("userId");

-- CreateIndex
CREATE INDEX "Exercise_workoutId_idx" ON "Exercise"("workoutId");

-- CreateIndex
CREATE INDEX "Exercise_exerciseDefinitionId_idx" ON "Exercise"("exerciseDefinitionId");

-- CreateIndex
CREATE INDEX "Exercise_userId_idx" ON "Exercise"("userId");

-- CreateIndex
CREATE INDEX "Exercise_exerciseDefinitionId_userId_idx" ON "Exercise"("exerciseDefinitionId", "userId");

-- CreateIndex
CREATE INDEX "Exercise_workoutCompletionId_idx" ON "Exercise"("workoutCompletionId");

-- CreateIndex
CREATE INDEX "PrescribedSet_exerciseId_idx" ON "PrescribedSet"("exerciseId");

-- CreateIndex
CREATE INDEX "PrescribedSet_userId_idx" ON "PrescribedSet"("userId");

-- CreateIndex
CREATE INDEX "WorkoutCompletion_workoutId_userId_idx" ON "WorkoutCompletion"("workoutId", "userId");

-- CreateIndex
CREATE INDEX "WorkoutCompletion_userId_completedAt_idx" ON "WorkoutCompletion"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "WorkoutCompletion_userId_status_completedAt_idx" ON "WorkoutCompletion"("userId", "status", "completedAt");

-- CreateIndex
CREATE INDEX "LoggedSet_exerciseId_idx" ON "LoggedSet"("exerciseId");

-- CreateIndex
CREATE INDEX "LoggedSet_completionId_idx" ON "LoggedSet"("completionId");

-- CreateIndex
CREATE INDEX "LoggedSet_userId_idx" ON "LoggedSet"("userId");

-- CreateIndex
CREATE INDEX "LoggedSet_completionId_exerciseId_idx" ON "LoggedSet"("completionId", "exerciseId");

-- CreateIndex
CREATE INDEX "CardioProgram_userId_isActive_idx" ON "CardioProgram"("userId", "isActive");

-- CreateIndex
CREATE INDEX "CardioProgram_userId_isArchived_idx" ON "CardioProgram"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "CardioWeek_cardioProgramId_idx" ON "CardioWeek"("cardioProgramId");

-- CreateIndex
CREATE INDEX "CardioWeek_userId_idx" ON "CardioWeek"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CardioWeek_cardioProgramId_weekNumber_key" ON "CardioWeek"("cardioProgramId", "weekNumber");

-- CreateIndex
CREATE INDEX "PrescribedCardioSession_weekId_idx" ON "PrescribedCardioSession"("weekId");

-- CreateIndex
CREATE INDEX "PrescribedCardioSession_userId_idx" ON "PrescribedCardioSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PrescribedCardioSession_weekId_dayNumber_key" ON "PrescribedCardioSession"("weekId", "dayNumber");

-- CreateIndex
CREATE INDEX "LoggedCardioSession_prescribedSessionId_idx" ON "LoggedCardioSession"("prescribedSessionId");

-- CreateIndex
CREATE INDEX "LoggedCardioSession_userId_completedAt_idx" ON "LoggedCardioSession"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "LoggedCardioSession_userId_status_completedAt_idx" ON "LoggedCardioSession"("userId", "status", "completedAt");

-- CreateIndex
CREATE INDEX "LoggedCardioSession_prescribedSessionId_userId_completedAt_idx" ON "LoggedCardioSession"("prescribedSessionId", "userId", "completedAt");

-- CreateIndex
CREATE INDEX "UserCardioMetricPreferences_userId_idx" ON "UserCardioMetricPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCardioMetricPreferences_userId_equipment_key" ON "UserCardioMetricPreferences"("userId", "equipment");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "UserSettings_userId_idx" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "community_programs_original_program_id_key" ON "CommunityProgram"("originalProgramId");

-- CreateIndex
CREATE INDEX "CommunityProgram_programType_idx" ON "CommunityProgram"("programType");

-- CreateIndex
CREATE INDEX "CommunityProgram_publishedAt_idx" ON "CommunityProgram"("publishedAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityProgram_authorUserId_idx" ON "CommunityProgram"("authorUserId");

-- CreateIndex
CREATE INDEX "CommunityProgram_originalProgramId_idx" ON "CommunityProgram"("originalProgramId");

-- CreateIndex
CREATE INDEX "CommunityProgram_level_idx" ON "CommunityProgram"("level");

-- CreateIndex
CREATE INDEX "CommunityProgram_goals_idx" ON "CommunityProgram" USING GIN ("goals");

-- CreateIndex
CREATE INDEX "CommunityProgram_equipmentNeeded_idx" ON "CommunityProgram" USING GIN ("equipmentNeeded");

-- CreateIndex
CREATE INDEX "CommunityProgram_programType_publishedAt_idx" ON "CommunityProgram"("programType", "publishedAt" DESC);

-- AddForeignKey
ALTER TABLE "Week" ADD CONSTRAINT "Week_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_exerciseDefinitionId_fkey" FOREIGN KEY ("exerciseDefinitionId") REFERENCES "ExerciseDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_workoutCompletionId_fkey" FOREIGN KEY ("workoutCompletionId") REFERENCES "WorkoutCompletion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescribedSet" ADD CONSTRAINT "PrescribedSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutCompletion" ADD CONSTRAINT "WorkoutCompletion_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoggedSet" ADD CONSTRAINT "LoggedSet_completionId_fkey" FOREIGN KEY ("completionId") REFERENCES "WorkoutCompletion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoggedSet" ADD CONSTRAINT "LoggedSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioWeek" ADD CONSTRAINT "CardioWeek_cardioProgramId_fkey" FOREIGN KEY ("cardioProgramId") REFERENCES "CardioProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescribedCardioSession" ADD CONSTRAINT "PrescribedCardioSession_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "CardioWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoggedCardioSession" ADD CONSTRAINT "LoggedCardioSession_prescribedSessionId_fkey" FOREIGN KEY ("prescribedSessionId") REFERENCES "PrescribedCardioSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

