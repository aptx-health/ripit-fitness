-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "pinnedLiftsCustomized" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PinnedExercise" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseDefinitionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinnedExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PinnedExercise_userId_position_idx" ON "PinnedExercise"("userId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PinnedExercise_userId_exerciseDefinitionId_key" ON "PinnedExercise"("userId", "exerciseDefinitionId");

-- AddForeignKey
ALTER TABLE "PinnedExercise" ADD CONSTRAINT "PinnedExercise_exerciseDefinitionId_fkey" FOREIGN KEY ("exerciseDefinitionId") REFERENCES "ExerciseDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

