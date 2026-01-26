-- Migration: Rename community_programs table and columns to match naming conventions
-- Run this in Supabase SQL Editor

-- Drop existing RLS policies (so we can recreate them with correct names)
DROP POLICY IF EXISTS "community_programs_select_policy" ON "community_programs";
DROP POLICY IF EXISTS "community_programs_insert_policy" ON "community_programs";
DROP POLICY IF EXISTS "community_programs_delete_policy" ON "community_programs";

-- Drop existing indexes (they'll be recreated with new names)
DROP INDEX IF EXISTS "community_programs_program_type_idx";
DROP INDEX IF EXISTS "community_programs_published_at_idx";
DROP INDEX IF EXISTS "community_programs_author_user_id_idx";
DROP INDEX IF EXISTS "community_programs_original_program_id_idx";

-- Rename columns to camelCase
ALTER TABLE "community_programs" RENAME COLUMN "program_type" TO "programType";
ALTER TABLE "community_programs" RENAME COLUMN "author_user_id" TO "authorUserId";
ALTER TABLE "community_programs" RENAME COLUMN "display_name" TO "displayName";
ALTER TABLE "community_programs" RENAME COLUMN "published_at" TO "publishedAt";
ALTER TABLE "community_programs" RENAME COLUMN "original_program_id" TO "originalProgramId";
ALTER TABLE "community_programs" RENAME COLUMN "program_data" TO "programData";
ALTER TABLE "community_programs" RENAME COLUMN "week_count" TO "weekCount";
ALTER TABLE "community_programs" RENAME COLUMN "workout_count" TO "workoutCount";
ALTER TABLE "community_programs" RENAME COLUMN "exercise_count" TO "exerciseCount";

-- Rename table to PascalCase
ALTER TABLE "community_programs" RENAME TO "CommunityProgram";

-- Recreate indexes with new names and columns
CREATE INDEX "CommunityProgram_programType_idx" ON "CommunityProgram"("programType");
CREATE INDEX "CommunityProgram_publishedAt_idx" ON "CommunityProgram"("publishedAt" DESC);
CREATE INDEX "CommunityProgram_authorUserId_idx" ON "CommunityProgram"("authorUserId");
CREATE INDEX "CommunityProgram_originalProgramId_idx" ON "CommunityProgram"("originalProgramId");

-- Recreate RLS policies with correct names and column references
CREATE POLICY "CommunityProgram_select_policy"
  ON "CommunityProgram"
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "CommunityProgram_insert_policy"
  ON "CommunityProgram"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "authorUserId");

CREATE POLICY "CommunityProgram_delete_policy"
  ON "CommunityProgram"
  FOR DELETE
  USING (auth.uid()::text = "authorUserId");
