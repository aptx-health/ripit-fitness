-- AlterTable: add rating and refinements columns to Feedback
ALTER TABLE "Feedback" ADD COLUMN "rating" INTEGER;
ALTER TABLE "Feedback" ADD COLUMN "refinements" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Make message optional (default empty string for backward compat)
ALTER TABLE "Feedback" ALTER COLUMN "message" SET DEFAULT '';
