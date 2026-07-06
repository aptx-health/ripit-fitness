-- Distinguishes "no equipment record" (assume full gym) from an intentional,
-- possibly-minimal user selection (#927). Existing rows with a non-empty
-- equipmentAvailable list are backfilled to set=true so they keep their choice.
ALTER TABLE "UserTrainingProfile"
  ADD COLUMN "equipmentAvailableSet" BOOLEAN NOT NULL DEFAULT false;

UPDATE "UserTrainingProfile"
  SET "equipmentAvailableSet" = true
  WHERE array_length("equipmentAvailable", 1) > 0;
