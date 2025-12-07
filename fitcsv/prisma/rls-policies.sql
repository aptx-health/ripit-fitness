-- Row Level Security (RLS) Policies for FitCSV
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

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
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- Week policies: Users can access weeks from their programs
CREATE POLICY "users_own_weeks" ON "Week"
  FOR ALL
  USING (
    "programId" IN (
      SELECT id FROM "Program" WHERE "userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "programId" IN (
      SELECT id FROM "Program" WHERE "userId" = auth.uid()::text
    )
  );

-- Workout policies: Users can access workouts from their weeks
CREATE POLICY "users_own_workouts" ON "Workout"
  FOR ALL
  USING (
    "weekId" IN (
      SELECT w.id FROM "Week" w
      JOIN "Program" p ON p.id = w."programId"
      WHERE p."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "weekId" IN (
      SELECT w.id FROM "Week" w
      JOIN "Program" p ON p.id = w."programId"
      WHERE p."userId" = auth.uid()::text
    )
  );

-- Exercise policies: Users can access exercises from their workouts
CREATE POLICY "users_own_exercises" ON "Exercise"
  FOR ALL
  USING (
    "workoutId" IN (
      SELECT wo.id FROM "Workout" wo
      JOIN "Week" w ON w.id = wo."weekId"
      JOIN "Program" p ON p.id = w."programId"
      WHERE p."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "workoutId" IN (
      SELECT wo.id FROM "Workout" wo
      JOIN "Week" w ON w.id = wo."weekId"
      JOIN "Program" p ON p.id = w."programId"
      WHERE p."userId" = auth.uid()::text
    )
  );

-- PrescribedSet policies: Users can access prescribed sets from their exercises
CREATE POLICY "users_own_prescribed_sets" ON "PrescribedSet"
  FOR ALL
  USING (
    "exerciseId" IN (
      SELECT e.id FROM "Exercise" e
      JOIN "Workout" wo ON wo.id = e."workoutId"
      JOIN "Week" w ON w.id = wo."weekId"
      JOIN "Program" p ON p.id = w."programId"
      WHERE p."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "exerciseId" IN (
      SELECT e.id FROM "Exercise" e
      JOIN "Workout" wo ON wo.id = e."workoutId"
      JOIN "Week" w ON w.id = wo."weekId"
      JOIN "Program" p ON p.id = w."programId"
      WHERE p."userId" = auth.uid()::text
    )
  );

-- WorkoutCompletion policies: Users can only access their own completions
CREATE POLICY "users_own_completions" ON "WorkoutCompletion"
  FOR ALL
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- LoggedSet policies: Users can access logged sets from their completions
CREATE POLICY "users_own_logged_sets" ON "LoggedSet"
  FOR ALL
  USING (
    "completionId" IN (
      SELECT id FROM "WorkoutCompletion" WHERE "userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "completionId" IN (
      SELECT id FROM "WorkoutCompletion" WHERE "userId" = auth.uid()::text
    )
  );
