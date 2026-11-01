-- AlterTable
ALTER TABLE "SavedWorkout" ADD COLUMN "pinnedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "SavedWorkout_userId_pinnedAt_idx" ON "SavedWorkout"("userId", "pinnedAt" DESC);
