-- Kettlebell Exercises Seed File
-- Run this in Supabase SQL Editor
-- System exercises for kettlebell training

INSERT INTO "ExerciseDefinition" (
  id,
  name,
  "normalizedName",
  aliases,
  category,
  "isSystem",
  "createdBy",
  "userId",
  equipment,
  "primaryFAUs",
  "secondaryFAUs",
  "createdAt",
  "updatedAt"
) VALUES
-- Ballistic/Power exercises
('ex_kb_001', 'Kettlebell Swing', 'kettlebell swing', ARRAY['kb swing', 'russian swing', 'two hand swing'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['glutes', 'hamstrings', 'lower-back'], ARRAY['front-delts', 'abs'], NOW(), NOW()),
('ex_kb_002', 'Single Arm Kettlebell Swing', 'single arm kettlebell swing', ARRAY['one arm swing', 'single kb swing'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['glutes', 'hamstrings', 'lower-back'], ARRAY['front-delts', 'abs', 'obliques'], NOW(), NOW()),
('ex_kb_003', 'American Kettlebell Swing', 'american kettlebell swing', ARRAY['american swing', 'overhead swing'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['glutes', 'hamstrings', 'front-delts'], ARRAY['lower-back', 'abs'], NOW(), NOW()),
('ex_kb_004', 'Kettlebell Snatch', 'kettlebell snatch', ARRAY['kb snatch', 'single arm snatch'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['front-delts', 'glutes', 'hamstrings'], ARRAY['traps', 'abs', 'forearms'], NOW(), NOW()),
('ex_kb_005', 'Kettlebell Clean', 'kettlebell clean', ARRAY['kb clean', 'single arm clean'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['hamstrings', 'glutes', 'front-delts'], ARRAY['traps', 'abs', 'forearms'], NOW(), NOW()),
('ex_kb_006', 'Kettlebell Clean and Press', 'kettlebell clean and press', ARRAY['kb clean and press'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['front-delts', 'hamstrings', 'glutes'], ARRAY['traps', 'triceps', 'abs'], NOW(), NOW()),
('ex_kb_007', 'Kettlebell High Pull', 'kettlebell high pull', ARRAY['kb high pull'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['traps', 'front-delts', 'hamstrings'], ARRAY['glutes', 'abs'], NOW(), NOW()),

-- Pressing exercises
('ex_kb_008', 'Kettlebell Press', 'kettlebell press', ARRAY['kb press', 'kettlebell shoulder press', 'single arm kb press'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['front-delts', 'triceps'], ARRAY['abs', 'chest'], NOW(), NOW()),
('ex_kb_009', 'Kettlebell Push Press', 'kettlebell push press', ARRAY['kb push press'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['front-delts', 'triceps'], ARRAY['quads', 'abs'], NOW(), NOW()),
('ex_kb_010', 'Kettlebell Floor Press', 'kettlebell floor press', ARRAY['kb floor press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('ex_kb_011', 'Kettlebell Thruster', 'kettlebell thruster', ARRAY['kb thruster'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['quads', 'front-delts'], ARRAY['glutes', 'triceps', 'abs'], NOW(), NOW()),

-- Squatting exercises
('ex_kb_012', 'Kettlebell Goblet Squat', 'kettlebell goblet squat', ARRAY['kb goblet squat', 'goblet squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['quads', 'glutes'], ARRAY['abs', 'mid-back'], NOW(), NOW()),
('ex_kb_013', 'Kettlebell Front Squat', 'kettlebell front squat', ARRAY['kb front squat', 'double kettlebell front squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['quads', 'glutes'], ARRAY['abs', 'mid-back'], NOW(), NOW()),
('ex_kb_014', 'Kettlebell Pistol Squat', 'kettlebell pistol squat', ARRAY['kb pistol squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),

-- Lunging exercises
('ex_kb_015', 'Kettlebell Lunge', 'kettlebell lunge', ARRAY['kb lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),
('ex_kb_016', 'Kettlebell Reverse Lunge', 'kettlebell reverse lunge', ARRAY['kb reverse lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),

-- Rowing exercises
('ex_kb_017', 'Kettlebell Row', 'kettlebell row', ARRAY['kb row', 'single arm kettlebell row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('ex_kb_018', 'Kettlebell Renegade Row', 'kettlebell renegade row', ARRAY['renegade row', 'kb renegade row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['lats', 'mid-back', 'abs'], ARRAY['biceps', 'front-delts'], NOW(), NOW()),

-- Deadlift variations
('ex_kb_019', 'Kettlebell Deadlift', 'kettlebell deadlift', ARRAY['kb deadlift'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['hamstrings', 'glutes', 'lower-back'], ARRAY['traps', 'forearms'], NOW(), NOW()),
('ex_kb_020', 'Single Leg Kettlebell Deadlift', 'single leg kettlebell deadlift', ARRAY['single leg kb deadlift', 'kb single leg rdl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['hamstrings', 'glutes'], ARRAY['lower-back', 'abs'], NOW(), NOW()),

-- Core exercises
('ex_kb_021', 'Kettlebell Turkish Get-Up', 'kettlebell turkish get-up', ARRAY['turkish get up', 'tgu', 'kb turkish get up'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['abs', 'front-delts'], ARRAY['glutes', 'quads', 'triceps'], NOW(), NOW()),
('ex_kb_022', 'Kettlebell Windmill', 'kettlebell windmill', ARRAY['kb windmill'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['obliques', 'front-delts'], ARRAY['glutes', 'hamstrings'], NOW(), NOW()),
('ex_kb_023', 'Kettlebell Halo', 'kettlebell halo', ARRAY['kb halo'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['front-delts', 'side-delts'], ARRAY['abs', 'mid-back'], NOW(), NOW()),
('ex_kb_024', 'Kettlebell Russian Twist', 'kettlebell russian twist', ARRAY['kb russian twist'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['obliques', 'abs'], ARRAY[]::text[], NOW(), NOW()),

-- Carries
('ex_kb_025', 'Kettlebell Farmer Carry', 'kettlebell farmer carry', ARRAY['kb farmer carry', 'kettlebell farmers walk'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['forearms', 'traps'], ARRAY['abs', 'calves'], NOW(), NOW()),
('ex_kb_026', 'Kettlebell Rack Carry', 'kettlebell rack carry', ARRAY['kb rack carry', 'rack walk'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['abs', 'front-delts'], ARRAY['calves', 'mid-back'], NOW(), NOW()),
('ex_kb_027', 'Kettlebell Overhead Carry', 'kettlebell overhead carry', ARRAY['kb overhead carry', 'overhead walk'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['front-delts', 'abs'], ARRAY['triceps', 'calves'], NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
