-- Row Level Security (RLS) Policies for FitCSV
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
--
-- PERFORMANCE NOTE: All policies use (SELECT auth.uid()) instead of auth.uid()
-- to cache the function call. This provides 5-10x performance improvement.
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations

-- Enable RLS on all tables
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

-- Program policies: Users can only access their own programs
CREATE POLICY "users_own_programs" ON "Program"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- Week policies: Users can access weeks they own
CREATE POLICY "users_own_weeks" ON "Week"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- Workout policies: Users can access workouts they own
CREATE POLICY "users_own_workouts" ON "Workout"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- Exercise policies: Users can access exercises they own
CREATE POLICY "users_own_exercises" ON "Exercise"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- PrescribedSet policies: Users can access prescribed sets they own
CREATE POLICY "users_own_prescribed_sets" ON "PrescribedSet"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- WorkoutCompletion policies: Users can only access their own completions
CREATE POLICY "users_own_completions" ON "WorkoutCompletion"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- LoggedSet policies: Users can access logged sets they own
CREATE POLICY "users_own_logged_sets" ON "LoggedSet"
  FOR ALL
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");
