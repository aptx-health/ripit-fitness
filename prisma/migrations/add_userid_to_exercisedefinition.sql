-- Migration: Add userId to ExerciseDefinition for PowerSync support
-- Date: 2026-01-17
-- System exercises will use a special system user ID: 00000000-0000-0000-0000-000000000000

-- Step 1: Add userId column (nullable initially)
ALTER TABLE "ExerciseDefinition" ADD COLUMN "userId" TEXT;

-- Step 2: Backfill system exercises with the special system user ID
UPDATE "ExerciseDefinition"
SET "userId" = '00000000-0000-0000-0000-000000000000'
WHERE "isSystem" = true;

-- Step 3: Backfill user-created exercises with their actual creator ID
UPDATE "ExerciseDefinition"
SET "userId" = "createdBy"
WHERE "isSystem" = false AND "createdBy" IS NOT NULL;

-- Step 4: Make userId NOT NULL
ALTER TABLE "ExerciseDefinition" ALTER COLUMN "userId" SET NOT NULL;

-- Step 5: Add index for efficient queries
CREATE INDEX "ExerciseDefinition_userId_idx" ON "ExerciseDefinition"("userId");

-- Verify the migration
SELECT
  "isSystem",
  COUNT(*) as count,
  COUNT(DISTINCT "userId") as distinct_users
FROM "ExerciseDefinition"
GROUP BY "isSystem";
