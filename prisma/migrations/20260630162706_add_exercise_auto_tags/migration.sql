-- Add LLM-bootstrapped classification fields to ExerciseDefinition
ALTER TABLE "ExerciseDefinition" ADD COLUMN "movementPattern" TEXT;
ALTER TABLE "ExerciseDefinition" ADD COLUMN "intensityClass" TEXT;
ALTER TABLE "ExerciseDefinition" ADD COLUMN "taggedAt" TIMESTAMP(3);
ALTER TABLE "ExerciseDefinition" ADD COLUMN "taggedBy" TEXT;

CREATE INDEX "ExerciseDefinition_movementPattern_idx" ON "ExerciseDefinition"("movementPattern");
CREATE INDEX "ExerciseDefinition_intensityClass_idx" ON "ExerciseDefinition"("intensityClass");
