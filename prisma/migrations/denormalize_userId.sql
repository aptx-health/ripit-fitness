-- Migration: Denormalize userId to Child Tables
-- Created: 2026-01-14
-- Purpose: Improve RLS performance by adding direct userId checks
--
-- This migration adds userId to Week, Workout, Exercise, and PrescribedSet tables
-- to eliminate the need for expensive JOIN operations in RLS policies.
--
-- Expected improvement: 10-50x faster queries on Supabase Free tier

-- ==============================================================================
-- STEP 1: Add userId columns to child tables
-- ==============================================================================

ALTER TABLE "Week" ADD COLUMN "userId" TEXT;
ALTER TABLE "Workout" ADD COLUMN "userId" TEXT;
ALTER TABLE "Exercise" ADD COLUMN "userId" TEXT;
ALTER TABLE "PrescribedSet" ADD COLUMN "userId" TEXT;

-- ==============================================================================
-- STEP 2: Populate userId from parent tables
-- ==============================================================================

-- Populate Week.userId from Program
UPDATE "Week"
SET "userId" = (
  SELECT "userId"
  FROM "Program"
  WHERE "Program".id = "Week"."programId"
);

-- Populate Workout.userId from Week
UPDATE "Workout"
SET "userId" = (
  SELECT "userId"
  FROM "Week"
  WHERE "Week".id = "Workout"."weekId"
);

-- Populate Exercise.userId from Workout
UPDATE "Exercise"
SET "userId" = (
  SELECT w."userId"
  FROM "Workout" w
  WHERE w.id = "Exercise"."workoutId"
);

-- Populate PrescribedSet.userId from Exercise
UPDATE "PrescribedSet"
SET "userId" = (
  SELECT e."userId"
  FROM "Exercise" e
  WHERE e.id = "PrescribedSet"."exerciseId"
);

-- ==============================================================================
-- STEP 3: Make userId NOT NULL (data integrity)
-- ==============================================================================

ALTER TABLE "Week" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Workout" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Exercise" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "PrescribedSet" ALTER COLUMN "userId" SET NOT NULL;

-- ==============================================================================
-- STEP 4: Add indexes on userId for fast lookups
-- ==============================================================================

CREATE INDEX "Week_userId_idx" ON "Week"("userId");
CREATE INDEX "Workout_userId_idx" ON "Workout"("userId");
CREATE INDEX "Exercise_userId_idx" ON "Exercise"("userId");
CREATE INDEX "PrescribedSet_userId_idx" ON "PrescribedSet"("userId");

-- ==============================================================================
-- STEP 5: Update RLS policies to use direct userId checks
-- ==============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "users_own_weeks" ON "Week";
DROP POLICY IF EXISTS "users_own_workouts" ON "Workout";
DROP POLICY IF EXISTS "users_own_exercises" ON "Exercise";
DROP POLICY IF EXISTS "users_own_prescribed_sets" ON "PrescribedSet";

-- Create new optimized policies with direct userId checks
CREATE POLICY "users_own_weeks" ON "Week"
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "users_own_workouts" ON "Workout"
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "users_own_exercises" ON "Exercise"
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "users_own_prescribed_sets" ON "PrescribedSet"
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- ==============================================================================
-- VERIFICATION QUERIES (Run these to verify migration success)
-- ==============================================================================

-- Check that all rows have userId populated
-- SELECT 'Week', COUNT(*) as total, COUNT("userId") as with_userId FROM "Week"
-- UNION ALL
-- SELECT 'Workout', COUNT(*), COUNT("userId") FROM "Workout"
-- UNION ALL
-- SELECT 'Exercise', COUNT(*), COUNT("userId") FROM "Exercise"
-- UNION ALL
-- SELECT 'PrescribedSet', COUNT(*), COUNT("userId") FROM "PrescribedSet";

-- Check indexes were created
-- SELECT tablename, indexname FROM pg_indexes
-- WHERE tablename IN ('Week', 'Workout', 'Exercise', 'PrescribedSet')
-- AND indexname LIKE '%userId%';

-- Check RLS policies are active
-- SELECT tablename, policyname, roles FROM pg_policies
-- WHERE tablename IN ('Week', 'Workout', 'Exercise', 'PrescribedSet')
-- ORDER BY tablename;
