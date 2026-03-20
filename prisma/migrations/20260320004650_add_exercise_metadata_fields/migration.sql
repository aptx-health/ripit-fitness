-- AlterTable: Add exercise metadata fields from free-exercise-db
ALTER TABLE "ExerciseDefinition" ADD COLUMN "force" TEXT;
ALTER TABLE "ExerciseDefinition" ADD COLUMN "mechanic" TEXT;
ALTER TABLE "ExerciseDefinition" ADD COLUMN "level" TEXT;
