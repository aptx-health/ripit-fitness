-- Expand UserTrainingProfile with demographics, injuries, goal categories,
-- other activities, and training rhythm. Also convert weeklyIntent from
-- TEXT[] to JSONB (per #884) preserving existing entries as
-- { type: 'free_text', text }.

-- 1. Add new columns
ALTER TABLE "UserTrainingProfile"
  ADD COLUMN "age" INTEGER,
  ADD COLUMN "biologicalSex" TEXT,
  ADD COLUMN "heightCm" DOUBLE PRECISION,
  ADD COLUMN "weightKg" DOUBLE PRECISION,
  ADD COLUMN "injuryAreas" JSONB,
  ADD COLUMN "injuryFreeNotes" TEXT,
  ADD COLUMN "goalCategories" JSONB,
  ADD COLUMN "otherActivities" JSONB,
  ADD COLUMN "targetSessionsPerWeek" INTEGER,
  ADD COLUMN "targetMinutesPerSession" INTEGER,
  ADD COLUMN "patternPreference" TEXT;

-- 2. Convert weeklyIntent TEXT[] -> JSONB, wrapping each string as free_text.
ALTER TABLE "UserTrainingProfile"
  ALTER COLUMN "weeklyIntent" DROP DEFAULT;

ALTER TABLE "UserTrainingProfile"
  ALTER COLUMN "weeklyIntent" TYPE JSONB
  USING (
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('type', 'free_text', 'text', s))
        FROM unnest("weeklyIntent") AS s
      ),
      '[]'::jsonb
    )
  );

ALTER TABLE "UserTrainingProfile"
  ALTER COLUMN "weeklyIntent" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "weeklyIntent" SET NOT NULL;
