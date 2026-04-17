-- Add onboarding fields to UserSettings
ALTER TABLE "UserSettings" ADD COLUMN "experienceLevel" TEXT;
ALTER TABLE "UserSettings" ADD COLUMN "equipmentPreference" TEXT;
ALTER TABLE "UserSettings" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Existing users skip onboarding
UPDATE "UserSettings" SET "onboardingCompleted" = true;
