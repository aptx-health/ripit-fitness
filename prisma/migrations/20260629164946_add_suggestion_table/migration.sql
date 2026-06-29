-- AlterTable
ALTER TABLE "Workout" ADD COLUMN "sourceSuggestionId" TEXT;

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "validationFailures" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Suggestion_userId_createdAt_idx" ON "Suggestion"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Workout_sourceSuggestionId_idx" ON "Workout"("sourceSuggestionId");

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_sourceSuggestionId_fkey" FOREIGN KEY ("sourceSuggestionId") REFERENCES "Suggestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
