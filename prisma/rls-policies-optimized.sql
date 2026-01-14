-- Optimized Row Level Security (RLS) Policies for FitCSV
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
--
-- KEY OPTIMIZATIONS:
-- 1. Wrap auth.uid() in (SELECT auth.uid()) to cache the value
-- 2. Add TO authenticated to skip evaluation for anonymous users
-- 3. Use nested IN subqueries instead of JOINs for better query planning
-- 4. These changes can provide 10-100x performance improvement on Supabase Free tier
--
-- Reference: /Users/dustin/repos/fitcsv/performance-analysis.md

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE "Program" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Week" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Exercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrescribedSet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutCompletion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoggedSet" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for clean re-runs)
DROP POLICY IF EXISTS "users_own_programs" ON "Program";
DROP POLICY IF EXISTS "users_own_weeks" ON "Week";
DROP POLICY IF EXISTS "users_own_workouts" ON "Workout";
DROP POLICY IF EXISTS "users_own_exercises" ON "Exercise";
DROP POLICY IF EXISTS "users_own_prescribed_sets" ON "PrescribedSet";
DROP POLICY IF EXISTS "users_own_completions" ON "WorkoutCompletion";
DROP POLICY IF EXISTS "users_own_logged_sets" ON "LoggedSet";

-- ==============================================================================
-- STRENGTH TRAINING POLICIES
-- ==============================================================================

-- Program policies: Users can only access their own programs
-- ✅ OPTIMIZED: Direct userId check with cached auth.uid()
CREATE POLICY "users_own_programs" ON "Program"
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- Week policies: Users can access weeks from their programs
-- ✅ OPTIMIZED: Cached auth.uid(), TO authenticated, nested IN subquery
CREATE POLICY "users_own_weeks" ON "Week"
  FOR ALL
  TO authenticated
  USING (
    "programId" IN (
      SELECT id FROM "Program"
      WHERE "userId" = (SELECT auth.uid())::text
    )
  )
  WITH CHECK (
    "programId" IN (
      SELECT id FROM "Program"
      WHERE "userId" = (SELECT auth.uid())::text
    )
  );

-- Workout policies: Users can access workouts from their weeks
-- ✅ OPTIMIZED: Cached auth.uid(), TO authenticated, nested IN subqueries (no JOINs)
CREATE POLICY "users_own_workouts" ON "Workout"
  FOR ALL
  TO authenticated
  USING (
    "weekId" IN (
      SELECT id FROM "Week"
      WHERE "programId" IN (
        SELECT id FROM "Program"
        WHERE "userId" = (SELECT auth.uid())::text
      )
    )
  )
  WITH CHECK (
    "weekId" IN (
      SELECT id FROM "Week"
      WHERE "programId" IN (
        SELECT id FROM "Program"
        WHERE "userId" = (SELECT auth.uid())::text
      )
    )
  );

-- Exercise policies: Users can access exercises from their workouts
-- ✅ OPTIMIZED: Cached auth.uid(), TO authenticated, nested IN subqueries (no JOINs)
CREATE POLICY "users_own_exercises" ON "Exercise"
  FOR ALL
  TO authenticated
  USING (
    "workoutId" IN (
      SELECT id FROM "Workout"
      WHERE "weekId" IN (
        SELECT id FROM "Week"
        WHERE "programId" IN (
          SELECT id FROM "Program"
          WHERE "userId" = (SELECT auth.uid())::text
        )
      )
    )
  )
  WITH CHECK (
    "workoutId" IN (
      SELECT id FROM "Workout"
      WHERE "weekId" IN (
        SELECT id FROM "Week"
        WHERE "programId" IN (
          SELECT id FROM "Program"
          WHERE "userId" = (SELECT auth.uid())::text
        )
      )
    )
  );

-- PrescribedSet policies: Users can access prescribed sets from their exercises
-- ✅ OPTIMIZED: Cached auth.uid(), TO authenticated, nested IN subqueries (no JOINs)
-- This was the WORST performer (4 JOINs) - now uses nested subqueries
CREATE POLICY "users_own_prescribed_sets" ON "PrescribedSet"
  FOR ALL
  TO authenticated
  USING (
    "exerciseId" IN (
      SELECT id FROM "Exercise"
      WHERE "workoutId" IN (
        SELECT id FROM "Workout"
        WHERE "weekId" IN (
          SELECT id FROM "Week"
          WHERE "programId" IN (
            SELECT id FROM "Program"
            WHERE "userId" = (SELECT auth.uid())::text
          )
        )
      )
    )
  )
  WITH CHECK (
    "exerciseId" IN (
      SELECT id FROM "Exercise"
      WHERE "workoutId" IN (
        SELECT id FROM "Workout"
        WHERE "weekId" IN (
          SELECT id FROM "Week"
          WHERE "programId" IN (
            SELECT id FROM "Program"
            WHERE "userId" = (SELECT auth.uid())::text
          )
        )
      )
    )
  );

-- WorkoutCompletion policies: Users can only access their own completions
-- ✅ OPTIMIZED: Direct userId check with cached auth.uid()
CREATE POLICY "users_own_completions" ON "WorkoutCompletion"
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- LoggedSet policies: Users can access logged sets from their completions
-- ✅ OPTIMIZED: Cached auth.uid(), TO authenticated, nested IN subquery
CREATE POLICY "users_own_logged_sets" ON "LoggedSet"
  FOR ALL
  TO authenticated
  USING (
    "completionId" IN (
      SELECT id FROM "WorkoutCompletion"
      WHERE "userId" = (SELECT auth.uid())::text
    )
  )
  WITH CHECK (
    "completionId" IN (
      SELECT id FROM "WorkoutCompletion"
      WHERE "userId" = (SELECT auth.uid())::text
    )
  );

-- ==============================================================================
-- PERFORMANCE NOTES
-- ==============================================================================
--
-- The key optimizations made:
--
-- 1. CACHED auth.uid():
--    Before: auth.uid()::text = "userId"
--    After:  (SELECT auth.uid())::text = "userId"
--    Impact: auth.uid() is evaluated once per policy check instead of per-row
--
-- 2. TO authenticated CLAUSE:
--    Before: FOR ALL USING (...)
--    After:  FOR ALL TO authenticated USING (...)
--    Impact: Policy is skipped entirely for anonymous users
--
-- 3. NESTED IN SUBQUERIES:
--    Before: JOIN "Week" w ON ... JOIN "Program" p ON ... WHERE p."userId" = auth.uid()
--    After:  "weekId" IN (SELECT id FROM "Week" WHERE "programId" IN (...))
--    Impact: Query planner can optimize subqueries better, avoids JOIN overhead
--
-- 4. WORST OFFENDER FIXED:
--    PrescribedSet policy went from 4 JOINs to nested subqueries
--    This was causing 50-200ms delays per query on Supabase Free tier
--
-- Expected improvement: 10-100x faster on Supabase Free tier for complex queries
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#improve-performance
