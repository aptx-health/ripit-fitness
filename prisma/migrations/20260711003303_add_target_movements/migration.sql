-- Curated "anchor" compound movements (#976): { [anchorPattern]: exerciseId[] }.
-- Additive, nullable — no backfill; a null/absent value reads as "no anchors configured".
ALTER TABLE "UserTrainingProfile" ADD COLUMN "targetMovements" JSONB;
