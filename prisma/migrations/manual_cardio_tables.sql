-- Manual Migration: Add Cardio Tables
-- Created: 2026-01-14
-- See: docs/CARDIO_DESIGN.md

-- Create CardioProgram table
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

    CONSTRAINT "CardioProgram_pkey" PRIMARY KEY ("id")
);

-- Create CardioWeek table
CREATE TABLE "CardioWeek" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "cardioProgramId" TEXT NOT NULL,

    CONSTRAINT "CardioWeek_pkey" PRIMARY KEY ("id")
);

-- Create PrescribedCardioSession table
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

    CONSTRAINT "PrescribedCardioSession_pkey" PRIMARY KEY ("id")
);

-- Create LoggedCardioSession table
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

-- Create UserCardioMetricPreferences table
CREATE TABLE "UserCardioMetricPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "customMetrics" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCardioMetricPreferences_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "CardioWeek_cardioProgramId_weekNumber_key" ON "CardioWeek"("cardioProgramId", "weekNumber");
CREATE UNIQUE INDEX "PrescribedCardioSession_weekId_dayNumber_key" ON "PrescribedCardioSession"("weekId", "dayNumber");
CREATE UNIQUE INDEX "UserCardioMetricPreferences_userId_equipment_key" ON "UserCardioMetricPreferences"("userId", "equipment");

-- Create indexes
CREATE INDEX "CardioProgram_userId_isActive_idx" ON "CardioProgram"("userId", "isActive");
CREATE INDEX "CardioProgram_userId_isArchived_idx" ON "CardioProgram"("userId", "isArchived");
CREATE INDEX "CardioWeek_cardioProgramId_idx" ON "CardioWeek"("cardioProgramId");
CREATE INDEX "PrescribedCardioSession_weekId_idx" ON "PrescribedCardioSession"("weekId");
CREATE INDEX "LoggedCardioSession_prescribedSessionId_idx" ON "LoggedCardioSession"("prescribedSessionId");
CREATE INDEX "LoggedCardioSession_userId_completedAt_idx" ON "LoggedCardioSession"("userId", "completedAt");
CREATE INDEX "UserCardioMetricPreferences_userId_idx" ON "UserCardioMetricPreferences"("userId");

-- Add foreign key constraints
ALTER TABLE "CardioWeek" ADD CONSTRAINT "CardioWeek_cardioProgramId_fkey" FOREIGN KEY ("cardioProgramId") REFERENCES "CardioProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrescribedCardioSession" ADD CONSTRAINT "PrescribedCardioSession_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "CardioWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoggedCardioSession" ADD CONSTRAINT "LoggedCardioSession_prescribedSessionId_fkey" FOREIGN KEY ("prescribedSessionId") REFERENCES "PrescribedCardioSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable Row Level Security
ALTER TABLE "CardioProgram" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CardioWeek" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrescribedCardioSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoggedCardioSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserCardioMetricPreferences" ENABLE ROW LEVEL SECURITY;

-- RLS Policies: CardioProgram
CREATE POLICY "users_own_cardio_programs" ON "CardioProgram"
  FOR ALL USING (auth.uid()::text = "userId");

-- RLS Policies: CardioWeek
CREATE POLICY "users_own_cardio_weeks" ON "CardioWeek"
  FOR ALL USING (
    "cardioProgramId" IN (
      SELECT id FROM "CardioProgram" WHERE "userId" = auth.uid()::text
    )
  );

-- RLS Policies: PrescribedCardioSession
CREATE POLICY "users_own_prescribed_cardio" ON "PrescribedCardioSession"
  FOR ALL USING (
    "weekId" IN (
      SELECT cw.id FROM "CardioWeek" cw
      JOIN "CardioProgram" cp ON cw."cardioProgramId" = cp.id
      WHERE cp."userId" = auth.uid()::text
    )
  );

-- RLS Policies: LoggedCardioSession
CREATE POLICY "users_own_logged_cardio" ON "LoggedCardioSession"
  FOR ALL USING (auth.uid()::text = "userId");

-- RLS Policies: UserCardioMetricPreferences
CREATE POLICY "users_own_cardio_metric_prefs" ON "UserCardioMetricPreferences"
  FOR ALL USING (auth.uid()::text = "userId");
