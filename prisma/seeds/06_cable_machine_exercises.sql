-- Cable and Machine Exercises Seed File
-- Run this in Supabase SQL Editor
-- System exercises for cable and machine-based training

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
-- Cable chest exercises
('ex_cm_001', 'Cable Chest Fly', 'cable chest fly', ARRAY['cable fly', 'cable flys'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_002', 'Cable Crossover', 'cable crossover', ARRAY['cable crossovers', 'high cable fly'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_003', 'Low to High Cable Fly', 'low to high cable fly', ARRAY['low cable fly', 'upward cable fly'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_004', 'Cable Chest Press', 'cable chest press', ARRAY['standing cable press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),

-- Cable back exercises
('ex_cm_005', 'Lat Pulldown', 'lat pulldown', ARRAY['wide grip pulldown', 'lat pull down'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['lats'], ARRAY['biceps', 'mid-back'], NOW(), NOW()),
('ex_cm_006', 'Close Grip Lat Pulldown', 'close grip lat pulldown', ARRAY['close grip pulldown', 'narrow grip pulldown'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['lats', 'mid-back'], ARRAY['biceps'], NOW(), NOW()),
('ex_cm_007', 'Reverse Grip Lat Pulldown', 'reverse grip lat pulldown', ARRAY['underhand pulldown', 'supinated pulldown'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['lats', 'biceps'], ARRAY['mid-back'], NOW(), NOW()),
('ex_cm_008', 'Straight Arm Pulldown', 'straight arm pulldown', ARRAY['straight arm lat pulldown', 'stiff arm pulldown'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['lats'], ARRAY['triceps', 'front-delts'], NOW(), NOW()),
('ex_cm_009', 'Seated Cable Row', 'seated cable row', ARRAY['cable row', 'seated row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('ex_cm_010', 'Single Arm Cable Row', 'single arm cable row', ARRAY['one arm cable row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),

-- Cable shoulder exercises
('ex_cm_011', 'Cable Lateral Raise', 'cable lateral raise', ARRAY['cable side raise'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['side-delts'], ARRAY['traps'], NOW(), NOW()),
('ex_cm_012', 'Cable Front Raise', 'cable front raise', ARRAY['cable front raises'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['front-delts'], ARRAY['chest'], NOW(), NOW()),
('ex_cm_013', 'Cable Reverse Fly', 'cable reverse fly', ARRAY['cable rear delt fly', 'bent over cable fly'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['rear-delts'], ARRAY['mid-back', 'traps'], NOW(), NOW()),
('ex_cm_014', 'Cable Face Pull', 'cable face pull', ARRAY['face pulls', 'rope face pull'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['rear-delts', 'mid-back'], ARRAY['traps'], NOW(), NOW()),
('ex_cm_015', 'Cable Upright Row', 'cable upright row', ARRAY['cable upright rows'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['side-delts', 'traps'], ARRAY['biceps'], NOW(), NOW()),

-- Cable arm exercises
('ex_cm_016', 'Cable Bicep Curl', 'cable bicep curl', ARRAY['cable curl', 'cable curls'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_cm_017', 'Cable Hammer Curl', 'cable hammer curl', ARRAY['rope hammer curl', 'cable rope curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_cm_018', 'Cable Tricep Pushdown', 'cable tricep pushdown', ARRAY['tricep pushdown', 'cable pushdown', 'rope pushdown'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_cm_019', 'Cable Overhead Tricep Extension', 'cable overhead tricep extension', ARRAY['cable overhead extension', 'rope overhead extension'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_cm_020', 'Cable Tricep Kickback', 'cable tricep kickback', ARRAY['cable kickback'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),

-- Cable leg exercises
('ex_cm_021', 'Cable Pull Through', 'cable pull through', ARRAY['cable pullthrough'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['glutes', 'hamstrings'], ARRAY['lower-back'], NOW(), NOW()),
('ex_cm_022', 'Cable Kickback', 'cable kickback', ARRAY['glute kickback', 'cable glute kickback'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('ex_cm_023', 'Cable Hip Abduction', 'cable hip abduction', ARRAY['cable leg abduction', 'standing cable abduction'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['glutes'], ARRAY[]::text[], NOW(), NOW()),
('ex_cm_024', 'Cable Hip Adduction', 'cable hip adduction', ARRAY['cable leg adduction', 'standing cable adduction'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['adductors'], ARRAY[]::text[], NOW(), NOW()),

-- Cable core exercises
('ex_cm_025', 'Cable Crunch', 'cable crunch', ARRAY['rope crunch', 'kneeling cable crunch'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['abs'], ARRAY[]::text[], NOW(), NOW()),
('ex_cm_026', 'Cable Woodchop', 'cable woodchop', ARRAY['wood chop', 'cable wood chop'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['obliques'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_027', 'Cable Pallof Press', 'cable pallof press', ARRAY['pallof press'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['abs', 'obliques'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_028', 'Cable Russian Twist', 'cable russian twist', ARRAY['standing cable twist'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['obliques', 'abs'], ARRAY[]::text[], NOW(), NOW()),

-- Machine-specific exercises
('ex_cm_029', 'Smith Machine Bench Press', 'smith machine bench press', ARRAY['smith bench', 'smith bench press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['smith machine', 'bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_030', 'Smith Machine Squat', 'smith machine squat', ARRAY['smith squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['smith machine'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('ex_cm_031', 'Pec Deck Fly', 'pec deck fly', ARRAY['pec deck', 'machine fly', 'chest fly machine'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pec deck machine'], ARRAY['chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_032', 'Machine Chest Press', 'machine chest press', ARRAY['chest press machine'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['chest press machine'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_033', 'Machine Shoulder Press', 'machine shoulder press', ARRAY['shoulder press machine'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['shoulder press machine'], ARRAY['front-delts', 'triceps'], ARRAY['side-delts'], NOW(), NOW()),
('ex_cm_034', 'Hack Squat', 'hack squat', ARRAY['hack squat machine'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['hack squat machine'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
