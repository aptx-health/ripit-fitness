-- Add soft delete column to Program
ALTER TABLE "Program" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Migrate existing archived programs to soft-deleted state
UPDATE "Program" SET "deletedAt" = COALESCE("archivedAt", NOW()) WHERE "isArchived" = true;

-- Add index for efficient soft-delete filtering
CREATE INDEX "Program_userId_deletedAt_idx" ON "Program"("userId", "deletedAt");

-- Add customProgramLimitBypass to UserSettings
ALTER TABLE "UserSettings" ADD COLUMN "customProgramLimitBypass" BOOLEAN NOT NULL DEFAULT false;
