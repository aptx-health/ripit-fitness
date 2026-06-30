-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('queued', 'in_progress', 'ready', 'failed');

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'queued',
    "progressStep" TEXT,
    "errorMessage" TEXT,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "model" TEXT,
    "provider" TEXT,
    "latencyMs" INTEGER,
    "validationFailures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Suggestion_userId_idx" ON "Suggestion"("userId");

-- CreateIndex
CREATE INDEX "Suggestion_userId_status_idx" ON "Suggestion"("userId", "status");

-- CreateIndex
CREATE INDEX "Suggestion_status_createdAt_idx" ON "Suggestion"("status", "createdAt");

-- AlterTable
ALTER TABLE "Workout" ADD COLUMN "sourceSuggestionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Workout_sourceSuggestionId_key" ON "Workout"("sourceSuggestionId");

-- CreateIndex
CREATE INDEX "Workout_sourceSuggestionId_idx" ON "Workout"("sourceSuggestionId");

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_sourceSuggestionId_fkey" FOREIGN KEY ("sourceSuggestionId") REFERENCES "Suggestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
