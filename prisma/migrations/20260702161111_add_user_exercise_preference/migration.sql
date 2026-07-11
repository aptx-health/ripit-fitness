-- CreateTable
CREATE TABLE "UserExercisePreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "exerciseDefinitionId" TEXT NOT NULL,
  "alpha" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "beta" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserExercisePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserExercisePreference_userId_idx" ON "UserExercisePreference"("userId");

-- CreateIndex
CREATE INDEX "UserExercisePreference_exerciseDefinitionId_idx" ON "UserExercisePreference"("exerciseDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserExercisePreference_userId_exerciseDefinitionId_key" ON "UserExercisePreference"("userId", "exerciseDefinitionId");

-- AddForeignKey
ALTER TABLE "UserExercisePreference" ADD CONSTRAINT "UserExercisePreference_exerciseDefinitionId_fkey" FOREIGN KEY ("exerciseDefinitionId") REFERENCES "ExerciseDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
