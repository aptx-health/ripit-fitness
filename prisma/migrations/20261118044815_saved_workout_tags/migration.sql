-- AlterTable
ALTER TABLE "SavedWorkout" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "SavedWorkout_tags_idx" ON "SavedWorkout" USING GIN ("tags");
