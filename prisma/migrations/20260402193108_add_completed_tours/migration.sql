-- Track which guided tours the user has completed or skipped
ALTER TABLE "UserSettings" ADD COLUMN "completedTours" TEXT NOT NULL DEFAULT '[]';
