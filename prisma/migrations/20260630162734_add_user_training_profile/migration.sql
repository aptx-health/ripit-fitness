CREATE TABLE "UserTrainingProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "goalSentences" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "weeklyIntent" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "equipmentAvailable" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "bannedExerciseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "ratioTargets" JSONB NOT NULL,
  "defaultIntensityPreference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserTrainingProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserTrainingProfile_userId_key" ON "UserTrainingProfile"("userId");
CREATE INDEX "UserTrainingProfile_userId_idx" ON "UserTrainingProfile"("userId");
