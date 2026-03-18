-- Cable and Machine Exercises Seed File
-- System exercises for cable and machine-based training
-- Equipment tags normalized to match constants in program-metadata.ts

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
('ex_cm_001', 'Cable Chest Fly', 'cable chest fly', ARRAY['cable fly', 'cable flys'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_002', 'Cable Crossover', 'cable crossover', ARRAY['cable crossovers', 'high cable fly'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_003', 'Low to High Cable Fly', 'low to high cable fly', ARRAY['low cable fly', 'upward cable fly'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_004', 'Cable Chest Press', 'cable chest press', ARRAY['standing cable press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),

-- Cable back exercises
('ex_cm_005', 'Lat Pulldown', 'lat pulldown', ARRAY['wide grip pulldown', 'lat pull down'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['lats'], ARRAY['biceps', 'mid-back'], NOW(), NOW()),
('ex_cm_006', 'Close Grip Lat Pulldown', 'close grip lat pulldown', ARRAY['close grip pulldown', 'narrow grip pulldown'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['lats', 'mid-back'], ARRAY['biceps'], NOW(), NOW()),
('ex_cm_007', 'Reverse Grip Lat Pulldown', 'reverse grip lat pulldown', ARRAY['underhand pulldown', 'supinated pulldown'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['lats', 'biceps'], ARRAY['mid-back'], NOW(), NOW()),
('ex_cm_008', 'Straight Arm Pulldown', 'straight arm pulldown', ARRAY['straight arm lat pulldown', 'stiff arm pulldown'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['lats'], ARRAY['triceps', 'front-delts'], NOW(), NOW()),
('ex_cm_009', 'Seated Cable Row', 'seated cable row', ARRAY['cable row', 'seated row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('ex_cm_010', 'Single Arm Cable Row', 'single arm cable row', ARRAY['one arm cable row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),

-- Cable shoulder exercises
('ex_cm_011', 'Cable Lateral Raise', 'cable lateral raise', ARRAY['cable side raise'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['side-delts'], ARRAY['traps'], NOW(), NOW()),
('ex_cm_012', 'Cable Front Raise', 'cable front raise', ARRAY['cable front raises'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['front-delts'], ARRAY['chest'], NOW(), NOW()),
('ex_cm_013', 'Cable Reverse Fly', 'cable reverse fly', ARRAY['cable rear delt fly', 'bent over cable fly'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['rear-delts'], ARRAY['mid-back', 'traps'], NOW(), NOW()),
('ex_cm_014', 'Cable Face Pull', 'cable face pull', ARRAY['face pulls', 'rope face pull'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['rear-delts', 'mid-back'], ARRAY['traps'], NOW(), NOW()),
('ex_cm_015', 'Cable Upright Row', 'cable upright row', ARRAY['cable upright rows'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['side-delts', 'traps'], ARRAY['biceps'], NOW(), NOW()),

-- Cable arm exercises
('ex_cm_016', 'Cable Bicep Curl', 'cable bicep curl', ARRAY['cable curl', 'cable curls'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_cm_017', 'Cable Hammer Curl', 'cable hammer curl', ARRAY['rope hammer curl', 'cable rope curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_cm_018', 'Cable Tricep Pushdown', 'cable tricep pushdown', ARRAY['tricep pushdown', 'cable pushdown', 'rope pushdown'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_cm_019', 'Cable Overhead Tricep Extension', 'cable overhead tricep extension', ARRAY['cable overhead extension', 'rope overhead extension'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_cm_020', 'Cable Tricep Kickback', 'cable tricep kickback', ARRAY['cable kickback'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),

-- Cable leg exercises
('ex_cm_021', 'Cable Pull Through', 'cable pull through', ARRAY['cable pullthrough'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['glutes', 'hamstrings'], ARRAY['lower-back'], NOW(), NOW()),
('ex_cm_022', 'Cable Kickback', 'cable kickback', ARRAY['glute kickback', 'cable glute kickback'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('ex_cm_023', 'Cable Hip Abduction', 'cable hip abduction', ARRAY['cable leg abduction', 'standing cable abduction'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['glutes'], ARRAY[]::text[], NOW(), NOW()),
('ex_cm_024', 'Cable Hip Adduction', 'cable hip adduction', ARRAY['cable leg adduction', 'standing cable adduction'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['adductors'], ARRAY[]::text[], NOW(), NOW()),

-- Cable core exercises
('ex_cm_025', 'Cable Crunch', 'cable crunch', ARRAY['rope crunch', 'kneeling cable crunch'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['abs'], ARRAY[]::text[], NOW(), NOW()),
('ex_cm_026', 'Cable Woodchop', 'cable woodchop', ARRAY['wood chop', 'cable wood chop'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['obliques'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_027', 'Cable Pallof Press', 'cable pallof press', ARRAY['pallof press'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['abs', 'obliques'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_028', 'Cable Russian Twist', 'cable russian twist', ARRAY['standing cable twist'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['obliques', 'abs'], ARRAY[]::text[], NOW(), NOW()),

-- Smith machine exercises
('ex_cm_029', 'Smith Machine Bench Press', 'smith machine bench press', ARRAY['smith bench', 'smith bench press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['smith_machine', 'bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_030', 'Smith Machine Squat', 'smith machine squat', ARRAY['smith squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['smith_machine'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),

-- Gym machine exercises — chest
('ex_cm_032', 'Machine Chest Press', 'machine chest press', ARRAY['chest press machine', 'seated chest press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),

-- Gym machine exercises — back
('ex_cm_035', 'Machine Chest Supported Row', 'machine chest supported row', ARRAY['chest supported row', 'seated row machine', 'machine row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('ex_cm_036', 'Machine Lat Pulldown', 'machine lat pulldown', ARRAY['pulldown machine', 'lat pull machine'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['lats'], ARRAY['biceps', 'mid-back'], NOW(), NOW()),
('ex_cm_037', 'Machine Back Extension', 'machine back extension', ARRAY['back extension machine', 'roman chair', 'hyperextension'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['lower-back', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),

-- Gym machine exercises — shoulders
('ex_cm_033', 'Machine Shoulder Press', 'machine shoulder press', ARRAY['shoulder press machine', 'seated machine press'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['front-delts', 'triceps'], ARRAY['side-delts'], NOW(), NOW()),

-- Gym machine exercises — arms
('ex_cm_038', 'Machine Dip', 'machine dip', ARRAY['dip machine', 'assisted dip', 'machine tricep dip'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['triceps', 'chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_039', 'Machine Preacher Curl', 'machine preacher curl', ARRAY['preacher curl machine', 'machine bicep curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),

-- Gym machine exercises — legs
('ex_cm_040', 'Machine Leg Adduction', 'machine leg adduction', ARRAY['adductor machine', 'inner thigh machine', 'hip adduction machine'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['adductors'], ARRAY[]::text[], NOW(), NOW()),
('ex_cm_041', 'Machine Leg Abduction', 'machine leg abduction', ARRAY['abductor machine', 'outer thigh machine', 'hip abduction machine'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['glutes'], ARRAY[]::text[], NOW(), NOW()),

-- Gym machine exercises — core
('ex_cm_042', 'Machine Ab Curl', 'machine ab curl', ARRAY['ab crunch machine', 'ab curl machine', 'seated ab crunch'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['abs'], ARRAY[]::text[], NOW(), NOW()),

-- Barbell exercises (squat rack + barbell)
('ex_cm_043', 'Barbell Hip Thrust', 'barbell hip thrust', ARRAY['bb hip thrust', 'hip thrust'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell', 'bench'], ARRAY['glutes', 'hamstrings'], ARRAY['lower-back'], NOW(), NOW()),
('ex_cm_044', 'Barbell Lunge', 'barbell lunge', ARRAY['bb lunge', 'barbell forward lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),
('ex_cm_045', 'Barbell Shrug', 'barbell shrug', ARRAY['bb shrug', 'barbell shrugs'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['traps'], ARRAY['forearms'], NOW(), NOW()),
('ex_cm_046', 'Close Grip Bench Press', 'close grip bench press', ARRAY['cgbp', 'close grip barbell bench press', 'narrow grip bench'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell', 'bench'], ARRAY['triceps', 'chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_047', 'Barbell Skull Crusher', 'barbell skull crusher', ARRAY['skull crusher', 'lying barbell tricep extension', 'ez bar skull crusher'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell', 'bench'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_cm_048', 'Barbell Good Morning', 'barbell good morning', ARRAY['good morning', 'bb good morning'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['hamstrings', 'lower-back'], ARRAY['glutes'], NOW(), NOW()),

-- Trap bar exercises
('ex_cm_049', 'Trap Bar Deadlift', 'trap bar deadlift', ARRAY['hex bar deadlift', 'trap bar dl'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['trap_bar'], ARRAY['hamstrings', 'glutes', 'quads'], ARRAY['lower-back', 'traps', 'forearms'], NOW(), NOW()),
('ex_cm_050', 'Trap Bar Shrug', 'trap bar shrug', ARRAY['hex bar shrug', 'trap bar shrugs'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['trap_bar'], ARRAY['traps'], ARRAY['forearms'], NOW(), NOW()),
('ex_cm_051', 'Trap Bar Farmer Carry', 'trap bar farmer carry', ARRAY['hex bar farmer walk', 'trap bar carry'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['trap_bar'], ARRAY['forearms', 'traps'], ARRAY['abs', 'calves'], NOW(), NOW()),

-- EZ bar exercises
('ex_cm_052', 'EZ Bar Curl', 'ez bar curl', ARRAY['ez curl', 'ez bar bicep curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['ez_bar'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_cm_053', 'EZ Bar Skull Crusher', 'ez bar skull crusher', ARRAY['ez bar lying tricep extension'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['ez_bar', 'bench'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_cm_054', 'EZ Bar Preacher Curl', 'ez bar preacher curl', ARRAY['ez preacher curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['ez_bar', 'preacher_bench'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),

-- TRX / suspension trainer exercises
('ex_cm_055', 'TRX Row', 'trx row', ARRAY['suspension row', 'trx inverted row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('ex_cm_056', 'TRX Chest Press', 'trx chest press', ARRAY['suspension chest press', 'trx push-up'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['chest', 'triceps'], ARRAY['front-delts', 'abs'], NOW(), NOW()),
('ex_cm_057', 'TRX Y Raise', 'trx y raise', ARRAY['suspension y raise', 'trx y fly'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['rear-delts', 'mid-back'], ARRAY['traps'], NOW(), NOW()),
('ex_cm_058', 'TRX Face Pull', 'trx face pull', ARRAY['suspension face pull'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['rear-delts', 'mid-back'], ARRAY['traps'], NOW(), NOW()),
('ex_cm_059', 'TRX Pistol Squat', 'trx pistol squat', ARRAY['suspension pistol squat', 'trx single leg squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),
('ex_cm_060', 'TRX Hamstring Curl', 'trx hamstring curl', ARRAY['suspension hamstring curl', 'trx leg curl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['hamstrings'], ARRAY['glutes'], NOW(), NOW()),
('ex_cm_061', 'TRX Pike', 'trx pike', ARRAY['suspension pike', 'trx pike push-up'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs', 'front-delts'], ARRAY['triceps'], NOW(), NOW()),
('ex_cm_062', 'TRX Body Saw', 'trx body saw', ARRAY['suspension body saw', 'trx plank saw'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY['front-delts', 'lats'], NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
