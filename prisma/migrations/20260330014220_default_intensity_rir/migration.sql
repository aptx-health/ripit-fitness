-- AlterTable: change default intensity rating from RPE to RIR
ALTER TABLE "UserSettings" ALTER COLUMN "defaultIntensityRating" SET DEFAULT 'rir';
