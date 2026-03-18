-- AlterTable
ALTER TABLE "PrescribedSet" ADD COLUMN "isWarmup" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LoggedSet" ADD COLUMN "isWarmup" BOOLEAN NOT NULL DEFAULT false;
