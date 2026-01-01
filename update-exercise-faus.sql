-- ============================================================================
-- UPDATE STATEMENTS: Add FAUs and equipment to 14 matched exercises
-- These exercises are currently in use and match our exercise library
-- ============================================================================

-- 1. Cable Triceps Kickback
UPDATE "ExerciseDefinition"
SET
  "primaryFAUs" = ARRAY['triceps'],
  "secondaryFAUs" = ARRAY[]::text[],
  equipment = ARRAY['cable'],
  aliases = ARRAY['cable kickback', 'tricep cable kickback', 'cable triceps kickback'],
  instructions = 'Hinge forward, upper arm stationary. Extend arm back until fully straight.',
  "updatedAt" = NOW()
WHERE "normalizedName" = 'cable triceps kickback';

-- 2. Cable Crunch
UPDATE "ExerciseDefinition"
SET
  "primaryFAUs" = ARRAY['abs'],
  "secondaryFAUs" = ARRAY[]::text[],
  equipment = ARRAY['cable'],
  aliases = ARRAY['cable ab crunch', 'kneeling cable crunch', 'rope crunch', 'cable crunch'],
  instructions = 'Kneel facing cable with rope overhead. Crunch down, bringing elbows toward knees.',
  "updatedAt" = NOW()
WHERE "normalizedName" = 'cable crunch';

-- 3. Assisted Pull-up
UPDATE "ExerciseDefinition"
SET
  "primaryFAUs" = ARRAY['lats'],
  "secondaryFAUs" = ARRAY['biceps', 'mid-back'],
  equipment = ARRAY['machine', 'resistance-band'],
  aliases = ARRAY['assisted pull up', 'machine pull up', 'band assisted pull up', 'assisted pull-up'],
  instructions = 'Use assisted pull-up machine or resistance band. Pull body up until chin over bar.',
  "updatedAt" = NOW()
WHERE "normalizedName" = 'assisted pull-up';

-- 4. Behind-the-Back Lateral Raise
UPDATE "ExerciseDefinition"
SET
  "primaryFAUs" = ARRAY['mid-delts'],
  "secondaryFAUs" = ARRAY[]::text[],
  equipment = ARRAY['cable'],
  aliases = ARRAY['behind back raise', 'rear lateral raise', 'reverse lateral raise', 'behind-the-back lateral raise'],
  instructions = 'Stand with cable behind back. Raise handle out to side focusing on middle delt.',
  "updatedAt" = NOW()
WHERE "normalizedName" = 'behind-the-back lateral raise';

-- 5. Leg Press
UPDATE "ExerciseDefinition"
SET
  "primaryFAUs" = ARRAY['quads', 'glutes'],
  "secondaryFAUs" = ARRAY['hamstrings'],
  equipment = ARRAY['machine'],
  aliases = ARRAY['machine leg press', 'seated leg press', 'leg press'],
  instructions = 'Feet on platform shoulder-width. Press platform up until legs nearly extended.',
  "updatedAt" = NOW()
WHERE "normalizedName" = 'leg press';

-- 6. Leg Press Calf Press
UPDATE "ExerciseDefinition"
SET
  "primaryFAUs" = ARRAY['calves'],
  "secondaryFAUs" = ARRAY[]::text[],
  equipment = ARRAY['machine'],
  aliases = ARRAY['calf press on leg press', 'leg press calf raise', 'leg press calf press'],
  instructions = 'In leg press position. Press platform with toes/balls of feet only.',
  "updatedAt" = NOW()
WHERE "normalizedName" = 'leg press calf press';

-- 7. Chest-Supported Machine Row
UPDATE "ExerciseDefinition"
SET
  "primaryFAUs" = ARRAY['mid-back', 'lats'],
  "secondaryFAUs" = ARRAY['rear-delts'],
  equipment = ARRAY['machine'],
  aliases = ARRAY['chest supported row', 'machine row', 'supported row', 'chest supported machine row'],
  instructions = 'Chest against pad. Pull handles back, squeezing shoulder blades together.',
  "updatedAt" = NOW()
WHERE "normalizedName" = 'chest supported machine row';

-- 8. Front Squat
UPDATE "ExerciseDefinition"
SET
  "primaryFAUs" = ARRAY['quads'],
  "secondaryFAUs" = ARRAY['glutes'],
  equipment = ARRAY['barbell', 'rack'],
  aliases = ARRAY['barbell front squat', 'front rack squat', 'front squat'],
  instructions = 'Bar on front of shoulders. Upright torso. Descend and drive up, quad focused.',
  "updatedAt" = NOW()
WHERE "normalizedName" = 'front squat';

-- 9. Leg Extension
UPDATE "ExerciseDefinition"
SET
  "primaryFAUs" = ARRAY['quads'],
  "secondaryFAUs" = ARRAY[]::text[],
  equipment = ARRAY['machine'],
  aliases = ARRAY['leg extension machine', 'quad extension', 'leg extension'],
  instructions = 'Sit in machine, pad on lower shins. Extend legs until straight, focusing on quad contraction.',
  "updatedAt" = NOW()
WHERE "normalizedName" = 'leg extension';

-- 10. Incline Dumbbell Press (matches "incline db press")
UPDATE "ExerciseDefinition"
SET
  "primaryFAUs" = ARRAY['chest'],
  "secondaryFAUs" = ARRAY['triceps', 'front-delts'],
  equipment = ARRAY['dumbbell', 'bench'],
  aliases = ARRAY['incline db press', 'incline dumbbell bench', 'incline dumbbell press'],
  instructions = 'Set bench to 30-45° incline. Press dumbbells up focusing on upper chest activation.',
  "updatedAt" = NOW()
WHERE "normalizedName" = 'incline db press';

-- 11. Seated Leg Curl (matches "leg curl")
UPDATE "ExerciseDefinition"
SET
  "primaryFAUs" = ARRAY['hamstrings'],
  "secondaryFAUs" = ARRAY[]::text[],
  equipment = ARRAY['machine'],
  aliases = ARRAY['seated hamstring curl', 'leg curl machine seated', 'leg curl', 'seated leg curl'],
  instructions = 'Sit in machine, pad behind lower legs. Curl legs down, squeezing hamstrings.',
  "updatedAt" = NOW()
WHERE "normalizedName" = 'leg curl';

-- 12. Seated Calf Raise (matches "calf raise")
UPDATE "ExerciseDefinition"
SET
  "primaryFAUs" = ARRAY['calves'],
  "secondaryFAUs" = ARRAY[]::text[],
  equipment = ARRAY['machine'],
  aliases = ARRAY['seated calf', 'calf extension machine', 'calf raise', 'seated calf raise'],
  instructions = 'Sit with knees under pad, balls of feet on platform. Raise heels up, lower slowly.',
  "updatedAt" = NOW()
WHERE "normalizedName" = 'calf raise';

-- 13. Roman Chair Leg Lift (matches "roman chair leg raise")
UPDATE "ExerciseDefinition"
SET
  "primaryFAUs" = ARRAY['abs'],
  "secondaryFAUs" = ARRAY[]::text[],
  equipment = ARRAY['roman-chair', 'bodyweight'],
  aliases = ARRAY['captain chair leg raise', 'vertical knee raise', 'roman chair', 'roman chair leg raise', 'roman chair leg lift'],
  instructions = 'Support body on roman chair. Lift knees toward chest, controlling the movement.',
  "updatedAt" = NOW()
WHERE "normalizedName" = 'roman chair leg raise';

-- 14. Romanian Deadlift (Barbell) - matches "paused barbell rdl"
UPDATE "ExerciseDefinition"
SET
  "primaryFAUs" = ARRAY['hamstrings', 'glutes'],
  "secondaryFAUs" = ARRAY['lower-back'],
  equipment = ARRAY['barbell'],
  aliases = ARRAY['rdl', 'barbell rdl', 'bb rdl', 'stiff leg deadlift', 'paused barbell rdl', 'paused rdl', 'romanian deadlift barbell'],
  instructions = 'Hinge at hips, slight knee bend. Lower bar along shins, feel hamstring stretch. Drive hips forward.',
  "updatedAt" = NOW()
WHERE "normalizedName" = 'paused barbell rdl';

-- ============================================================================
-- VERIFICATION QUERY: Run this after to confirm all 14 were updated
-- ============================================================================

SELECT
  name,
  "normalizedName",
  "primaryFAUs",
  "secondaryFAUs",
  equipment
FROM "ExerciseDefinition"
WHERE "normalizedName" IN (
  'cable triceps kickback',
  'cable crunch',
  'assisted pull-up',
  'behind-the-back lateral raise',
  'leg press',
  'leg press calf press',
  'chest supported machine row',
  'front squat',
  'leg extension',
  'incline db press',
  'leg curl',
  'calf raise',
  'roman chair leg raise',
  'paused barbell rdl'
)
ORDER BY name;
