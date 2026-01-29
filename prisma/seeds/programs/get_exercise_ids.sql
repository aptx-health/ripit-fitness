-- Query to get ANY 10 exercise definition IDs for testing
-- We just need any 2 exercises to test cloning

SELECT id, name, "normalizedName", "isSystem"
FROM "ExerciseDefinition"
WHERE "isSystem" = true
ORDER BY name
LIMIT 10;
