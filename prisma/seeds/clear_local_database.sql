-- Clear Local Database Script
-- USE WITH CAUTION: This deletes ALL programs and exercises from your local database
-- Only run this on LOCAL development database, NEVER on production!

-- Delete all cardio programs (cascades to weeks and sessions)
DELETE FROM "CardioProgram";

-- Delete all strength programs (cascades to weeks, workouts, exercises, sets)
DELETE FROM "Program";

-- Delete all exercise definitions (includes both system and user exercises)
DELETE FROM "ExerciseDefinition";

-- Delete all community programs (if any)
DELETE FROM "CommunityProgram";

-- Delete all user settings (optional - remove this line if you want to keep settings)
-- DELETE FROM "UserSettings";

-- Delete all cardio metric preferences (optional)
-- DELETE FROM "UserCardioMetricPreferences";

-- Verification queries
SELECT 'Programs' as table_name, COUNT(*) as remaining FROM "Program"
UNION ALL
SELECT 'CardioProgram', COUNT(*) FROM "CardioProgram"
UNION ALL
SELECT 'ExerciseDefinition', COUNT(*) FROM "ExerciseDefinition"
UNION ALL
SELECT 'CommunityProgram', COUNT(*) FROM "CommunityProgram";
