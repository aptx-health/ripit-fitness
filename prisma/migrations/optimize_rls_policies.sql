-- Migration: Optimize RLS Policies for Performance
-- Created: 2026-01-29
--
-- Problem: auth.uid() is called per-row in RLS policy checks, causing
-- significant performance degradation on tables with many rows.
--
-- Solution: Wrap auth.uid() in (SELECT auth.uid()) to evaluate it once
-- and cache the result. This can provide 5-10x performance improvement.
--
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations

-- ============================================================================
-- STRENGTH TRAINING TABLES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "users_own_programs" ON "Program";
DROP POLICY IF EXISTS "users_own_weeks" ON "Week";
DROP POLICY IF EXISTS "users_own_workouts" ON "Workout";
DROP POLICY IF EXISTS "users_own_exercises" ON "Exercise";
DROP POLICY IF EXISTS "users_own_prescribed_sets" ON "PrescribedSet";
DROP POLICY IF EXISTS "users_own_completions" ON "WorkoutCompletion";
DROP POLICY IF EXISTS "users_own_logged_sets" ON "LoggedSet";

-- Program: Users can only access their own programs
CREATE POLICY "users_own_programs" ON "Program"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- Week: Users can access weeks from their programs
-- Optimized: Uses userId column directly instead of subquery join
CREATE POLICY "users_own_weeks" ON "Week"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- Workout: Users can access workouts from their weeks
-- Optimized: Uses userId column directly instead of subquery join
CREATE POLICY "users_own_workouts" ON "Workout"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- Exercise: Users can access exercises from their workouts
-- Optimized: Uses userId column directly instead of subquery join
CREATE POLICY "users_own_exercises" ON "Exercise"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- PrescribedSet: Users can access prescribed sets from their exercises
-- Optimized: Uses userId column directly instead of subquery join
CREATE POLICY "users_own_prescribed_sets" ON "PrescribedSet"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- WorkoutCompletion: Users can only access their own completions
CREATE POLICY "users_own_completions" ON "WorkoutCompletion"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- LoggedSet: Users can access logged sets from their completions
-- Optimized: Uses userId column directly instead of subquery join
CREATE POLICY "users_own_logged_sets" ON "LoggedSet"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- ============================================================================
-- CARDIO TABLES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "users_own_cardio_programs" ON "CardioProgram";
DROP POLICY IF EXISTS "users_own_cardio_weeks" ON "CardioWeek";
DROP POLICY IF EXISTS "users_own_prescribed_cardio" ON "PrescribedCardioSession";
DROP POLICY IF EXISTS "users_own_logged_cardio" ON "LoggedCardioSession";
DROP POLICY IF EXISTS "users_own_cardio_metric_prefs" ON "UserCardioMetricPreferences";

-- CardioProgram: Users can only access their own cardio programs
CREATE POLICY "users_own_cardio_programs" ON "CardioProgram"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- CardioWeek: Users can access weeks from their cardio programs
-- Optimized: Uses userId column directly instead of subquery join
CREATE POLICY "users_own_cardio_weeks" ON "CardioWeek"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- PrescribedCardioSession: Users can access sessions from their cardio weeks
-- Optimized: Uses userId column directly instead of subquery join
CREATE POLICY "users_own_prescribed_cardio" ON "PrescribedCardioSession"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- LoggedCardioSession: Users can only access their own logged sessions
CREATE POLICY "users_own_logged_cardio" ON "LoggedCardioSession"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- UserCardioMetricPreferences: Users can only access their own preferences
CREATE POLICY "users_own_cardio_metric_prefs" ON "UserCardioMetricPreferences"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- ============================================================================
-- COMMUNITY PROGRAMS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "CommunityProgram_select_policy" ON "CommunityProgram";
DROP POLICY IF EXISTS "CommunityProgram_insert_policy" ON "CommunityProgram";
DROP POLICY IF EXISTS "CommunityProgram_delete_policy" ON "CommunityProgram";

-- CommunityProgram: Anyone authenticated can read, only author can insert/delete
CREATE POLICY "CommunityProgram_select_policy"
  ON "CommunityProgram"
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "CommunityProgram_insert_policy"
  ON "CommunityProgram"
  FOR INSERT
  WITH CHECK ((SELECT auth.uid())::text = "authorUserId");

CREATE POLICY "CommunityProgram_delete_policy"
  ON "CommunityProgram"
  FOR DELETE
  USING ((SELECT auth.uid())::text = "authorUserId");

-- ============================================================================
-- VERIFICATION QUERIES (run after migration to verify)
-- ============================================================================

-- Check that all policies are created correctly:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
