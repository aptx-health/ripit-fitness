-- Suggest Workout precomputed training-state layer (issue #919).
-- Adds the UserTrainingAggregates table and the ExerciseDefinition.isBodyweight
-- flag (backfilled from equipment) per docs/SUGGEST_PAYLOAD_SPEC.md.

-- ExerciseDefinition: bodyweight flag (weights excluded from calibration EWMAs)
ALTER TABLE "ExerciseDefinition" ADD COLUMN "isBodyweight" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: any exercise whose equipment list includes "bodyweight" is bodyweight-loaded.
UPDATE "ExerciseDefinition" SET "isBodyweight" = true WHERE 'bodyweight' = ANY("equipment");

-- UserTrainingAggregates: one row per user, refreshed by the recompute job.
CREATE TABLE "UserTrainingAggregates" (
    "userId" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,
    "sessionsLast7d" INTEGER NOT NULL,
    "daysSinceAnySession" INTEGER,
    "lastSessionAt" TIMESTAMP(3),
    "firstSessionAt" TIMESTAMP(3),
    "qualifyingSessionsTotal" INTEGER NOT NULL DEFAULT 0,
    "totalWeeklySetsBaseline" DOUBLE PRECISION,
    "acuteChronicRatio" DOUBLE PRECISION,
    "detrainingGapDays" INTEGER,
    "dataMaturity" TEXT NOT NULL,
    "perFau" JSONB NOT NULL,
    "perMovementCalibration" JSONB NOT NULL,

    CONSTRAINT "UserTrainingAggregates_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "UserTrainingAggregates_computedAt_idx" ON "UserTrainingAggregates"("computedAt");
