-- Optimized Cardio RLS Policies for FitCSV
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
--
-- KEY OPTIMIZATIONS:
-- 1. Wrap auth.uid() in (SELECT auth.uid()) to cache the value
-- 2. Add TO authenticated to skip evaluation for anonymous users
-- 3. Use nested IN subqueries instead of JOINs for better query planning
--
-- Reference: /Users/dustin/repos/fitcsv/performance-analysis.md

-- Enable RLS on cardio tables (if not already enabled)
ALTER TABLE "CardioProgram" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CardioWeek" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrescribedCardioSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoggedCardioSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserCardioMetricPreferences" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for clean re-runs)
DROP POLICY IF EXISTS "users_own_cardio_programs" ON "CardioProgram";
DROP POLICY IF EXISTS "users_own_cardio_weeks" ON "CardioWeek";
DROP POLICY IF EXISTS "users_own_prescribed_cardio" ON "PrescribedCardioSession";
DROP POLICY IF EXISTS "users_own_logged_cardio" ON "LoggedCardioSession";
DROP POLICY IF EXISTS "users_own_cardio_metric_prefs" ON "UserCardioMetricPreferences";

-- ==============================================================================
-- CARDIO TRAINING POLICIES
-- ==============================================================================

-- CardioProgram policies: Users can only access their own programs
-- ✅ OPTIMIZED: Direct userId check with cached auth.uid()
CREATE POLICY "users_own_cardio_programs" ON "CardioProgram"
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- CardioWeek policies: Users can access weeks from their programs
-- ✅ OPTIMIZED: Cached auth.uid(), TO authenticated, nested IN subquery
CREATE POLICY "users_own_cardio_weeks" ON "CardioWeek"
  FOR ALL
  TO authenticated
  USING (
    "cardioProgramId" IN (
      SELECT id FROM "CardioProgram"
      WHERE "userId" = (SELECT auth.uid())::text
    )
  )
  WITH CHECK (
    "cardioProgramId" IN (
      SELECT id FROM "CardioProgram"
      WHERE "userId" = (SELECT auth.uid())::text
    )
  );

-- PrescribedCardioSession policies: Users can access sessions from their weeks
-- ✅ OPTIMIZED: Cached auth.uid(), TO authenticated, nested IN subqueries (no JOINs)
CREATE POLICY "users_own_prescribed_cardio" ON "PrescribedCardioSession"
  FOR ALL
  TO authenticated
  USING (
    "weekId" IN (
      SELECT id FROM "CardioWeek"
      WHERE "cardioProgramId" IN (
        SELECT id FROM "CardioProgram"
        WHERE "userId" = (SELECT auth.uid())::text
      )
    )
  )
  WITH CHECK (
    "weekId" IN (
      SELECT id FROM "CardioWeek"
      WHERE "cardioProgramId" IN (
        SELECT id FROM "CardioProgram"
        WHERE "userId" = (SELECT auth.uid())::text
      )
    )
  );

-- LoggedCardioSession policies: Users can only access their own sessions
-- ✅ OPTIMIZED: Direct userId check with cached auth.uid()
CREATE POLICY "users_own_logged_cardio" ON "LoggedCardioSession"
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- UserCardioMetricPreferences policies: Users can only access their own preferences
-- ✅ OPTIMIZED: Direct userId check with cached auth.uid()
CREATE POLICY "users_own_cardio_metric_prefs" ON "UserCardioMetricPreferences"
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- ==============================================================================
-- PERFORMANCE NOTES
-- ==============================================================================
--
-- Cardio optimizations follow the same pattern as strength training:
--
-- 1. CACHED auth.uid():
--    auth.uid() wrapped in (SELECT auth.uid()) to evaluate once per policy
--
-- 2. TO authenticated CLAUSE:
--    Skips policy evaluation for anonymous users
--
-- 3. NESTED IN SUBQUERIES:
--    PrescribedCardioSession went from 1 JOIN to nested subqueries
--
-- Expected improvement: 10-50x faster on Supabase Free tier
