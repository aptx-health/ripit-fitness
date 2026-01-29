-- Add copyStatus field to Program and CardioProgram tables
-- This field tracks the cloning status: 'ready' (default), 'cloning', or NULL

-- Add copyStatus to Program table
ALTER TABLE "Program"
ADD COLUMN "copyStatus" TEXT DEFAULT 'ready';

-- Add copyStatus to CardioProgram table
ALTER TABLE "CardioProgram"
ADD COLUMN "copyStatus" TEXT DEFAULT 'ready';

-- Optional: Add comment to document the field
COMMENT ON COLUMN "Program"."copyStatus" IS 'Tracks program cloning status: ready, cloning';
COMMENT ON COLUMN "CardioProgram"."copyStatus" IS 'Tracks program cloning status: ready, cloning';
