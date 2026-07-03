-- Add goal_progress JSON column to UserTrainingAggregates (issue #941).
ALTER TABLE "UserTrainingAggregates" ADD COLUMN "goalProgress" JSONB NOT NULL DEFAULT '[]';
