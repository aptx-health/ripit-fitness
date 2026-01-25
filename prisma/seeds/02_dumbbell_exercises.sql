-- Dumbbell Exercises Seed File
-- Run this in Supabase SQL Editor
-- System exercises for dumbbell training

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
-- Chest exercises
('ex_db_001', 'Incline Dumbbell Bench Press', 'incline dumbbell bench press', ARRAY['incline db bench', 'incline dumbbell press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'incline bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('ex_db_002', 'Decline Dumbbell Bench Press', 'decline dumbbell bench press', ARRAY['decline db bench', 'decline dumbbell press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'decline bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('ex_db_003', 'Dumbbell Fly', 'dumbbell fly', ARRAY['db fly', 'dumbbell flys', 'chest fly'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'bench'], ARRAY['chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_db_004', 'Incline Dumbbell Fly', 'incline dumbbell fly', ARRAY['incline db fly', 'incline chest fly'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'incline bench'], ARRAY['chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_db_005', 'Dumbbell Pullover', 'dumbbell pullover', ARRAY['db pullover', 'pullover'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'bench'], ARRAY['chest', 'lats'], ARRAY['triceps'], NOW(), NOW()),

-- Shoulder exercises
('ex_db_006', 'Dumbbell Shoulder Press', 'dumbbell shoulder press', ARRAY['db shoulder press', 'seated db press', 'dumbbell press'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'bench'], ARRAY['front-delts', 'triceps'], ARRAY['side-delts'], NOW(), NOW()),
('ex_db_007', 'Arnold Press', 'arnold press', ARRAY['arnold shoulder press', 'arnold dumbbell press'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'bench'], ARRAY['front-delts', 'side-delts', 'triceps'], ARRAY['chest'], NOW(), NOW()),
('ex_db_008', 'Front Raise', 'front raise', ARRAY['dumbbell front raise', 'db front raise'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['front-delts'], ARRAY['chest'], NOW(), NOW()),
('ex_db_009', 'Rear Delt Fly', 'rear delt fly', ARRAY['reverse fly', 'bent over fly', 'rear delt raise'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['rear-delts'], ARRAY['mid-back', 'traps'], NOW(), NOW()),
('ex_db_010', 'Upright Row', 'upright row', ARRAY['dumbbell upright row', 'db upright row'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['side-delts', 'traps'], ARRAY['biceps'], NOW(), NOW()),

-- Back exercises
('ex_db_011', 'Single Arm Dumbbell Row', 'single arm dumbbell row', ARRAY['one arm db row', 'single arm row', 'one arm dumbbell row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'bench'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('ex_db_012', 'Bent Over Dumbbell Row', 'bent over dumbbell row', ARRAY['bent over db row', 'two arm dumbbell row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('ex_db_013', 'Dumbbell Deadlift', 'dumbbell deadlift', ARRAY['db deadlift', 'dumbbell dl'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['hamstrings', 'glutes', 'lower-back'], ARRAY['traps', 'forearms'], NOW(), NOW()),
('ex_db_014', 'Dumbbell Romanian Deadlift', 'dumbbell romanian deadlift', ARRAY['db rdl', 'dumbbell rdl'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['hamstrings', 'glutes'], ARRAY['lower-back', 'forearms'], NOW(), NOW()),
('ex_db_015', 'Dumbbell Shrug', 'dumbbell shrug', ARRAY['db shrug', 'dumbbell shrugs'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['traps'], ARRAY['forearms'], NOW(), NOW()),

-- Arm exercises - Biceps
('ex_db_016', 'Dumbbell Curl', 'dumbbell curl', ARRAY['db curl', 'dumbbell curls', 'bicep curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_db_017', 'Alternating Dumbbell Curl', 'alternating dumbbell curl', ARRAY['alternating db curl', 'alternate dumbbell curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_db_018', 'Incline Dumbbell Curl', 'incline dumbbell curl', ARRAY['incline db curl', 'incline bicep curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'incline bench'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_db_019', 'Concentration Curl', 'concentration curl', ARRAY['seated concentration curl', 'dumbbell concentration curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'bench'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_db_020', 'Preacher Curl', 'preacher curl', ARRAY['dumbbell preacher curl', 'db preacher curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'preacher bench'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_db_021', 'Spider Curl', 'spider curl', ARRAY['spider curls', 'incline spider curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'incline bench'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_db_022', 'Zottman Curl', 'zottman curl', ARRAY['zottman curls'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['biceps', 'forearms'], ARRAY[]::text[], NOW(), NOW()),

-- Arm exercises - Triceps
('ex_db_023', 'Dumbbell Overhead Tricep Extension', 'dumbbell overhead tricep extension', ARRAY['overhead db extension', 'dumbbell tricep extension', 'two arm overhead extension'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_db_024', 'Single Arm Overhead Tricep Extension', 'single arm overhead tricep extension', ARRAY['one arm overhead extension', 'single arm db extension'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_db_025', 'Dumbbell Tricep Kickback', 'dumbbell tricep kickback', ARRAY['tricep kickback', 'db kickback'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_db_026', 'Tate Press', 'tate press', ARRAY['tate db press'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'bench'], ARRAY['triceps'], ARRAY['chest'], NOW(), NOW()),
('ex_db_027', 'Dumbbell Skull Crusher', 'dumbbell skull crusher', ARRAY['db skull crusher', 'lying tricep extension'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'bench'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),

-- Leg exercises
('ex_db_028', 'Dumbbell Goblet Squat', 'dumbbell goblet squat', ARRAY['goblet squat', 'db goblet squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['quads', 'glutes'], ARRAY['abs'], NOW(), NOW()),
('ex_db_029', 'Dumbbell Front Squat', 'dumbbell front squat', ARRAY['db front squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['quads', 'glutes'], ARRAY['abs'], NOW(), NOW()),
('ex_db_030', 'Dumbbell Sumo Squat', 'dumbbell sumo squat', ARRAY['db sumo squat', 'sumo goblet squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['quads', 'glutes', 'adductors'], ARRAY['hamstrings'], NOW(), NOW()),
('ex_db_031', 'Dumbbell Bulgarian Split Squat', 'dumbbell bulgarian split squat', ARRAY['db bulgarian split squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'bench'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),
('ex_db_032', 'Dumbbell Lunge', 'dumbbell lunge', ARRAY['db lunge', 'dumbbell forward lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),
('ex_db_033', 'Dumbbell Reverse Lunge', 'dumbbell reverse lunge', ARRAY['db reverse lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),
('ex_db_034', 'Dumbbell Walking Lunge', 'dumbbell walking lunge', ARRAY['db walking lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),
('ex_db_035', 'Dumbbell Step-Up', 'dumbbell step-up', ARRAY['db step up', 'dumbbell step up'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'bench'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('ex_db_036', 'Dumbbell Calf Raise', 'dumbbell calf raise', ARRAY['db calf raise', 'dumbbell calf raises'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['calves'], ARRAY[]::text[], NOW(), NOW()),

-- Glute exercises
('ex_db_037', 'Dumbbell Hip Thrust', 'dumbbell hip thrust', ARRAY['db hip thrust'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells', 'bench'], ARRAY['glutes', 'hamstrings'], ARRAY['lower-back'], NOW(), NOW()),
('ex_db_038', 'Dumbbell Single Leg Deadlift', 'dumbbell single leg deadlift', ARRAY['db single leg deadlift', 'single leg rdl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['hamstrings', 'glutes'], ARRAY['lower-back', 'abs'], NOW(), NOW()),
('ex_db_039', 'Dumbbell Stiff Leg Deadlift', 'dumbbell stiff leg deadlift', ARRAY['db stiff leg deadlift', 'dumbbell sldl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['hamstrings', 'glutes'], ARRAY['lower-back'], NOW(), NOW()),

-- Core exercises
('ex_db_040', 'Dumbbell Side Bend', 'dumbbell side bend', ARRAY['db side bend', 'side bends'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['obliques'], ARRAY[]::text[], NOW(), NOW()),
('ex_db_041', 'Dumbbell Russian Twist', 'dumbbell russian twist', ARRAY['db russian twist', 'weighted russian twist'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['obliques', 'abs'], ARRAY[]::text[], NOW(), NOW()),
('ex_db_042', 'Dumbbell Woodchop', 'dumbbell woodchop', ARRAY['db woodchop', 'wood chop'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['obliques'], ARRAY['front-delts'], NOW(), NOW()),

-- Forearm exercises
('ex_db_043', 'Dumbbell Wrist Curl', 'dumbbell wrist curl', ARRAY['db wrist curl', 'wrist curls'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['forearms'], ARRAY[]::text[], NOW(), NOW()),
('ex_db_044', 'Dumbbell Reverse Wrist Curl', 'dumbbell reverse wrist curl', ARRAY['db reverse wrist curl', 'reverse wrist curls'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['forearms'], ARRAY[]::text[], NOW(), NOW()),
('ex_db_045', 'Farmer Walk', 'farmer walk', ARRAY['farmers walk', 'farmer carry', 'farmers carry'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['forearms', 'traps'], ARRAY['abs', 'calves'], NOW(), NOW()),

-- Full body
('ex_db_046', 'Dumbbell Thruster', 'dumbbell thruster', ARRAY['db thruster', 'dumbbell squat press'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['quads', 'front-delts'], ARRAY['glutes', 'triceps', 'abs'], NOW(), NOW()),
('ex_db_047', 'Dumbbell Snatch', 'dumbbell snatch', ARRAY['db snatch', 'single arm snatch'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['front-delts', 'glutes', 'hamstrings'], ARRAY['traps', 'abs', 'triceps'], NOW(), NOW()),
('ex_db_048', 'Dumbbell Clean', 'dumbbell clean', ARRAY['db clean', 'dumbbell hang clean'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['hamstrings', 'glutes', 'front-delts'], ARRAY['traps', 'abs'], NOW(), NOW()),
('ex_db_049', 'Dumbbell Clean and Press', 'dumbbell clean and press', ARRAY['db clean and press'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['front-delts', 'hamstrings', 'glutes'], ARRAY['traps', 'triceps', 'abs'], NOW(), NOW()),
('ex_db_050', 'Man Maker', 'man maker', ARRAY['manmaker', 'dumbbell man maker'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['chest', 'front-delts', 'quads', 'lats'], ARRAY['triceps', 'abs'], NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
