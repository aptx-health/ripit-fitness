ALTER TABLE "UserSettings" ADD COLUMN "pwaPromptShownCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserSettings" ADD COLUMN "pwaPromptDismissedAt" TIMESTAMP(3);
