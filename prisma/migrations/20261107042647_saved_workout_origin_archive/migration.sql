-- AlterTable
ALTER TABLE "SavedWorkout" ADD COLUMN     "origin" TEXT NOT NULL DEFAULT 'session',
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "dismissedAt" TIMESTAMP(3);

-- Backfill: workouts created by approving an agent's saved_workout.create
-- proposal are "agent"; everything else keeps the "session" default.
UPDATE "SavedWorkout" AS sw
SET "origin" = 'agent'
FROM "Proposal" AS p
WHERE p."targetId" = sw."id"
  AND p."userId" = sw."userId"
  AND p."kind" = 'saved_workout.create'
  AND p."status" = 'applied';
