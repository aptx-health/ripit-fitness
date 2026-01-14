-- Migration: Denormalize userId to Cardio Child Tables
-- Created: 2026-01-14
-- Purpose: Improve RLS performance by adding direct userId checks to cardio tables
--
-- This migration adds userId to CardioWeek and PrescribedCardioSession tables
-- to eliminate the need for expensive JOIN operations in RLS policies.

-- ==============================================================================
-- STEP 1: Add userId columns to cardio child tables
-- ==============================================================================

ALTER TABLE "CardioWeek" ADD COLUMN "userId" TEXT;
ALTER TABLE "PrescribedCardioSession" ADD COLUMN "userId" TEXT;

-- ==============================================================================
-- STEP 2: Populate userId from parent tables
-- ==============================================================================

-- Populate CardioWeek.userId from CardioProgram
UPDATE "CardioWeek"
SET "userId" = (
  SELECT "userId"
  FROM "CardioProgram"
  WHERE "CardioProgram".id = "CardioWeek"."cardioProgramId"
);

-- Populate PrescribedCardioSession.userId from CardioWeek
UPDATE "PrescribedCardioSession"
SET "userId" = (
  SELECT "userId"
  FROM "CardioWeek"
  WHERE "CardioWeek".id = "PrescribedCardioSession"."weekId"
);

-- ==============================================================================
-- STEP 3: Make userId NOT NULL (data integrity)
-- ==============================================================================

ALTER TABLE "CardioWeek" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "PrescribedCardioSession" ALTER COLUMN "userId" SET NOT NULL;

-- ==============================================================================
-- STEP 4: Add indexes on userId for fast lookups
-- ==============================================================================

CREATE INDEX "CardioWeek_userId_idx" ON "CardioWeek"("userId");
CREATE INDEX "PrescribedCardioSession_userId_idx" ON "PrescribedCardioSession"("userId");

-- ==============================================================================
-- STEP 5: Update RLS policies to use direct userId checks
-- ==============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "users_own_cardio_weeks" ON "CardioWeek";
DROP POLICY IF EXISTS "users_own_prescribed_cardio" ON "PrescribedCardioSession";

-- Create new optimized policies with direct userId checks
CREATE POLICY "users_own_cardio_weeks" ON "CardioWeek"
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "users_own_prescribed_cardio" ON "PrescribedCardioSession"
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- ==============================================================================
-- VERIFICATION QUERIES (Run these to verify migration success)
-- ==============================================================================

-- Check that all rows have userId populated
-- SELECT 'CardioWeek', COUNT(*) as total, COUNT("userId") as with_userId FROM "CardioWeek"
-- UNION ALL
-- SELECT 'PrescribedCardioSession', COUNT(*), COUNT("userId") FROM "PrescribedCardioSession";

-- Check indexes were created
-- SELECT tablename, indexname FROM pg_indexes
-- WHERE tablename IN ('CardioWeek', 'PrescribedCardioSession')
-- AND indexname LIKE '%userId%';

-- Check RLS policies are active
-- SELECT tablename, policyname, roles FROM pg_policies
-- WHERE tablename IN ('CardioWeek', 'PrescribedCardioSession')
-- ORDER BY tablename;
