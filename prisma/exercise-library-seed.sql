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
  id, name, "normalizedName", aliases, "primaryFAUs", "secondaryFAUs",
  equipment, instructions, "isSystem", "createdAt", "updatedAt"
) VALUES

-- Barbell Bench Press
(
  'exdef_chest_001',
  'Barbell Bench Press',
  'barbellbenchpress',
  ARRAY['bench press', 'bench', 'bb bench', 'flat bench'],
  ARRAY['chest'],
  ARRAY['triceps', 'front-delts'],
  ARRAY['barbell', 'bench'],
  'Lie flat on bench, feet planted. Grip barbell slightly wider than shoulders. Lower to mid-chest, press up.',
  true,
  NOW(),
  NOW()
),

-- Incline Smith Machine Press
(
  'exdef_chest_002',
  'Incline Smith Machine Press',
  'inclinesmithmachinepress',
  ARRAY['incline smith press', 'smith incline', 'incline machine press'],
  ARRAY['chest'],
  ARRAY['triceps', 'front-delts'],
  ARRAY['smith-machine', 'bench'],
  'Set bench to 30-45° incline. Position under smith machine bar. Press up focusing on upper chest.',
  true,
  NOW(),
  NOW()
),

-- Cable Pec Fly
(
  'exdef_chest_003',
  'Cable Pec Fly',
  'cablepecfly',
  ARRAY['cable fly', 'cable chest fly', 'cable flye', 'standing cable fly'],
  ARRAY['chest'],
  ARRAY[]::text[],
  ARRAY['cable'],
  'Stand centered between cables set at shoulder height. Bring handles together in front of chest with slight elbow bend.',
  true,
  NOW(),
  NOW()
),

-- Pec Dec (Machine Fly)
(
  'exdef_chest_004',
  'Pec Dec',
  'pecdec',
  ARRAY['pec deck', 'machine fly', 'chest fly machine', 'butterfly machine'],
  ARRAY['chest'],
  ARRAY[]::text[],
  ARRAY['machine'],
  'Sit upright, back against pad. Squeeze handles together focusing on chest contraction.',
  true,
  NOW(),
  NOW()
),

-- Dumbbell Bench Press
(
  'exdef_chest_005',
  'Dumbbell Bench Press',
  'dumbbellbenchpress',
  ARRAY['db bench press', 'db bench', 'dumbbell bench'],
  ARRAY['chest'],
  ARRAY['triceps', 'front-delts'],
  ARRAY['dumbbell', 'bench'],
  'Lie flat on bench. Start dumbbells at chest level, press up until arms extended.',
  true,
  NOW(),
  NOW()
),

-- Incline Dumbbell Press
(
  'exdef_chest_006',
  'Incline Dumbbell Press',
  'inclinedumbbellpress',
  ARRAY['incline db press', 'incline dumbbell bench'],
  ARRAY['chest'],
  ARRAY['triceps', 'front-delts'],
  ARRAY['dumbbell', 'bench'],
  'Set bench to 30-45° incline. Press dumbbells up focusing on upper chest activation.',
  true,
  NOW(),
  NOW()
),

-- Chest Dips
(
  'exdef_chest_007',
  'Chest Dips',
  'chestdips',
  ARRAY['dips', 'chest dip', 'parallel bar dips'],
  ARRAY['chest'],
  ARRAY['triceps'],
  ARRAY['parallel-bars', 'dip-station'],
  'Lean forward slightly, lower body by bending elbows, press back up. Forward lean emphasizes chest.',
  true,
  NOW(),
  NOW()
),

-- Assisted Dip (Chest)
(
  'exdef_chest_008',
  'Assisted Dip',
  'assisteddip',
  ARRAY['assisted dips', 'machine dip', 'band assisted dip'],
  ARRAY['chest'],
  ARRAY['triceps'],
  ARRAY['machine', 'resistance-band'],
  'Use assisted dip machine or resistance band. Lean forward to emphasize chest. Lower controlled, press up.',
  true,
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
  ARRAY['lats'],
  ARRAY['biceps'],
  ARRAY['cable', 'machine'],
  'Sit at lat pulldown machine. Pull bar down to upper chest, squeeze shoulder blades together.',
  true,
  NOW(),
  NOW()
),

-- Lat Pull-Around
(
  'exdef_back_002',
  'Lat Pull-Around',
  'latpullaround',
  ARRAY['lat pull around', 'pull around'],
  ARRAY['lats'],
  ARRAY[]::text[],
  ARRAY['cable'],
  'Stand facing cable machine. Pull cable in sweeping arc motion around body, engaging lats.',
  true,
  NOW(),
  NOW()
),

-- Pull-ups
(
  'exdef_back_003',
  'Pull-ups',
  'pullups',
  ARRAY['pull up', 'pullup', 'chin up'],
  ARRAY['lats'],
  ARRAY['biceps', 'mid-back'],
  ARRAY['pull-up-bar'],
  'Hang from bar with overhand grip. Pull body up until chin over bar. Lower with control.',
  true,
  NOW(),
  NOW()
),

-- Assisted Pull-up
(
  'exdef_back_004',
  'Assisted Pull-up',
  'assistedpullup',
  ARRAY['assisted pull up', 'machine pull up', 'band assisted pull up'],
  ARRAY['lats'],
  ARRAY['biceps', 'mid-back'],
  ARRAY['machine', 'resistance-band'],
  'Use assisted pull-up machine or resistance band. Pull body up until chin over bar.',
  true,
  NOW(),
  NOW()
),

-- Barbell Row
(
  'exdef_back_005',
  'Barbell Row',
  'barbellrow',
  ARRAY['bb row', 'bent over row', 'barbell bent over row'],
  ARRAY['mid-back', 'lats'],
  ARRAY['rear-delts', 'biceps'],
  ARRAY['barbell'],
  'Hinge at hips, back straight. Pull barbell to lower chest, squeeze shoulder blades.',
  true,
  NOW(),
  NOW()
),

-- Chest-Supported Machine Row
(
  'exdef_back_006',
  'Chest-Supported Machine Row',
  'chestsupportedmachinerow',
  ARRAY['chest supported row', 'machine row', 'supported row'],
  ARRAY['mid-back', 'lats'],
  ARRAY['rear-delts'],
  ARRAY['machine'],
  'Chest against pad. Pull handles back, squeezing shoulder blades together.',
  true,
  NOW(),
  NOW()
),

-- Seated Cable Row
(
  'exdef_back_007',
  'Seated Cable Row',
  'seatedcablerow',
  ARRAY['cable row', 'seated row', 'low row'],
  ARRAY['mid-back', 'lats'],
  ARRAY['rear-delts', 'biceps'],
  ARRAY['cable'],
  'Sit upright, slight bend in knees. Pull cable to torso, keeping elbows close to body.',
  true,
  NOW(),
  NOW()
),

-- Single-Arm Dumbbell Row
(
  'exdef_back_008',
  'Single-Arm Dumbbell Row',
  'singlearmdumbbellrow',
  ARRAY['one arm row', 'dumbbell row', 'db row', 'single arm row'],
  ARRAY['mid-back', 'lats'],
  ARRAY['rear-delts', 'biceps'],
  ARRAY['dumbbell', 'bench'],
  'Support body with one hand on bench. Pull dumbbell to hip, elbow close to body.',
  true,
  NOW(),
  NOW()
),

-- Reverse Cable Fly
(
  'exdef_back_009',
  'Reverse Cable Fly',
  'reversecablefly',
  ARRAY['reverse fly', 'cable reverse fly', 'rear delt cable fly'],
  ARRAY['mid-back', 'rear-delts'],
  ARRAY[]::text[],
  ARRAY['cable'],
  'Stand centered between cables. Pull handles apart and back, squeezing shoulder blades.',
  true,
  NOW(),
  NOW()
),

-- Reverse Fly Machine
(
  'exdef_back_010',
  'Reverse Fly Machine',
  'reverseflymachine',
  ARRAY['reverse pec deck', 'rear delt machine', 'reverse machine fly'],
  ARRAY['mid-back', 'rear-delts'],
  ARRAY[]::text[],
  ARRAY['machine'],
  'Sit facing pad. Pull handles back, focusing on rear delts and mid-back.',
  true,
  NOW(),
  NOW()
),

-- Cable Shrug
(
  'exdef_back_011',
  'Cable Shrug',
  'cableshrug',
  ARRAY['cable trap shrug', 'shrug'],
  ARRAY['traps'],
  ARRAY[]::text[],
  ARRAY['cable'],
  'Stand holding cable attachment. Shrug shoulders up toward ears, squeeze traps at top.',
  true,
  NOW(),
  NOW()
),

-- Barbell Shrug
(
  'exdef_back_012',
  'Barbell Shrug',
  'barbellshrug',
  ARRAY['bb shrug', 'trap shrug', 'barbell trap shrug'],
  ARRAY['traps'],
  ARRAY[]::text[],
  ARRAY['barbell'],
  'Hold barbell at arms length. Shrug shoulders straight up, pause at top, lower slowly.',
  true,
  NOW(),
  NOW()
),

-- Dumbbell Shrug
(
  'exdef_back_013',
  'Dumbbell Shrug',
  'dumbbellshrug',
  ARRAY['db shrug', 'dumbbell trap shrug'],
  ARRAY['traps'],
  ARRAY[]::text[],
  ARRAY['dumbbell'],
  'Hold dumbbells at sides. Shrug shoulders up, squeeze traps, lower with control.',
  true,
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
  ARRAY['front-delts', 'mid-delts'],
  ARRAY['triceps'],
  ARRAY['barbell'],
  'Stand with feet shoulder-width. Press barbell overhead from shoulders to lockout.',
  true,
  NOW(),
  NOW()
),

-- Dumbbell Shoulder Press
(
  'exdef_shoulders_002',
  'Dumbbell Shoulder Press',
  'dumbbellshoulderpress',
  ARRAY['db shoulder press', 'db press', 'seated db press'],
  ARRAY['front-delts', 'mid-delts'],
  ARRAY['triceps'],
  ARRAY['dumbbell', 'bench'],
  'Sit upright or stand. Press dumbbells overhead from shoulder level to lockout.',
  true,
  NOW(),
  NOW()
),

-- Machine Shoulder Press
(
  'exdef_shoulders_003',
  'Machine Shoulder Press',
  'machineshoulderpress',
  ARRAY['shoulder press machine', 'seated press machine'],
  ARRAY['front-delts', 'mid-delts'],
  ARRAY['triceps'],
  ARRAY['machine'],
  'Sit in machine, back supported. Press handles overhead to full extension.',
  true,
  NOW(),
  NOW()
),

-- Arnold Press
(
  'exdef_shoulders_004',
  'Arnold Press',
  'arnoldpress',
  ARRAY['arnold db press', 'arnold dumbbell press'],
  ARRAY['front-delts', 'mid-delts'],
  ARRAY['triceps'],
  ARRAY['dumbbell', 'bench'],
  'Start with palms facing you. Rotate and press dumbbells overhead, finish palms forward.',
  true,
  NOW(),
  NOW()
),

-- Dumbbell Lateral Raise
(
  'exdef_shoulders_005',
  'Dumbbell Lateral Raise',
  'dumbbellateralraise',
  ARRAY['lateral raise', 'side raise', 'db lateral raise', 'side delt raise'],
  ARRAY['mid-delts'],
  ARRAY[]::text[],
  ARRAY['dumbbell'],
  'Stand with dumbbells at sides. Raise arms out to sides until parallel with floor.',
  true,
  NOW(),
  NOW()
),

-- Cable Lateral Raise
(
  'exdef_shoulders_006',
  'Cable Lateral Raise',
  'cablelateralraise',
  ARRAY['cable side raise', 'single arm cable raise'],
  ARRAY['mid-delts'],
  ARRAY[]::text[],
  ARRAY['cable'],
  'Stand sideways to cable. Raise handle out to side until arm parallel with floor.',
  true,
  NOW(),
  NOW()
),

-- Behind-the-Back Lateral Raise
(
  'exdef_shoulders_007',
  'Behind-the-Back Lateral Raise',
  'behindthebacklateralraise',
  ARRAY['behind back raise', 'rear lateral raise', 'reverse lateral raise'],
  ARRAY['mid-delts'],
  ARRAY[]::text[],
  ARRAY['cable'],
  'Stand with cable behind back. Raise handle out to side focusing on middle delt.',
  true,
  NOW(),
  NOW()
),

-- Dumbbell Front Raise
(
  'exdef_shoulders_008',
  'Dumbbell Front Raise',
  'dumbbellfontraise',
  ARRAY['front raise', 'db front raise', 'anterior raise'],
  ARRAY['front-delts'],
  ARRAY[]::text[],
  ARRAY['dumbbell'],
  'Stand with dumbbells in front of thighs. Raise forward to shoulder height.',
  true,
  NOW(),
  NOW()
),

-- Face Pull
(
  'exdef_shoulders_009',
  'Face Pull',
  'facepull',
  ARRAY['cable face pull', 'rope face pull'],
  ARRAY['rear-delts'],
  ARRAY['mid-back'],
  ARRAY['cable'],
  'Pull rope attachment toward face, separating handles. Focus on rear delts and upper back.',
  true,
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
  ARRAY['biceps'],
  ARRAY[]::text[],
  ARRAY['barbell'],
  'Stand holding barbell with underhand grip. Curl bar up to shoulders, lower with control.',
  true,
  NOW(),
  NOW()
),

-- Dumbbell Curl
(
  'exdef_arms_002',
  'Dumbbell Curl',
  'dumbbellcurl',
  ARRAY['db curl', 'dumbbell bicep curl', 'standing db curl'],
  ARRAY['biceps'],
  ARRAY[]::text[],
  ARRAY['dumbbell'],
  'Stand with dumbbells at sides. Curl up to shoulders, supinating wrists.',
  true,
  NOW(),
  NOW()
),

-- Hammer Curl
(
  'exdef_arms_003',
  'Hammer Curl',
  'hammercurl',
  ARRAY['db hammer curl', 'neutral grip curl'],
  ARRAY['biceps'],
  ARRAY['forearms'],
  ARRAY['dumbbell'],
  'Hold dumbbells with neutral grip (palms facing each other). Curl up to shoulders.',
  true,
  NOW(),
  NOW()
),

-- Preacher Curl
(
  'exdef_arms_004',
  'Preacher Curl',
  'preachercurl',
  ARRAY['preacher bench curl', 'ez bar preacher curl', 'db preacher curl'],
  ARRAY['biceps'],
  ARRAY[]::text[],
  ARRAY['barbell', 'dumbbell', 'ez-bar', 'preacher-bench'],
  'Rest upper arms on preacher bench pad. Curl weight up, focusing on bicep contraction.',
  true,
  NOW(),
  NOW()
),

-- Cable Curl
(
  'exdef_arms_005',
  'Cable Curl',
  'cablecurl',
  ARRAY['cable bicep curl', 'standing cable curl'],
  ARRAY['biceps'],
  ARRAY[]::text[],
  ARRAY['cable'],
  'Stand facing cable machine. Curl handle up to shoulders, maintaining tension.',
  true,
  NOW(),
  NOW()
),

-- Bayesian Cable Curl
(
  'exdef_arms_006',
  'Bayesian Cable Curl',
  'bayesiancablecurl',
  ARRAY['bayesian curl', 'single arm cable curl behind'],
  ARRAY['biceps'],
  ARRAY[]::text[],
  ARRAY['cable'],
  'Stand facing away from cable, arm extended back. Curl handle forward and up.',
  true,
  NOW(),
  NOW()
),

-- Triceps Pressdown
(
  'exdef_arms_007',
  'Triceps Pressdown',
  'tricepspressdown',
  ARRAY['cable pressdown', 'tricep pushdown', 'rope pressdown'],
  ARRAY['triceps'],
  ARRAY[]::text[],
  ARRAY['cable'],
  'Stand facing cable with handle at chest height. Press down until arms fully extended.',
  true,
  NOW(),
  NOW()
),

-- Overhead Cable Triceps Extension
(
  'exdef_arms_008',
  'Overhead Cable Triceps Extension',
  'overheadcabletricepsextension',
  ARRAY['overhead cable extension', 'cable overhead tricep', 'rope overhead extension'],
  ARRAY['triceps'],
  ARRAY[]::text[],
  ARRAY['cable'],
  'Face away from cable, rope overhead. Extend arms forward and up, focusing on triceps.',
  true,
  NOW(),
  NOW()
),

-- Cable Triceps Kickback
(
  'exdef_arms_009',
  'Cable Triceps Kickback',
  'cabletricepskickback',
  ARRAY['cable kickback', 'tricep cable kickback'],
  ARRAY['triceps'],
  ARRAY[]::text[],
  ARRAY['cable'],
  'Hinge forward, upper arm stationary. Extend arm back until fully straight.',
  true,
  NOW(),
  NOW()
),

-- Dumbbell Overhead Triceps Extension
(
  'exdef_arms_010',
  'Dumbbell Overhead Triceps Extension',
  'dumbbelloverheadtricepsextension',
  ARRAY['db overhead extension', 'overhead tricep extension', 'seated db tricep extension'],
  ARRAY['triceps'],
  ARRAY[]::text[],
  ARRAY['dumbbell'],
  'Hold dumbbell overhead with both hands. Lower behind head, extend back up.',
  true,
  NOW(),
  NOW()
),

-- Close-Grip Bench Press
(
  'exdef_arms_011',
  'Close-Grip Bench Press',
  'closegripbenchpress',
  ARRAY['close grip bench', 'cgbp', 'narrow grip bench'],
  ARRAY['triceps'],
  ARRAY['chest'],
  ARRAY['barbell', 'bench'],
  'Lie on bench with narrow grip (hands inside shoulder width). Lower to chest, press up.',
  true,
  NOW(),
  NOW()
),

-- Triceps Dips
(
  'exdef_arms_012',
  'Triceps Dips',
  'tricepsdips',
  ARRAY['tricep dip', 'dips triceps focus', 'upright dips'],
  ARRAY['triceps'],
  ARRAY['chest'],
  ARRAY['parallel-bars', 'dip-station'],
  'Keep torso upright. Lower body by bending elbows, press back up. Upright posture emphasizes triceps.',
  true,
  NOW(),
  NOW()
),

-- Dumbbell Wrist Curl
(
  'exdef_arms_013',
  'Dumbbell Wrist Curl',
  'dumbbellwristcurl',
  ARRAY['wrist curl', 'db wrist curl', 'forearm curl'],
  ARRAY['forearms'],
  ARRAY[]::text[],
  ARRAY['dumbbell', 'bench'],
  'Rest forearms on bench, wrists hanging off edge. Curl wrists up using forearm flexors.',
  true,
  NOW(),
  NOW()
),

-- Dumbbell Reverse Wrist Curl
(
  'exdef_arms_014',
  'Dumbbell Reverse Wrist Curl',
  'dumbbellreversewristcurl',
  ARRAY['reverse wrist curl', 'db reverse wrist curl', 'forearm extension'],
  ARRAY['forearms'],
  ARRAY[]::text[],
  ARRAY['dumbbell', 'bench'],
  'Rest forearms on bench, palms down. Curl wrists up using forearm extensors.',
  true,
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
  ARRAY['quads', 'glutes'],
  ARRAY['hamstrings'],
  ARRAY['barbell', 'rack'],
  'Bar on upper back. Descend until thighs parallel or below, drive up through heels.',
  true,
  NOW(),
  NOW()
),

-- Front Squat
(
  'exdef_legs_002',
  'Front Squat',
  'frontsquat',
  ARRAY['barbell front squat', 'front rack squat'],
  ARRAY['quads'],
  ARRAY['glutes'],
  ARRAY['barbell', 'rack'],
  'Bar on front of shoulders. Upright torso. Descend and drive up, quad focused.',
  true,
  NOW(),
  NOW()
),

-- Smith Machine Squat (Feet Forward)
(
  'exdef_legs_003',
  'Smith Machine Squat (Feet Forward)',
  'smithmachinesquatfeetforward',
  ARRAY['smith squat feet forward', 'smith machine quad squat'],
  ARRAY['quads'],
  ARRAY[]::text[],
  ARRAY['smith-machine'],
  'Position feet forward of bar. Descend keeping torso upright. Emphasizes quads.',
  true,
  NOW(),
  NOW()
),

-- Leg Press
(
  'exdef_legs_004',
  'Leg Press',
  'legpress',
  ARRAY['machine leg press', 'seated leg press'],
  ARRAY['quads', 'glutes'],
  ARRAY['hamstrings'],
  ARRAY['machine'],
  'Feet on platform shoulder-width. Press platform up until legs nearly extended.',
  true,
  NOW(),
  NOW()
),

-- Leg Extension
(
  'exdef_legs_005',
  'Leg Extension',
  'legextension',
  ARRAY['leg extension machine', 'quad extension'],
  ARRAY['quads'],
  ARRAY[]::text[],
  ARRAY['machine'],
  'Sit in machine, pad on lower shins. Extend legs until straight, focusing on quad contraction.',
  true,
  NOW(),
  NOW()
),

-- Goblet Squat
(
  'exdef_legs_006',
  'Goblet Squat',
  'gobletsquat',
  ARRAY['db goblet squat', 'kettlebell goblet squat'],
  ARRAY['quads', 'glutes'],
  ARRAY[]::text[],
  ARRAY['dumbbell', 'kettlebell'],
  'Hold weight at chest. Squat down keeping torso upright, drive up through heels.',
  true,
  NOW(),
  NOW()
),

-- Bulgarian Split Squat
(
  'exdef_legs_007',
  'Bulgarian Split Squat',
  'bulgarianssplitsquat',
  ARRAY['rear foot elevated split squat', 'bulgarian lunge', 'split squat'],
  ARRAY['quads', 'glutes'],
  ARRAY['hamstrings'],
  ARRAY['dumbbell', 'bench'],
  'Rear foot elevated on bench. Descend on front leg, drive up. Single leg focus.',
  true,
  NOW(),
  NOW()
),

-- Walking Lunges
(
  'exdef_legs_008',
  'Walking Lunges',
  'walkinglunges',
  ARRAY['dumbbell lunges', 'db walking lunges', 'lunges'],
  ARRAY['quads', 'glutes'],
  ARRAY['hamstrings'],
  ARRAY['dumbbell'],
  'Step forward into lunge, alternate legs. Keep torso upright throughout.',
  true,
  NOW(),
  NOW()
),

-- Romanian Deadlift (Barbell)
(
  'exdef_legs_009',
  'Romanian Deadlift (Barbell)',
  'romaniandeadliftbarbell',
  ARRAY['rdl', 'barbell rdl', 'bb rdl', 'stiff leg deadlift'],
  ARRAY['hamstrings', 'glutes'],
  ARRAY['lower-back'],
  ARRAY['barbell'],
  'Hinge at hips, slight knee bend. Lower bar along shins, feel hamstring stretch. Drive hips forward.',
  true,
  NOW(),
  NOW()
),

-- Romanian Deadlift (Dumbbell)
(
  'exdef_legs_010',
  'Romanian Deadlift (Dumbbell)',
  'romaniandeadliftdumbbell',
  ARRAY['db rdl', 'dumbbell rdl', 'db stiff leg deadlift'],
  ARRAY['hamstrings', 'glutes'],
  ARRAY['lower-back'],
  ARRAY['dumbbell'],
  'Hold dumbbells at thighs. Hinge at hips, lower weights along legs. Drive hips forward.',
  true,
  NOW(),
  NOW()
),

-- Seated Leg Curl
(
  'exdef_legs_011',
  'Seated Leg Curl',
  'seatedlegcurl',
  ARRAY['seated hamstring curl', 'leg curl machine seated'],
  ARRAY['hamstrings'],
  ARRAY[]::text[],
  ARRAY['machine'],
  'Sit in machine, pad behind lower legs. Curl legs down, squeezing hamstrings.',
  true,
  NOW(),
  NOW()
),

-- Lying Leg Curl
(
  'exdef_legs_012',
  'Lying Leg Curl',
  'lyinglegcurl',
  ARRAY['prone leg curl', 'hamstring curl', 'leg curl'],
  ARRAY['hamstrings'],
  ARRAY[]::text[],
  ARRAY['machine'],
  'Lie face down, pad on lower legs. Curl legs up toward glutes, squeeze hamstrings.',
  true,
  NOW(),
  NOW()
),

-- Hip Thrust
(
  'exdef_legs_013',
  'Hip Thrust',
  'hipthrust',
  ARRAY['barbell hip thrust', 'glute bridge elevated'],
  ARRAY['glutes'],
  ARRAY['hamstrings'],
  ARRAY['barbell', 'bench'],
  'Upper back on bench, barbell on hips. Drive hips up until body forms straight line.',
  true,
  NOW(),
  NOW()
),

-- Glute Bridge
(
  'exdef_legs_014',
  'Glute Bridge',
  'glutebridge',
  ARRAY['barbell glute bridge', 'floor bridge'],
  ARRAY['glutes'],
  ARRAY['hamstrings'],
  ARRAY['barbell', 'bodyweight'],
  'Lie on floor, knees bent. Drive hips up, squeezing glutes at top.',
  true,
  NOW(),
  NOW()
),

-- Hip Abduction Machine
(
  'exdef_legs_015',
  'Hip Abduction Machine',
  'hipabductionmachine',
  ARRAY['hip abduction', 'abductor machine', 'outer thigh machine'],
  ARRAY['glutes'],
  ARRAY[]::text[],
  ARRAY['machine'],
  'Sit in machine. Push legs outward against resistance, focusing on glutes.',
  true,
  NOW(),
  NOW()
),

-- Hip Adduction Machine
(
  'exdef_legs_016',
  'Hip Adduction Machine',
  'hipadductionmachine',
  ARRAY['hip adduction', 'adductor machine', 'inner thigh machine'],
  ARRAY['adductors'],
  ARRAY[]::text[],
  ARRAY['machine'],
  'Sit in machine. Squeeze legs together against resistance, focusing on inner thighs.',
  true,
  NOW(),
  NOW()
),

-- Standing Calf Raise
(
  'exdef_legs_017',
  'Standing Calf Raise',
  'standingcalfraise',
  ARRAY['calf raise standing', 'standing calf', 'smith machine calf raise'],
  ARRAY['calves'],
  ARRAY[]::text[],
  ARRAY['machine', 'smith-machine'],
  'Stand with balls of feet on platform. Raise up onto toes, lower with control.',
  true,
  NOW(),
  NOW()
),

-- Seated Calf Raise
(
  'exdef_legs_018',
  'Seated Calf Raise',
  'seatedcalfraise',
  ARRAY['seated calf', 'calf extension machine'],
  ARRAY['calves'],
  ARRAY[]::text[],
  ARRAY['machine'],
  'Sit with knees under pad, balls of feet on platform. Raise heels up, lower slowly.',
  true,
  NOW(),
  NOW()
),

-- Leg Press Calf Press
(
  'exdef_legs_019',
  'Leg Press Calf Press',
  'legpresscalfpress',
  ARRAY['calf press on leg press', 'leg press calf raise'],
  ARRAY['calves'],
  ARRAY[]::text[],
  ARRAY['machine'],
  'In leg press position. Press platform with toes/balls of feet only.',
  true,
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
  ARRAY['abs'],
  ARRAY[]::text[],
  ARRAY['cable'],
  'Kneel facing cable with rope overhead. Crunch down, bringing elbows toward knees.',
  true,
  NOW(),
  NOW()
),

-- Roman Chair Leg Lift
(
  'exdef_core_002',
  'Roman Chair Leg Lift',
  'romanchairleglift',
  ARRAY['captain chair leg raise', 'vertical knee raise', 'roman chair'],
  ARRAY['abs'],
  ARRAY[]::text[],
  ARRAY['roman-chair', 'bodyweight'],
  'Support body on roman chair. Lift knees toward chest, controlling the movement.',
  true,
  NOW(),
  NOW()
),

-- Reverse Crunch
(
  'exdef_core_003',
  'Reverse Crunch',
  'reversecrunch',
  ARRAY['reverse ab crunch', 'lower ab crunch'],
  ARRAY['abs'],
  ARRAY[]::text[],
  ARRAY['bodyweight'],
  'Lie on back, knees bent. Curl hips up toward chest, lifting lower back off floor.',
  true,
  NOW(),
  NOW()
),

-- Plank
(
  'exdef_core_004',
  'Plank',
  'plank',
  ARRAY['front plank', 'forearm plank', 'ab plank'],
  ARRAY['abs'],
  ARRAY[]::text[],
  ARRAY['bodyweight'],
  'Hold body in straight line on forearms and toes. Maintain neutral spine.',
  true,
  NOW(),
  NOW()
),

-- Hanging Leg Raise
(
  'exdef_core_005',
  'Hanging Leg Raise',
  'hanginglegraise',
  ARRAY['hanging leg lift', 'pull up bar leg raise'],
  ARRAY['abs'],
  ARRAY[]::text[],
  ARRAY['pull-up-bar', 'bodyweight'],
  'Hang from bar. Raise legs up toward chest, keeping them straight if possible.',
  true,
  NOW(),
  NOW()
),

-- Hanging Knee Raise
(
  'exdef_core_006',
  'Hanging Knee Raise',
  'hangingkneeraise',
  ARRAY['hanging knee lift', 'knee raise'],
  ARRAY['abs'],
  ARRAY[]::text[],
  ARRAY['pull-up-bar', 'bodyweight'],
  'Hang from bar. Bring knees up toward chest, controlling the movement.',
  true,
  NOW(),
  NOW()
),

-- Ab Wheel Rollout
(
  'exdef_core_007',
  'Ab Wheel Rollout',
  'abwheelrollout',
  ARRAY['ab wheel', 'rollout', 'ab roller'],
  ARRAY['abs'],
  ARRAY[]::text[],
  ARRAY['ab-wheel'],
  'Kneel with ab wheel. Roll forward extending body, then pull back to start.',
  true,
  NOW(),
  NOW()
),

-- Dead Bug
(
  'exdef_core_008',
  'Dead Bug',
  'deadbug',
  ARRAY['dead bug exercise', 'alternating dead bug'],
  ARRAY['abs'],
  ARRAY[]::text[],
  ARRAY['bodyweight'],
  'Lie on back, arms and legs up. Extend opposite arm and leg, maintaining lower back contact with floor.',
  true,
  NOW(),
  NOW()
),

-- Bicycle Crunches
(
  'exdef_core_009',
  'Bicycle Crunches',
  'bicyclecrunches',
  ARRAY['bicycle crunch', 'bicycle abs', 'alternating bicycle'],
  ARRAY['abs'],
  ARRAY['obliques'],
  ARRAY['bodyweight'],
  'Lie on back. Bring opposite elbow to knee in cycling motion, engaging core.',
  true,
  NOW(),
  NOW()
),

-- Side Plank
(
  'exdef_core_010',
  'Side Plank',
  'sideplank',
  ARRAY['lateral plank', 'oblique plank'],
  ARRAY['obliques'],
  ARRAY['abs'],
  ARRAY['bodyweight'],
  'Support body on one forearm and side of foot. Hold body in straight line.',
  true,
  NOW(),
  NOW()
),

-- Russian Twists
(
  'exdef_core_011',
  'Russian Twists',
  'russiantwists',
  ARRAY['russian twist', 'seated twist', 'weighted russian twist'],
  ARRAY['obliques'],
  ARRAY['abs'],
  ARRAY['dumbbell', 'bodyweight'],
  'Sit with feet elevated, torso leaned back. Rotate torso side to side, touching weight to floor.',
  true,
  NOW(),
  NOW()
),

-- Oblique Crunches
(
  'exdef_core_012',
  'Oblique Crunches',
  'obliquecrunches',
  ARRAY['side crunch', 'oblique crunch', 'side ab crunch'],
  ARRAY['obliques'],
  ARRAY[]::text[],
  ARRAY['bodyweight'],
  'Lie on side. Crunch upward, engaging obliques to lift shoulder toward hip.',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("normalizedName")
DO UPDATE SET
  name = EXCLUDED.name,
  aliases = EXCLUDED.aliases,
  "primaryFAUs" = EXCLUDED."primaryFAUs",
  "secondaryFAUs" = EXCLUDED."secondaryFAUs",
  equipment = EXCLUDED.equipment,
  instructions = EXCLUDED.instructions,
  "isSystem" = EXCLUDED."isSystem",
  "updatedAt" = NOW();

-- ============================================================================
-- STATUS: 75 exercises added/updated (CHEST: 8, BACK: 13, SHOULDERS: 9, ARMS: 14, LEGS: 19, CORE: 12)
-- All major muscle groups covered!
-- Existing logged workouts are preserved!
-- ============================================================================
