-- Add dismissal tracking for contextual content surfacing
ALTER TABLE "UserSettings" ADD COLUMN "dismissedPrimer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserSettings" ADD COLUMN "dismissedWarmup" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserSettings" ADD COLUMN "dismissedStickNudge" BOOLEAN NOT NULL DEFAULT false;
