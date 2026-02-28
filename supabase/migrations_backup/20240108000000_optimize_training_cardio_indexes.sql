-- Migration: Optimize Training/Cardio Page Indexes
-- Created: 2026-01-29
--
-- Problem: The getCurrentStrengthWeek and getCurrentCardioWeek functions
-- use raw SQL queries with correlated subqueries that filter on (programId, userId)
-- and order by weekNumber. Current indexes don't cover this pattern efficiently.
--
-- Solution: Add composite indexes that cover the full query pattern.

-- ============================================================================
-- WEEK TABLE INDEXES (Strength Training)
-- ============================================================================

-- Composite index for finding weeks by program + user, ordered by weekNumber
-- Used by: getCurrentStrengthWeek raw SQL query
-- Pattern: WHERE programId = X AND userId = Y ORDER BY weekNumber
CREATE INDEX IF NOT EXISTS "Week_program_user_weekNum_idx"
ON "Week" ("programId", "userId", "weekNumber");

-- ============================================================================
-- CARDIO WEEK TABLE INDEXES
-- ============================================================================

-- Composite index for finding cardio weeks by program + user, ordered by weekNumber
-- Used by: getCurrentCardioWeek raw SQL query
-- Pattern: WHERE cardioProgramId = X AND userId = Y ORDER BY weekNumber
CREATE INDEX IF NOT EXISTS "CardioWeek_program_user_weekNum_idx"
ON "CardioWeek" ("cardioProgramId", "userId", "weekNumber");

-- ============================================================================
-- WORKOUT COMPLETION INDEXES
-- ============================================================================

-- Index for counting completed workouts per week (used in correlated subquery)
-- Pattern: COUNT(DISTINCT workoutId) WHERE workoutId IN (...) AND userId = X AND status = 'completed'
-- The existing WorkoutCompletion_workoutId_userId_idx helps, but adding status improves filtering
CREATE INDEX IF NOT EXISTS "WorkoutCompletion_workout_user_status_idx"
ON "WorkoutCompletion" ("workoutId", "userId", "status");

-- ============================================================================
-- LOGGED CARDIO SESSION INDEXES
-- ============================================================================

-- Index for counting completed cardio sessions per prescribed session
-- Pattern: COUNT(DISTINCT prescribedSessionId) WHERE prescribedSessionId IN (...) AND userId = X AND status = 'completed'
-- Existing index covers (prescribedSessionId, userId, completedAt) but adding status helps
CREATE INDEX IF NOT EXISTS "LoggedCardioSession_prescribed_user_status_idx"
ON "LoggedCardioSession" ("prescribedSessionId", "userId", "status");

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After running, verify with:
-- SELECT indexname FROM pg_indexes WHERE indexname LIKE '%program_user%' OR indexname LIKE '%workout_user_status%' OR indexname LIKE '%prescribed_user_status%';
