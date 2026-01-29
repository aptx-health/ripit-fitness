-- Migration: Add CommunityProgram table
-- Run this in Supabase SQL Editor

-- Create CommunityProgram table
CREATE TABLE IF NOT EXISTS "CommunityProgram" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "programType" TEXT NOT NULL DEFAULT 'strength',
  "authorUserId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "originalProgramId" TEXT NOT NULL UNIQUE,
  "programData" JSONB NOT NULL,
  "weekCount" INTEGER NOT NULL,
  "workoutCount" INTEGER NOT NULL,
  "exerciseCount" INTEGER NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "CommunityProgram_programType_idx" ON "CommunityProgram"("programType");
CREATE INDEX IF NOT EXISTS "CommunityProgram_publishedAt_idx" ON "CommunityProgram"("publishedAt" DESC);
CREATE INDEX IF NOT EXISTS "CommunityProgram_authorUserId_idx" ON "CommunityProgram"("authorUserId");
CREATE INDEX IF NOT EXISTS "CommunityProgram_originalProgramId_idx" ON "CommunityProgram"("originalProgramId");

-- Enable RLS
ALTER TABLE "CommunityProgram" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone authenticated can read (public community library)
CREATE POLICY "CommunityProgram_select_policy"
  ON "CommunityProgram"
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policy: Only author can insert their own programs
CREATE POLICY "CommunityProgram_insert_policy"
  ON "CommunityProgram"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "authorUserId");

-- RLS Policy: Only author can delete their own programs
CREATE POLICY "CommunityProgram_delete_policy"
  ON "CommunityProgram"
  FOR DELETE
  USING (auth.uid()::text = "authorUserId");

-- No UPDATE policy (immutability - published programs cannot be edited)
