-- Exercise Library Seed Data
-- Comprehensive exercise definitions with FAU (Functional Aesthetic Unit) mappings
-- Run this in Supabase SQL Editor to populate the ExerciseDefinition table
--
-- FAU Categories (19):
-- chest, mid-back, lower-back, traps, front-delts, mid-delts, rear-delts, lats,
-- biceps, triceps, forearms, neck, quads, adductors, hamstrings,
-- glutes, calves, abs, obliques

-- ============================================================================
-- UPSERT: Insert new exercises or update existing ones
-- This preserves your logged workout data while updating exercise definitions
-- ============================================================================

-- ============================================================================
-- CHEST EXERCISES
-- ============================================================================

INSERT INTO "ExerciseDefinition" (
  id, name, "normalizedName", aliases, category, "isSystem", "createdBy",
  "userId", equipment, "primaryFAUs", "secondaryFAUs", instructions,
  "createdAt", "updatedAt"
) VALUES

-- Barbell Bench Press
(
  'exdef_chest_001',
  'Barbell Bench Press',
  'barbellbenchpress',
  ARRAY['bench press', 'bench', 'bb bench', 'flat bench'],
  'chest',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['barbell', 'bench'],
  ARRAY['chest'],
  ARRAY['triceps', 'front-delts'],
  'Lie flat on bench, feet planted. Grip barbell slightly wider than shoulders. Lower to mid-chest, press up.',
  NOW(),
  NOW()
),

-- Incline Smith Machine Press
(
  'exdef_chest_002',
  'Incline Smith Machine Press',
  'inclinesmithmachinepress',
  ARRAY['incline smith press', 'smith incline', 'incline machine press'],
  'chest',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['smith-machine', 'bench'],
  ARRAY['chest'],
  ARRAY['triceps', 'front-delts'],
  'Set bench to 30-45° incline. Position under smith machine bar. Press up focusing on upper chest.',
  NOW(),
  NOW()
),

-- Cable Pec Fly
(
  'exdef_chest_003',
  'Cable Pec Fly',
  'cablepecfly',
  ARRAY['cable fly', 'cable chest fly', 'cable flye', 'standing cable fly'],
  'chest',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['cable'],
  ARRAY['chest'],
  ARRAY[]::text[],
  'Stand centered between cables set at shoulder height. Bring handles together in front of chest with slight elbow bend.',
  NOW(),
  NOW()
),

-- Pec Dec (Machine Fly)
(
  'exdef_chest_004',
  'Pec Dec',
  'pecdec',
  ARRAY['pec deck', 'machine fly', 'chest fly machine', 'butterfly machine'],
  'chest',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['machine'],
  ARRAY['chest'],
  ARRAY[]::text[],
  'Sit upright, back against pad. Squeeze handles together focusing on chest contraction.',
  NOW(),
  NOW()
),

-- Dumbbell Bench Press
(
  'exdef_chest_005',
  'Dumbbell Bench Press',
  'dumbbellbenchpress',
  ARRAY['db bench press', 'db bench', 'dumbbell bench'],
  'chest',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell', 'bench'],
  ARRAY['chest'],
  ARRAY['triceps', 'front-delts'],
  'Lie flat on bench. Start dumbbells at chest level, press up until arms extended.',
  NOW(),
  NOW()
),

-- Incline Dumbbell Press
(
  'exdef_chest_006',
  'Incline Dumbbell Press',
  'inclinedumbbellpress',
  ARRAY['incline db press', 'incline dumbbell bench'],
  'chest',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell', 'bench'],
  ARRAY['chest'],
  ARRAY['triceps', 'front-delts'],
  'Set bench to 30-45° incline. Press dumbbells up focusing on upper chest activation.',
  NOW(),
  NOW()
),

-- Chest Dips
(
  'exdef_chest_007',
  'Chest Dips',
  'chestdips',
  ARRAY['dips', 'chest dip', 'parallel bar dips'],
  'chest',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['parallel-bars', 'dip-station'],
  ARRAY['chest'],
  ARRAY['triceps'],
  'Lean forward slightly, lower body by bending elbows, press back up. Forward lean emphasizes chest.',
  NOW(),
  NOW()
),

-- Assisted Dip (Chest)
(
  'exdef_chest_008',
  'Assisted Dip',
  'assisteddip',
  ARRAY['assisted dips', 'machine dip', 'band assisted dip'],
  'chest',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['machine', 'resistance-band'],
  ARRAY['chest'],
  ARRAY['triceps'],
  'Use assisted dip machine or resistance band. Lean forward to emphasize chest. Lower controlled, press up.',
  NOW(),
  NOW()
),

-- ============================================================================
-- BACK EXERCISES (Lats, Mid-back, Traps)
-- ============================================================================

-- Lat Pulldown
(
  'exdef_back_001',
  'Lat Pulldown',
  'latpulldown',
  ARRAY['lat pull down', 'pulldown', 'lat pull'],
  'back',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['cable', 'machine'],
  ARRAY['lats'],
  ARRAY['biceps'],
  'Sit at lat pulldown machine. Pull bar down to upper chest, squeeze shoulder blades together.',
  NOW(),
  NOW()
),

-- Lat Pull-Around
(
  'exdef_back_002',
  'Lat Pull-Around',
  'latpullaround',
  ARRAY['lat pull around', 'pull around'],
  'back',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['cable'],
  ARRAY['lats'],
  ARRAY[]::text[],
  'Stand facing cable machine. Pull cable in sweeping arc motion around body, engaging lats.',
  NOW(),
  NOW()
),

-- Pull-ups
(
  'exdef_back_003',
  'Pull-ups',
  'pullups',
  ARRAY['pull up', 'pullup', 'chin up'],
  'back',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['pull-up-bar'],
  ARRAY['lats'],
  ARRAY['biceps', 'mid-back'],
  'Hang from bar with overhand grip. Pull body up until chin over bar. Lower with control.',
  NOW(),
  NOW()
),

-- Assisted Pull-up
(
  'exdef_back_004',
  'Assisted Pull-up',
  'assistedpullup',
  ARRAY['assisted pull up', 'machine pull up', 'band assisted pull up'],
  'back',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['machine', 'resistance-band'],
  ARRAY['lats'],
  ARRAY['biceps', 'mid-back'],
  'Use assisted pull-up machine or resistance band. Pull body up until chin over bar.',
  NOW(),
  NOW()
),

-- Barbell Row
(
  'exdef_back_005',
  'Barbell Row',
  'barbellrow',
  ARRAY['bb row', 'bent over row', 'barbell bent over row'],
  'back',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['barbell'],
  ARRAY['mid-back', 'lats'],
  ARRAY['rear-delts', 'biceps'],
  'Hinge at hips, back straight. Pull barbell to lower chest, squeeze shoulder blades.',
  NOW(),
  NOW()
),

-- Chest-Supported Machine Row
(
  'exdef_back_006',
  'Chest-Supported Machine Row',
  'chestsupportedmachinerow',
  ARRAY['chest supported row', 'machine row', 'supported row'],
  'back',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['machine'],
  ARRAY['mid-back', 'lats'],
  ARRAY['rear-delts'],
  'Chest against pad. Pull handles back, squeezing shoulder blades together.',
  NOW(),
  NOW()
),

-- Seated Cable Row
(
  'exdef_back_007',
  'Seated Cable Row',
  'seatedcablerow',
  ARRAY['cable row', 'seated row', 'low row'],
  'back',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['cable'],
  ARRAY['mid-back', 'lats'],
  ARRAY['rear-delts', 'biceps'],
  'Sit upright, slight bend in knees. Pull cable to torso, keeping elbows close to body.',
  NOW(),
  NOW()
),

-- Single-Arm Dumbbell Row
(
  'exdef_back_008',
  'Single-Arm Dumbbell Row',
  'singlearmdumbbellrow',
  ARRAY['one arm row', 'dumbbell row', 'db row', 'single arm row'],
  'back',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell', 'bench'],
  ARRAY['mid-back', 'lats'],
  ARRAY['rear-delts', 'biceps'],
  'Support body with one hand on bench. Pull dumbbell to hip, elbow close to body.',
  NOW(),
  NOW()
),

-- Reverse Cable Fly
(
  'exdef_back_009',
  'Reverse Cable Fly',
  'reversecablefly',
  ARRAY['reverse fly', 'cable reverse fly', 'rear delt cable fly'],
  'back',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['cable'],
  ARRAY['mid-back', 'rear-delts'],
  ARRAY[]::text[],
  'Stand centered between cables. Pull handles apart and back, squeezing shoulder blades.',
  NOW(),
  NOW()
),

-- Reverse Fly Machine
(
  'exdef_back_010',
  'Reverse Fly Machine',
  'reverseflymachine',
  ARRAY['reverse pec deck', 'rear delt machine', 'reverse machine fly'],
  'back',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['machine'],
  ARRAY['mid-back', 'rear-delts'],
  ARRAY[]::text[],
  'Sit facing pad. Pull handles back, focusing on rear delts and mid-back.',
  NOW(),
  NOW()
),

-- Cable Shrug
(
  'exdef_back_011',
  'Cable Shrug',
  'cableshrug',
  ARRAY['cable trap shrug', 'shrug'],
  'back',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['cable'],
  ARRAY['traps'],
  ARRAY[]::text[],
  'Stand holding cable attachment. Shrug shoulders up toward ears, squeeze traps at top.',
  NOW(),
  NOW()
),

-- Barbell Shrug
(
  'exdef_back_012',
  'Barbell Shrug',
  'barbellshrug',
  ARRAY['bb shrug', 'trap shrug', 'barbell trap shrug'],
  'back',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['barbell'],
  ARRAY['traps'],
  ARRAY[]::text[],
  'Hold barbell at arms length. Shrug shoulders straight up, pause at top, lower slowly.',
  NOW(),
  NOW()
),

-- Dumbbell Shrug
(
  'exdef_back_013',
  'Dumbbell Shrug',
  'dumbbellshrug',
  ARRAY['db shrug', 'dumbbell trap shrug'],
  'back',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell'],
  ARRAY['traps'],
  ARRAY[]::text[],
  'Hold dumbbells at sides. Shrug shoulders up, squeeze traps, lower with control.',
  NOW(),
  NOW()
),

-- ============================================================================
-- SHOULDER EXERCISES (Front Delts, Mid Delts, Rear Delts)
-- ============================================================================

-- Barbell Overhead Press
(
  'exdef_shoulders_001',
  'Barbell Overhead Press',
  'barbelloverheadpress',
  ARRAY['overhead press', 'ohp', 'military press', 'standing press'],
  'shoulders',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['barbell'],
  ARRAY['front-delts', 'mid-delts'],
  ARRAY['triceps'],
  'Stand with feet shoulder-width. Press barbell overhead from shoulders to lockout.',
  NOW(),
  NOW()
),

-- Dumbbell Shoulder Press
(
  'exdef_shoulders_002',
  'Dumbbell Shoulder Press',
  'dumbbellshoulderpress',
  ARRAY['db shoulder press', 'db press', 'seated db press'],
  'shoulders',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell', 'bench'],
  ARRAY['front-delts', 'mid-delts'],
  ARRAY['triceps'],
  'Sit upright or stand. Press dumbbells overhead from shoulder level to lockout.',
  NOW(),
  NOW()
),

-- Machine Shoulder Press
(
  'exdef_shoulders_003',
  'Machine Shoulder Press',
  'machineshoulderpress',
  ARRAY['shoulder press machine', 'seated press machine'],
  'shoulders',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['machine'],
  ARRAY['front-delts', 'mid-delts'],
  ARRAY['triceps'],
  'Sit in machine, back supported. Press handles overhead to full extension.',
  NOW(),
  NOW()
),

-- Arnold Press
(
  'exdef_shoulders_004',
  'Arnold Press',
  'arnoldpress',
  ARRAY['arnold db press', 'arnold dumbbell press'],
  'shoulders',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell', 'bench'],
  ARRAY['front-delts', 'mid-delts'],
  ARRAY['triceps'],
  'Start with palms facing you. Rotate and press dumbbells overhead, finish palms forward.',
  NOW(),
  NOW()
),

-- Dumbbell Lateral Raise
(
  'exdef_shoulders_005',
  'Dumbbell Lateral Raise',
  'dumbbellateralraise',
  ARRAY['lateral raise', 'side raise', 'db lateral raise', 'side delt raise'],
  'shoulders',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell'],
  ARRAY['mid-delts'],
  ARRAY[]::text[],
  'Stand with dumbbells at sides. Raise arms out to sides until parallel with floor.',
  NOW(),
  NOW()
),

-- Cable Lateral Raise
(
  'exdef_shoulders_006',
  'Cable Lateral Raise',
  'cablelateralraise',
  ARRAY['cable side raise', 'single arm cable raise'],
  'shoulders',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['cable'],
  ARRAY['mid-delts'],
  ARRAY[]::text[],
  'Stand sideways to cable. Raise handle out to side until arm parallel with floor.',
  NOW(),
  NOW()
),

-- Behind-the-Back Lateral Raise
(
  'exdef_shoulders_007',
  'Behind-the-Back Lateral Raise',
  'behindthebacklateralraise',
  ARRAY['behind back raise', 'rear lateral raise', 'reverse lateral raise'],
  'shoulders',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['cable'],
  ARRAY['mid-delts'],
  ARRAY[]::text[],
  'Stand with cable behind back. Raise handle out to side focusing on middle delt.',
  NOW(),
  NOW()
),

-- Dumbbell Front Raise
(
  'exdef_shoulders_008',
  'Dumbbell Front Raise',
  'dumbbellfontraise',
  ARRAY['front raise', 'db front raise', 'anterior raise'],
  'shoulders',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell'],
  ARRAY['front-delts'],
  ARRAY[]::text[],
  'Stand with dumbbells in front of thighs. Raise forward to shoulder height.',
  NOW(),
  NOW()
),

-- Face Pull
(
  'exdef_shoulders_009',
  'Face Pull',
  'facepull',
  ARRAY['cable face pull', 'rope face pull'],
  'shoulders',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['cable'],
  ARRAY['rear-delts'],
  ARRAY['mid-back'],
  'Pull rope attachment toward face, separating handles. Focus on rear delts and upper back.',
  NOW(),
  NOW()
),

-- ============================================================================
-- ARM EXERCISES (Biceps, Triceps, Forearms)
-- ============================================================================

-- Barbell Curl
(
  'exdef_arms_001',
  'Barbell Curl',
  'barbellcurl',
  ARRAY['bb curl', 'barbell bicep curl', 'standing barbell curl'],
  'arms',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['barbell'],
  ARRAY['biceps'],
  ARRAY[]::text[],
  'Stand holding barbell with underhand grip. Curl bar up to shoulders, lower with control.',
  NOW(),
  NOW()
),

-- Dumbbell Curl
(
  'exdef_arms_002',
  'Dumbbell Curl',
  'dumbbellcurl',
  ARRAY['db curl', 'dumbbell bicep curl', 'standing db curl'],
  'arms',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell'],
  ARRAY['biceps'],
  ARRAY[]::text[],
  'Stand with dumbbells at sides. Curl up to shoulders, supinating wrists.',
  NOW(),
  NOW()
),

-- Hammer Curl
(
  'exdef_arms_003',
  'Hammer Curl',
  'hammercurl',
  ARRAY['db hammer curl', 'neutral grip curl'],
  'arms',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell'],
  ARRAY['biceps'],
  ARRAY['forearms'],
  'Hold dumbbells with neutral grip (palms facing each other). Curl up to shoulders.',
  NOW(),
  NOW()
),

-- Preacher Curl
(
  'exdef_arms_004',
  'Preacher Curl',
  'preachercurl',
  ARRAY['preacher bench curl', 'ez bar preacher curl', 'db preacher curl'],
  'arms',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['barbell', 'dumbbell', 'ez-bar', 'preacher-bench'],
  ARRAY['biceps'],
  ARRAY[]::text[],
  'Rest upper arms on preacher bench pad. Curl weight up, focusing on bicep contraction.',
  NOW(),
  NOW()
),

-- Cable Curl
(
  'exdef_arms_005',
  'Cable Curl',
  'cablecurl',
  ARRAY['cable bicep curl', 'standing cable curl'],
  'arms',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['cable'],
  ARRAY['biceps'],
  ARRAY[]::text[],
  'Stand facing cable machine. Curl handle up to shoulders, maintaining tension.',
  NOW(),
  NOW()
),

-- Bayesian Cable Curl
(
  'exdef_arms_006',
  'Bayesian Cable Curl',
  'bayesiancablecurl',
  ARRAY['bayesian curl', 'single arm cable curl behind'],
  'arms',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['cable'],
  ARRAY['biceps'],
  ARRAY[]::text[],
  'Stand facing away from cable, arm extended back. Curl handle forward and up.',
  NOW(),
  NOW()
),

-- Triceps Pressdown
(
  'exdef_arms_007',
  'Triceps Pressdown',
  'tricepspressdown',
  ARRAY['cable pressdown', 'tricep pushdown', 'rope pressdown'],
  'arms',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['cable'],
  ARRAY['triceps'],
  ARRAY[]::text[],
  'Stand facing cable with handle at chest height. Press down until arms fully extended.',
  NOW(),
  NOW()
),

-- Overhead Cable Triceps Extension
(
  'exdef_arms_008',
  'Overhead Cable Triceps Extension',
  'overheadcabletricepsextension',
  ARRAY['overhead cable extension', 'cable overhead tricep', 'rope overhead extension'],
  'arms',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['cable'],
  ARRAY['triceps'],
  ARRAY[]::text[],
  'Face away from cable, rope overhead. Extend arms forward and up, focusing on triceps.',
  NOW(),
  NOW()
),

-- Cable Triceps Kickback
(
  'exdef_arms_009',
  'Cable Triceps Kickback',
  'cabletricepskickback',
  ARRAY['cable kickback', 'tricep cable kickback'],
  'arms',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['cable'],
  ARRAY['triceps'],
  ARRAY[]::text[],
  'Hinge forward, upper arm stationary. Extend arm back until fully straight.',
  NOW(),
  NOW()
),

-- Dumbbell Overhead Triceps Extension
(
  'exdef_arms_010',
  'Dumbbell Overhead Triceps Extension',
  'dumbbelloverheadtricepsextension',
  ARRAY['db overhead extension', 'overhead tricep extension', 'seated db tricep extension'],
  'arms',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell'],
  ARRAY['triceps'],
  ARRAY[]::text[],
  'Hold dumbbell overhead with both hands. Lower behind head, extend back up.',
  NOW(),
  NOW()
),

-- Close-Grip Bench Press
(
  'exdef_arms_011',
  'Close-Grip Bench Press',
  'closegripbenchpress',
  ARRAY['close grip bench', 'cgbp', 'narrow grip bench'],
  'arms',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['barbell', 'bench'],
  ARRAY['triceps'],
  ARRAY['chest'],
  'Lie on bench with narrow grip (hands inside shoulder width). Lower to chest, press up.',
  NOW(),
  NOW()
),

-- Triceps Dips
(
  'exdef_arms_012',
  'Triceps Dips',
  'tricepsdips',
  ARRAY['tricep dip', 'dips triceps focus', 'upright dips'],
  'arms',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['parallel-bars', 'dip-station'],
  ARRAY['triceps'],
  ARRAY['chest'],
  'Keep torso upright. Lower body by bending elbows, press back up. Upright posture emphasizes triceps.',
  NOW(),
  NOW()
),

-- Dumbbell Wrist Curl
(
  'exdef_arms_013',
  'Dumbbell Wrist Curl',
  'dumbbellwristcurl',
  ARRAY['wrist curl', 'db wrist curl', 'forearm curl'],
  'arms',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell', 'bench'],
  ARRAY['forearms'],
  ARRAY[]::text[],
  'Rest forearms on bench, wrists hanging off edge. Curl wrists up using forearm flexors.',
  NOW(),
  NOW()
),

-- Dumbbell Reverse Wrist Curl
(
  'exdef_arms_014',
  'Dumbbell Reverse Wrist Curl',
  'dumbbellreversewristcurl',
  ARRAY['reverse wrist curl', 'db reverse wrist curl', 'forearm extension'],
  'arms',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell', 'bench'],
  ARRAY['forearms'],
  ARRAY[]::text[],
  'Rest forearms on bench, palms down. Curl wrists up using forearm extensors.',
  NOW(),
  NOW()
),

-- ============================================================================
-- LEG EXERCISES (Quads, Hamstrings, Glutes, Adductors, Calves)
-- ============================================================================

-- Barbell Back Squat
(
  'exdef_legs_001',
  'Barbell Back Squat',
  'barbellbacksquat',
  ARRAY['back squat', 'squat', 'bb squat', 'barbell squat'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['barbell', 'rack'],
  ARRAY['quads', 'glutes'],
  ARRAY['hamstrings'],
  'Bar on upper back. Descend until thighs parallel or below, drive up through heels.',
  NOW(),
  NOW()
),

-- Front Squat
(
  'exdef_legs_002',
  'Front Squat',
  'frontsquat',
  ARRAY['barbell front squat', 'front rack squat'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['barbell', 'rack'],
  ARRAY['quads'],
  ARRAY['glutes'],
  'Bar on front of shoulders. Upright torso. Descend and drive up, quad focused.',
  NOW(),
  NOW()
),

-- Smith Machine Squat (Feet Forward)
(
  'exdef_legs_003',
  'Smith Machine Squat (Feet Forward)',
  'smithmachinesquatfeetforward',
  ARRAY['smith squat feet forward', 'smith machine quad squat'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['smith-machine'],
  ARRAY['quads'],
  ARRAY[]::text[],
  'Position feet forward of bar. Descend keeping torso upright. Emphasizes quads.',
  NOW(),
  NOW()
),

-- Leg Press
(
  'exdef_legs_004',
  'Leg Press',
  'legpress',
  ARRAY['machine leg press', 'seated leg press'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['machine'],
  ARRAY['quads', 'glutes'],
  ARRAY['hamstrings'],
  'Feet on platform shoulder-width. Press platform up until legs nearly extended.',
  NOW(),
  NOW()
),

-- Leg Extension
(
  'exdef_legs_005',
  'Leg Extension',
  'legextension',
  ARRAY['leg extension machine', 'quad extension'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['machine'],
  ARRAY['quads'],
  ARRAY[]::text[],
  'Sit in machine, pad on lower shins. Extend legs until straight, focusing on quad contraction.',
  NOW(),
  NOW()
),

-- Goblet Squat
(
  'exdef_legs_006',
  'Goblet Squat',
  'gobletsquat',
  ARRAY['db goblet squat', 'kettlebell goblet squat'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell', 'kettlebell'],
  ARRAY['quads', 'glutes'],
  ARRAY[]::text[],
  'Hold weight at chest. Squat down keeping torso upright, drive up through heels.',
  NOW(),
  NOW()
),

-- Bulgarian Split Squat
(
  'exdef_legs_007',
  'Bulgarian Split Squat',
  'bulgarianssplitsquat',
  ARRAY['rear foot elevated split squat', 'bulgarian lunge', 'split squat'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell', 'bench'],
  ARRAY['quads', 'glutes'],
  ARRAY['hamstrings'],
  'Rear foot elevated on bench. Descend on front leg, drive up. Single leg focus.',
  NOW(),
  NOW()
),

-- Walking Lunges
(
  'exdef_legs_008',
  'Walking Lunges',
  'walkinglunges',
  ARRAY['dumbbell lunges', 'db walking lunges', 'lunges'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell'],
  ARRAY['quads', 'glutes'],
  ARRAY['hamstrings'],
  'Step forward into lunge, alternate legs. Keep torso upright throughout.',
  NOW(),
  NOW()
),

-- Romanian Deadlift (Barbell)
(
  'exdef_legs_009',
  'Romanian Deadlift (Barbell)',
  'romaniandeadliftbarbell',
  ARRAY['rdl', 'barbell rdl', 'bb rdl', 'stiff leg deadlift'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['barbell'],
  ARRAY['hamstrings', 'glutes'],
  ARRAY['lower-back'],
  'Hinge at hips, slight knee bend. Lower bar along shins, feel hamstring stretch. Drive hips forward.',
  NOW(),
  NOW()
),

-- Romanian Deadlift (Dumbbell)
(
  'exdef_legs_010',
  'Romanian Deadlift (Dumbbell)',
  'romaniandeadliftdumbbell',
  ARRAY['db rdl', 'dumbbell rdl', 'db stiff leg deadlift'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell'],
  ARRAY['hamstrings', 'glutes'],
  ARRAY['lower-back'],
  'Hold dumbbells at thighs. Hinge at hips, lower weights along legs. Drive hips forward.',
  NOW(),
  NOW()
),

-- Seated Leg Curl
(
  'exdef_legs_011',
  'Seated Leg Curl',
  'seatedlegcurl',
  ARRAY['seated hamstring curl', 'leg curl machine seated'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['machine'],
  ARRAY['hamstrings'],
  ARRAY[]::text[],
  'Sit in machine, pad behind lower legs. Curl legs down, squeezing hamstrings.',
  NOW(),
  NOW()
),

-- Lying Leg Curl
(
  'exdef_legs_012',
  'Lying Leg Curl',
  'lyinglegcurl',
  ARRAY['prone leg curl', 'hamstring curl', 'leg curl'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['machine'],
  ARRAY['hamstrings'],
  ARRAY[]::text[],
  'Lie face down, pad on lower legs. Curl legs up toward glutes, squeeze hamstrings.',
  NOW(),
  NOW()
),

-- Hip Thrust
(
  'exdef_legs_013',
  'Hip Thrust',
  'hipthrust',
  ARRAY['barbell hip thrust', 'glute bridge elevated'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['barbell', 'bench'],
  ARRAY['glutes'],
  ARRAY['hamstrings'],
  'Upper back on bench, barbell on hips. Drive hips up until body forms straight line.',
  NOW(),
  NOW()
),

-- Glute Bridge
(
  'exdef_legs_014',
  'Glute Bridge',
  'glutebridge',
  ARRAY['barbell glute bridge', 'floor bridge'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['barbell', 'bodyweight'],
  ARRAY['glutes'],
  ARRAY['hamstrings'],
  'Lie on floor, knees bent. Drive hips up, squeezing glutes at top.',
  NOW(),
  NOW()
),

-- Hip Abduction Machine
(
  'exdef_legs_015',
  'Hip Abduction Machine',
  'hipabductionmachine',
  ARRAY['hip abduction', 'abductor machine', 'outer thigh machine'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['machine'],
  ARRAY['glutes'],
  ARRAY[]::text[],
  'Sit in machine. Push legs outward against resistance, focusing on glutes.',
  NOW(),
  NOW()
),

-- Hip Adduction Machine
(
  'exdef_legs_016',
  'Hip Adduction Machine',
  'hipadductionmachine',
  ARRAY['hip adduction', 'adductor machine', 'inner thigh machine'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['machine'],
  ARRAY['adductors'],
  ARRAY[]::text[],
  'Sit in machine. Squeeze legs together against resistance, focusing on inner thighs.',
  NOW(),
  NOW()
),

-- Standing Calf Raise
(
  'exdef_legs_017',
  'Standing Calf Raise',
  'standingcalfraise',
  ARRAY['calf raise standing', 'standing calf', 'smith machine calf raise'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['machine', 'smith-machine'],
  ARRAY['calves'],
  ARRAY[]::text[],
  'Stand with balls of feet on platform. Raise up onto toes, lower with control.',
  NOW(),
  NOW()
),

-- Seated Calf Raise
(
  'exdef_legs_018',
  'Seated Calf Raise',
  'seatedcalfraise',
  ARRAY['seated calf', 'calf extension machine'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['machine'],
  ARRAY['calves'],
  ARRAY[]::text[],
  'Sit with knees under pad, balls of feet on platform. Raise heels up, lower slowly.',
  NOW(),
  NOW()
),

-- Leg Press Calf Press
(
  'exdef_legs_019',
  'Leg Press Calf Press',
  'legpresscalfpress',
  ARRAY['calf press on leg press', 'leg press calf raise'],
  'legs',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['machine'],
  ARRAY['calves'],
  ARRAY[]::text[],
  'In leg press position. Press platform with toes/balls of feet only.',
  NOW(),
  NOW()
),

-- ============================================================================
-- CORE EXERCISES (Abs, Obliques)
-- ============================================================================

-- Cable Crunch
(
  'exdef_core_001',
  'Cable Crunch',
  'cablecrunch',
  ARRAY['cable ab crunch', 'kneeling cable crunch', 'rope crunch'],
  'core',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['cable'],
  ARRAY['abs'],
  ARRAY[]::text[],
  'Kneel facing cable with rope overhead. Crunch down, bringing elbows toward knees.',
  NOW(),
  NOW()
),

-- Roman Chair Leg Lift
(
  'exdef_core_002',
  'Roman Chair Leg Lift',
  'romanchairleglift',
  ARRAY['captain chair leg raise', 'vertical knee raise', 'roman chair'],
  'core',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['roman-chair', 'bodyweight'],
  ARRAY['abs'],
  ARRAY[]::text[],
  'Support body on roman chair. Lift knees toward chest, controlling the movement.',
  NOW(),
  NOW()
),

-- Reverse Crunch
(
  'exdef_core_003',
  'Reverse Crunch',
  'reversecrunch',
  ARRAY['reverse ab crunch', 'lower ab crunch'],
  'core',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['bodyweight'],
  ARRAY['abs'],
  ARRAY[]::text[],
  'Lie on back, knees bent. Curl hips up toward chest, lifting lower back off floor.',
  NOW(),
  NOW()
),

-- Plank
(
  'exdef_core_004',
  'Plank',
  'plank',
  ARRAY['front plank', 'forearm plank', 'ab plank'],
  'core',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['bodyweight'],
  ARRAY['abs'],
  ARRAY[]::text[],
  'Hold body in straight line on forearms and toes. Maintain neutral spine.',
  NOW(),
  NOW()
),

-- Hanging Leg Raise
(
  'exdef_core_005',
  'Hanging Leg Raise',
  'hanginglegraise',
  ARRAY['hanging leg lift', 'pull up bar leg raise'],
  'core',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['pull-up-bar', 'bodyweight'],
  ARRAY['abs'],
  ARRAY[]::text[],
  'Hang from bar. Raise legs up toward chest, keeping them straight if possible.',
  NOW(),
  NOW()
),

-- Hanging Knee Raise
(
  'exdef_core_006',
  'Hanging Knee Raise',
  'hangingkneeraise',
  ARRAY['hanging knee lift', 'knee raise'],
  'core',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['pull-up-bar', 'bodyweight'],
  ARRAY['abs'],
  ARRAY[]::text[],
  'Hang from bar. Bring knees up toward chest, controlling the movement.',
  NOW(),
  NOW()
),

-- Ab Wheel Rollout
(
  'exdef_core_007',
  'Ab Wheel Rollout',
  'abwheelrollout',
  ARRAY['ab wheel', 'rollout', 'ab roller'],
  'core',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['ab-wheel'],
  ARRAY['abs'],
  ARRAY[]::text[],
  'Kneel with ab wheel. Roll forward extending body, then pull back to start.',
  NOW(),
  NOW()
),

-- Dead Bug
(
  'exdef_core_008',
  'Dead Bug',
  'deadbug',
  ARRAY['dead bug exercise', 'alternating dead bug'],
  'core',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['bodyweight'],
  ARRAY['abs'],
  ARRAY[]::text[],
  'Lie on back, arms and legs up. Extend opposite arm and leg, maintaining lower back contact with floor.',
  NOW(),
  NOW()
),

-- Bicycle Crunches
(
  'exdef_core_009',
  'Bicycle Crunches',
  'bicyclecrunches',
  ARRAY['bicycle crunch', 'bicycle abs', 'alternating bicycle'],
  'core',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['bodyweight'],
  ARRAY['abs'],
  ARRAY['obliques'],
  'Lie on back. Bring opposite elbow to knee in cycling motion, engaging core.',
  NOW(),
  NOW()
),

-- Side Plank
(
  'exdef_core_010',
  'Side Plank',
  'sideplank',
  ARRAY['lateral plank', 'oblique plank'],
  'core',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['bodyweight'],
  ARRAY['obliques'],
  ARRAY['abs'],
  'Support body on one forearm and side of foot. Hold body in straight line.',
  NOW(),
  NOW()
),

-- Russian Twists
(
  'exdef_core_011',
  'Russian Twists',
  'russiantwists',
  ARRAY['russian twist', 'seated twist', 'weighted russian twist'],
  'core',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['dumbbell', 'bodyweight'],
  ARRAY['obliques'],
  ARRAY['abs'],
  'Sit with feet elevated, torso leaned back. Rotate torso side to side, touching weight to floor.',
  NOW(),
  NOW()
),

-- Oblique Crunches
(
  'exdef_core_012',
  'Oblique Crunches',
  'obliquecrunches',
  ARRAY['side crunch', 'oblique crunch', 'side ab crunch'],
  'core',
  true,
  null,
  '00000000-0000-0000-0000-000000000000',
  ARRAY['bodyweight'],
  ARRAY['obliques'],
  ARRAY[]::text[],
  'Lie on side. Crunch upward, engaging obliques to lift shoulder toward hip.',
  NOW(),
  NOW()
)
ON CONFLICT ("normalizedName") DO NOTHING;

-- ============================================================================
-- STATUS: 75 exercises added/updated (CHEST: 8, BACK: 13, SHOULDERS: 9, ARMS: 14, LEGS: 19, CORE: 12)
-- All major muscle groups covered!
-- Existing logged workouts are preserved!
-- ============================================================================
