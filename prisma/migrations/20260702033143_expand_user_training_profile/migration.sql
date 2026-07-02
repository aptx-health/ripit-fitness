-- Expand UserTrainingProfile with demographics, injuries, importance ratings,
-- and training rhythm (#915). Purely additive — no changes to existing columns,
-- so updatedAt semantics are preserved for existing rows.

ALTER TABLE "UserTrainingProfile"
  ADD COLUMN "birthYear" INTEGER,
  ADD COLUMN "biologicalSex" TEXT,
  ADD COLUMN "heightCm" DOUBLE PRECISION,
  ADD COLUMN "weightKg" DOUBLE PRECISION,
  ADD COLUMN "injuryAreas" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "goalCategories" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "otherActivities" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "fauImportance" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "targetSessionsPerWeek" INTEGER,
  ADD COLUMN "targetMinutesPerSession" INTEGER,
  ADD COLUMN "patternPreference" TEXT,
  ADD COLUMN "preferredDays" TEXT[] DEFAULT ARRAY[]::TEXT[];
