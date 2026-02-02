-- Migration: add_program_metadata
-- Add metadata fields to Program and CommunityProgram tables for improved discovery and filtering

-- Add metadata fields to Program table (optional for personal programs)
ALTER TABLE "Program"
  ADD COLUMN "goals" TEXT[] DEFAULT '{}',
  ADD COLUMN "level" TEXT,
  ADD COLUMN "durationWeeks" INTEGER,
  ADD COLUMN "durationDisplay" TEXT,
  ADD COLUMN "targetDaysPerWeek" INTEGER,
  ADD COLUMN "equipmentNeeded" TEXT[] DEFAULT '{}',
  ADD COLUMN "focusAreas" TEXT[] DEFAULT '{}';

-- Add metadata fields to CardioProgram table (optional for personal programs)
ALTER TABLE "CardioProgram"
  ADD COLUMN "goals" TEXT[] DEFAULT '{}',
  ADD COLUMN "level" TEXT,
  ADD COLUMN "durationWeeks" INTEGER,
  ADD COLUMN "durationDisplay" TEXT,
  ADD COLUMN "targetDaysPerWeek" INTEGER,
  ADD COLUMN "equipmentNeeded" TEXT[] DEFAULT '{}',
  ADD COLUMN "focusAreas" TEXT[] DEFAULT '{}';

-- Add metadata fields to CommunityProgram table (required via validation)
ALTER TABLE "CommunityProgram"
  ADD COLUMN "goals" TEXT[] DEFAULT '{}',
  ADD COLUMN "level" TEXT,
  ADD COLUMN "durationWeeks" INTEGER,
  ADD COLUMN "durationDisplay" TEXT,
  ADD COLUMN "targetDaysPerWeek" INTEGER,
  ADD COLUMN "equipmentNeeded" TEXT[] DEFAULT '{}',
  ADD COLUMN "focusAreas" TEXT[] DEFAULT '{}';

-- Add indexes for CommunityProgram filtering (performance optimization)

-- Simple B-tree index for level filtering
CREATE INDEX "CommunityProgram_level_idx"
  ON "CommunityProgram"("level");

-- GIN indexes for array containment queries (goals && ARRAY['strength', 'hypertrophy'])
CREATE INDEX "CommunityProgram_goals_idx"
  ON "CommunityProgram" USING GIN("goals");

CREATE INDEX "CommunityProgram_equipmentNeeded_idx"
  ON "CommunityProgram" USING GIN("equipmentNeeded");

-- Composite index for common query pattern: filter by type + sort by published date
CREATE INDEX "CommunityProgram_programType_publishedAt_idx"
  ON "CommunityProgram"("programType", "publishedAt" DESC);
