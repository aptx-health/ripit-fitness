-- Removes the work-153 preview accounts (coach-153/sam-153@test.com) and everything they own from the local wt1 DB.
-- Run: PGPASSWORD=postgres psql -h localhost -p 5434 -U postgres -d ripit -v ON_ERROR_STOP=1 -f initiatives/workout-library/docs/assets/153/remove-preview-data.sql
BEGIN;
CREATE TEMP TABLE preview_ids AS SELECT id FROM "user" WHERE email IN ('coach-153@test.com','sam-153@test.com');
DELETE FROM "Proposal" WHERE "userId" IN (SELECT id FROM preview_ids);
DELETE FROM "CoachLink" WHERE "coachUserId" IN (SELECT id FROM preview_ids) OR "traineeUserId" IN (SELECT id FROM preview_ids);
DELETE FROM "CoachInvite" WHERE "coachUserId" IN (SELECT id FROM preview_ids);
DELETE FROM "Program" WHERE "userId" IN (SELECT id FROM preview_ids);
DELETE FROM "SavedWorkout" WHERE "userId" IN (SELECT id FROM preview_ids);
DELETE FROM "UserSettings" WHERE "userId" IN (SELECT id FROM preview_ids);
DELETE FROM "session" WHERE "userId" IN (SELECT id FROM preview_ids);
DELETE FROM "account" WHERE "userId" IN (SELECT id FROM preview_ids);
DELETE FROM "user" WHERE id IN (SELECT id FROM preview_ids);
COMMIT;
