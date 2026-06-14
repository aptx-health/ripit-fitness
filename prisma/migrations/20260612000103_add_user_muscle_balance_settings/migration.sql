CREATE TABLE "UserMuscleBalanceSettings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "targets" JSONB NOT NULL,
  "lookbackWorkouts" INTEGER NOT NULL DEFAULT 8,
  "includeSecondary" BOOLEAN NOT NULL DEFAULT true,
  "secondaryWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "excludeWarmups" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserMuscleBalanceSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserMuscleBalanceSettings_userId_key" ON "UserMuscleBalanceSettings"("userId");
CREATE INDEX "UserMuscleBalanceSettings_userId_idx" ON "UserMuscleBalanceSettings"("userId");
