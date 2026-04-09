-- Add properties column to Feedback for storing extra context (e.g. question shown)
ALTER TABLE "Feedback" ADD COLUMN "properties" TEXT;

-- Add category index for filtering
CREATE INDEX "Feedback_category_idx" ON "Feedback"("category");

-- Add post-session prompt tracking to UserSettings
ALTER TABLE "UserSettings" ADD COLUMN "postSessionPromptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserSettings" ADD COLUMN "lastPostSessionPromptAt" TIMESTAMP(3);
