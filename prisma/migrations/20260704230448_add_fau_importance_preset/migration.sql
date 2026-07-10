-- Track which importance preset was last applied to a training profile.
-- Attribution only ("based on your Powerlifter preset"); ratings stay editable.
ALTER TABLE "UserTrainingProfile" ADD COLUMN "fauImportancePreset" TEXT;
