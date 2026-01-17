-- Migration: Add userId to LoggedSet for PowerSync support
-- Date: 2026-01-17
-- Reason: PowerSync requires single-table queries without JOINs
-- LoggedSet needs userId denormalized from WorkoutCompletion.userId

-- Step 1: Add userId column (nullable initially)
ALTER TABLE "LoggedSet" ADD COLUMN "userId" TEXT;

-- Step 2: Backfill existing rows with userId from WorkoutCompletion
UPDATE "LoggedSet" ls
SET "userId" = wc."userId"
FROM "WorkoutCompletion" wc
WHERE ls."completionId" = wc.id;

-- Step 3: Make userId NOT NULL now that all rows are backfilled
ALTER TABLE "LoggedSet" ALTER COLUMN "userId" SET NOT NULL;

-- Step 4: Add index for efficient queries
CREATE INDEX "LoggedSet_userId_idx" ON "LoggedSet"("userId");

-- Verify the migration
SELECT COUNT(*) as total_logged_sets, COUNT("userId") as sets_with_userid
FROM "LoggedSet";
