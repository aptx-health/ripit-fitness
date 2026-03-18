-- Reseed Exercise Definitions
--
-- This migration wipes all program/exercise/completion data and reseeds the
-- ExerciseDefinition table with the full canonical set of exercises across all
-- equipment categories: legacy (CUID IDs), bodyweight, dumbbell, resistance band,
-- kettlebell, pull-up bar, cable/machine, and core/mobility.
--
-- WARNING: This is a destructive migration. All user program data will be deleted.

-- ============================================================================
-- Step 1: Delete all data (leaf to root dependency order)
-- ============================================================================

DELETE FROM "LoggedSet";
DELETE FROM "PrescribedSet";
DELETE FROM "Exercise";
DELETE FROM "WorkoutCompletion";
DELETE FROM "Workout";
DELETE FROM "Week";
DELETE FROM "Program";
DELETE FROM "CommunityProgram";
DELETE FROM "ExercisePerformanceLog";
DELETE FROM "ExerciseDefinition";

-- ============================================================================
-- Step 2: Seed exercise definitions
-- ============================================================================

-- --------------------------------------------------------------------------
-- 00: Legacy exercises (original 27, preserving CUID IDs)
-- --------------------------------------------------------------------------

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
-- Arms (3)
('cmiz7vl1k0009vr0m306fts69', 'Barbell Curl', 'barbell curl', ARRAY['bb curl', 'standing barbell curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('cmiz7vnpc000ovr0mcuhs0bum', 'Hammer Curl', 'hammer curl', ARRAY['dumbbell hammer curl', 'db hammer curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('cmiz7vl76000avr0m27zo6aos', 'Tricep Pushdown', 'tricep pushdown', ARRAY['cable tricep pushdown', 'rope pushdown'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),

-- Back (5)
('cmiz7vk1i0003vr0mqucd1f52', 'Barbell Row', 'barbell row', ARRAY['bent over barbell row', 'bb row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('cmiz7vmmg000ivr0mojncaj84', 'Cable Row', 'cable row', ARRAY['seated cable row', 'cable rows'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['lats', 'mid-back'], ARRAY['biceps'], NOW(), NOW()),
('cmiz7vjvh0002vr0mtcmhiz70', 'Conventional Deadlift', 'conventional deadlift', ARRAY['deadlift', 'barbell deadlift'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['hamstrings', 'glutes', 'lower-back'], ARRAY['traps', 'forearms'], NOW(), NOW()),
('cmiz7vmgd000hvr0mkidkt6uu', 'Dumbbell Row', 'dumbbell row', ARRAY['db row', 'one arm dumbbell row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['lats', 'mid-back'], ARRAY['biceps'], NOW(), NOW()),
('cmiz7vkvr0008vr0m7rv3dapc', 'Pull-Up', 'pull-up', ARRAY['pullup', 'pull up'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'biceps'], ARRAY['mid-back', 'forearms'], NOW(), NOW()),

-- Chest (4)
('cmiz7vjju0000vr0m4b1o6bec', 'Barbell Bench Press', 'barbell bench press', ARRAY['bench press', 'flat bench', 'bb bench'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell', 'bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('cmiz7vmyl000kvr0mmr9a482v', 'Dips', 'dips', ARRAY['parallel bar dips', 'weighted dips'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dip_bars'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('cmiz7vkpg0007vr0mpbaneax3', 'Dumbbell Bench Press', 'dumbbell bench press', ARRAY['db bench press', 'flat db bench'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('cmiz7vkji0006vr0mrxfixnvy', 'Incline Barbell Bench Press', 'incline barbell bench press', ARRAY['incline bench press', 'incline bb bench'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell', 'bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),

-- Core (1)
('cmiz7vnjj000nvr0mgfa1vmx1', 'Plank', 'plank', ARRAY['front plank', 'elbow plank'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], NOW(), NOW()),

-- Legs (9)
('cmiz7vjpo0001vr0msv9of7ib', 'Barbell Back Squat', 'barbell back squat', ARRAY['back squat', 'squat', 'bb squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('cmiz7vnam000mvr0mano9z27r', 'Calf Raise', 'calf raise', ARRAY['machine calf raise', 'standing calf raise'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['calves'], ARRAY[]::text[], NOW(), NOW()),
('cmiz7vm4s000fvr0mfh2shcrv', 'Front Squat', 'front squat', ARRAY['barbell front squat', 'bb front squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['quads'], ARRAY['glutes'], NOW(), NOW()),
('cmiz7vljh000cvr0mlk0r5kco', 'Leg Curl', 'leg curl', ARRAY['seated leg curl', 'machine leg curl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['hamstrings'], ARRAY[]::text[], NOW(), NOW()),
('cmiz7vlqf000dvr0mm39bhj97', 'Leg Extension', 'leg extension', ARRAY['machine leg extension', 'quad extension'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['quads'], ARRAY[]::text[], NOW(), NOW()),
('cmiz7vldb000bvr0mw4qzzagc', 'Leg Press', 'leg press', ARRAY['machine leg press', 'seated leg press'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('cmiz7vn4b000lvr0m5aq17wb7', 'Lunges', 'lunges', ARRAY['bodyweight lunge', 'forward lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('cmiz7vkdh0005vr0mr5dm18ls', 'Romanian Deadlift', 'romanian deadlift', ARRAY['rdl', 'barbell rdl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['hamstrings', 'glutes'], ARRAY['lower-back'], NOW(), NOW()),
('cmiz7vma9000gvr0mmjmxhp9s', 'Sumo Deadlift', 'sumo deadlift', ARRAY['barbell sumo deadlift', 'wide stance deadlift'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['hamstrings', 'glutes', 'adductors'], ARRAY['lower-back', 'traps'], NOW(), NOW()),

-- Shoulders (3)
('cmiz7vmsh000jvr0mq9pwqarc', 'Face Pull', 'face pull', ARRAY['cable face pull', 'rope face pull'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['rear-delts'], ARRAY['traps', 'mid-back'], NOW(), NOW()),
('cmiz7vlyh000evr0m9d8snpzh', 'Lateral Raise', 'lateral raise', ARRAY['dumbbell lateral raise', 'side raise'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['side-delts'], ARRAY['traps'], NOW(), NOW()),
('cmiz7vk780004vr0md53c57bz', 'Overhead Press', 'overhead press', ARRAY['ohp', 'barbell overhead press', 'military press'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['front-delts', 'triceps'], ARRAY['chest'], NOW(), NOW())

ON CONFLICT ("normalizedName") DO NOTHING;

-- --------------------------------------------------------------------------
-- 01: Bodyweight exercises
-- --------------------------------------------------------------------------

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
-- Push-up variations
('ex_bw_001', 'Standard Push-Up', 'standard push-up', ARRAY['push-up', 'pushup', 'push up', 'standard pushup'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('ex_bw_002', 'Wide Push-Up', 'wide push-up', ARRAY['wide pushup', 'wide grip pushup'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['chest'], ARRAY['front-delts', 'triceps'], NOW(), NOW()),
('ex_bw_003', 'Diamond Push-Up', 'diamond push-up', ARRAY['diamond pushup', 'close grip pushup', 'triangle pushup'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['triceps', 'chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_bw_004', 'Decline Push-Up', 'decline push-up', ARRAY['decline pushup', 'feet elevated pushup'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight', 'bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('ex_bw_005', 'Incline Push-Up', 'incline push-up', ARRAY['incline pushup', 'hands elevated pushup'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight', 'bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('ex_bw_006', 'Pike Push-Up', 'pike push-up', ARRAY['pike pushup', 'shoulder pushup'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['front-delts', 'triceps'], ARRAY['chest'], NOW(), NOW()),
('ex_bw_007', 'Archer Push-Up', 'archer push-up', ARRAY['archer pushup', 'side to side pushup'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),

-- Pull-up/Chin-up variations
('ex_bw_008', 'Chin-Up', 'chin-up', ARRAY['chinup', 'chin up', 'underhand pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['biceps', 'lats'], ARRAY['mid-back', 'forearms'], NOW(), NOW()),
('ex_bw_009', 'Wide Grip Pull-Up', 'wide grip pull-up', ARRAY['wide pullup', 'wide grip pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats'], ARRAY['mid-back', 'biceps'], NOW(), NOW()),
('ex_bw_010', 'Neutral Grip Pull-Up', 'neutral grip pull-up', ARRAY['neutral pullup', 'parallel grip pullup', 'hammer grip pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_bw_011', 'L-Sit Pull-Up', 'l-sit pull-up', ARRAY['l sit pullup', 'lsit pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'biceps', 'abs'], ARRAY['forearms'], NOW(), NOW()),
('ex_bw_012', 'Muscle-Up', 'muscle-up', ARRAY['muscle up', 'muscleup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'triceps', 'chest'], ARRAY['front-delts'], NOW(), NOW()),

-- Squat variations
('ex_bw_013', 'Bodyweight Squat', 'bodyweight squat', ARRAY['air squat', 'squat', 'bw squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('ex_bw_014', 'Jump Squat', 'jump squat', ARRAY['squat jump', 'jumping squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'calves'], NOW(), NOW()),
('ex_bw_015', 'Pistol Squat', 'pistol squat', ARRAY['single leg squat', 'one leg squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('ex_bw_016', 'Bulgarian Split Squat', 'bulgarian split squat', ARRAY['rear foot elevated split squat', 'bulgarian squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight', 'bench'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('ex_bw_017', 'Sissy Squat', 'sissy squat', ARRAY['sissy squats'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads'], ARRAY['abs'], NOW(), NOW()),

-- Lunge variations
('ex_bw_018', 'Bodyweight Lunge', 'bodyweight lunge', ARRAY['lunge', 'forward lunge', 'bw lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('ex_bw_019', 'Reverse Lunge', 'reverse lunge', ARRAY['backward lunge', 'step back lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('ex_bw_020', 'Walking Lunge', 'walking lunge', ARRAY['walking lunges'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('ex_bw_021', 'Jumping Lunge', 'jumping lunge', ARRAY['jump lunge', 'lunge jump', 'split jump'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'calves'], NOW(), NOW()),

-- Core exercises
('ex_bw_022', 'Sit-Up', 'sit-up', ARRAY['situp', 'sit up'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], NOW(), NOW()),
('ex_bw_023', 'Crunch', 'crunch', ARRAY['crunches', 'abdominal crunch'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], NOW(), NOW()),
('ex_bw_024', 'Bicycle Crunch', 'bicycle crunch', ARRAY['bicycle crunches', 'bicycle'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs', 'obliques'], ARRAY[]::text[], NOW(), NOW()),
('ex_bw_025', 'Russian Twist', 'russian twist', ARRAY['russian twists'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['obliques', 'abs'], ARRAY[]::text[], NOW(), NOW()),
('ex_bw_026', 'Leg Raise', 'leg raise', ARRAY['leg raises', 'lying leg raise'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], NOW(), NOW()),
('ex_bw_027', 'Hanging Leg Raise', 'hanging leg raise', ARRAY['hanging leg raises', 'hanging knee raise'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['abs'], ARRAY['forearms', 'lats'], NOW(), NOW()),
('ex_bw_028', 'Mountain Climber', 'mountain climber', ARRAY['mountain climbers'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY['front-delts'], NOW(), NOW()),
('ex_bw_029', 'Hollow Body Hold', 'hollow body hold', ARRAY['hollow hold', 'hollow body'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], NOW(), NOW()),
('ex_bw_030', 'V-Up', 'v-up', ARRAY['v up', 'vup', 'jackknife'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], NOW(), NOW()),

-- Plank variations
('ex_bw_031', 'Side Plank', 'side plank', ARRAY['side planks'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['obliques'], ARRAY['front-delts'], NOW(), NOW()),
('ex_bw_032', 'Plank to Push-Up', 'plank to push-up', ARRAY['up down plank', 'plank up down'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs', 'triceps'], ARRAY['front-delts', 'chest'], NOW(), NOW()),
('ex_bw_033', 'Plank Shoulder Tap', 'plank shoulder tap', ARRAY['shoulder taps', 'plank taps'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY['obliques'], NOW(), NOW()),

-- Dip variations
('ex_bw_034', 'Tricep Dip', 'tricep dip', ARRAY['triceps dip', 'bench dip'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dip_bars'], ARRAY['triceps'], ARRAY['rear-delts'], NOW(), NOW()),
('ex_bw_035', 'Chest Dip', 'chest dip', ARRAY['chest dips'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dip_bars'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),

-- Bodyweight back exercises
('ex_bw_036', 'Inverted Row', 'inverted row', ARRAY['bodyweight row', 'australian pullup', 'horizontal pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('ex_bw_037', 'Superman', 'superman', ARRAY['superman exercise', 'back extension'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['lower-back', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),

-- Glute/hamstring exercises
('ex_bw_038', 'Glute Bridge', 'glute bridge', ARRAY['hip bridge', 'bridge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['glutes', 'hamstrings'], ARRAY['lower-back'], NOW(), NOW()),
('ex_bw_039', 'Single Leg Glute Bridge', 'single leg glute bridge', ARRAY['one leg bridge', 'single leg bridge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['glutes', 'hamstrings'], ARRAY[]::text[], NOW(), NOW()),
('ex_bw_040', 'Nordic Curl', 'nordic curl', ARRAY['nordic hamstring curl', 'natural leg curl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['hamstrings'], ARRAY['glutes'], NOW(), NOW()),

-- Calisthenics
('ex_bw_041', 'Burpee', 'burpee', ARRAY['burpees'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['chest', 'quads'], ARRAY['front-delts', 'triceps'], NOW(), NOW()),
('ex_bw_042', 'Handstand Push-Up', 'handstand push-up', ARRAY['handstand pushup', 'hspu', 'vertical pushup'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['front-delts', 'triceps'], ARRAY['chest'], NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;

-- --------------------------------------------------------------------------
-- 02: Dumbbell exercises
-- --------------------------------------------------------------------------

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
('ex_db_001', 'Incline Dumbbell Bench Press', 'incline dumbbell bench press', ARRAY['incline db bench', 'incline dumbbell press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('ex_db_002', 'Decline Dumbbell Bench Press', 'decline dumbbell bench press', ARRAY['decline db bench', 'decline dumbbell press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'decline_bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('ex_db_003', 'Dumbbell Fly', 'dumbbell fly', ARRAY['db fly', 'dumbbell flys', 'chest fly'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_db_004', 'Incline Dumbbell Fly', 'incline dumbbell fly', ARRAY['incline db fly', 'incline chest fly'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_db_005', 'Dumbbell Pullover', 'dumbbell pullover', ARRAY['db pullover', 'pullover'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['chest', 'lats'], ARRAY['triceps'], NOW(), NOW()),

-- Shoulder exercises
('ex_db_006', 'Dumbbell Shoulder Press', 'dumbbell shoulder press', ARRAY['db shoulder press', 'seated db press', 'dumbbell press'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['front-delts', 'triceps'], ARRAY['side-delts'], NOW(), NOW()),
('ex_db_007', 'Arnold Press', 'arnold press', ARRAY['arnold shoulder press', 'arnold dumbbell press'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['front-delts', 'side-delts', 'triceps'], ARRAY['chest'], NOW(), NOW()),
('ex_db_008', 'Front Raise', 'front raise', ARRAY['dumbbell front raise', 'db front raise'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['front-delts'], ARRAY['chest'], NOW(), NOW()),
('ex_db_009', 'Rear Delt Fly', 'rear delt fly', ARRAY['reverse fly', 'bent over fly', 'rear delt raise'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['rear-delts'], ARRAY['mid-back', 'traps'], NOW(), NOW()),
('ex_db_010', 'Upright Row', 'upright row', ARRAY['dumbbell upright row', 'db upright row'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['side-delts', 'traps'], ARRAY['biceps'], NOW(), NOW()),

-- Back exercises
('ex_db_011', 'Single Arm Dumbbell Row', 'single arm dumbbell row', ARRAY['one arm db row', 'single arm row', 'one arm dumbbell row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('ex_db_012', 'Bent Over Dumbbell Row', 'bent over dumbbell row', ARRAY['bent over db row', 'two arm dumbbell row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('ex_db_013', 'Dumbbell Deadlift', 'dumbbell deadlift', ARRAY['db deadlift', 'dumbbell dl'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['hamstrings', 'glutes', 'lower-back'], ARRAY['traps', 'forearms'], NOW(), NOW()),
('ex_db_014', 'Dumbbell Romanian Deadlift', 'dumbbell romanian deadlift', ARRAY['db rdl', 'dumbbell rdl'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['hamstrings', 'glutes'], ARRAY['lower-back', 'forearms'], NOW(), NOW()),
('ex_db_015', 'Dumbbell Shrug', 'dumbbell shrug', ARRAY['db shrug', 'dumbbell shrugs'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['traps'], ARRAY['forearms'], NOW(), NOW()),

-- Arm exercises - Biceps
('ex_db_016', 'Dumbbell Curl', 'dumbbell curl', ARRAY['db curl', 'dumbbell curls', 'bicep curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_db_017', 'Alternating Dumbbell Curl', 'alternating dumbbell curl', ARRAY['alternating db curl', 'alternate dumbbell curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_db_018', 'Incline Dumbbell Curl', 'incline dumbbell curl', ARRAY['incline db curl', 'incline bicep curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_db_019', 'Concentration Curl', 'concentration curl', ARRAY['seated concentration curl', 'dumbbell concentration curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_db_020', 'Preacher Curl', 'preacher curl', ARRAY['dumbbell preacher curl', 'db preacher curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'preacher_bench'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_db_021', 'Spider Curl', 'spider curl', ARRAY['spider curls', 'incline spider curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_db_022', 'Zottman Curl', 'zottman curl', ARRAY['zottman curls'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['biceps', 'forearms'], ARRAY[]::text[], NOW(), NOW()),

-- Arm exercises - Triceps
('ex_db_023', 'Dumbbell Overhead Tricep Extension', 'dumbbell overhead tricep extension', ARRAY['overhead db extension', 'dumbbell tricep extension', 'two arm overhead extension'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_db_024', 'Single Arm Overhead Tricep Extension', 'single arm overhead tricep extension', ARRAY['one arm overhead extension', 'single arm db extension'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_db_025', 'Dumbbell Tricep Kickback', 'dumbbell tricep kickback', ARRAY['tricep kickback', 'db kickback'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_db_026', 'Tate Press', 'tate press', ARRAY['tate db press'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['triceps'], ARRAY['chest'], NOW(), NOW()),
('ex_db_027', 'Dumbbell Skull Crusher', 'dumbbell skull crusher', ARRAY['db skull crusher', 'lying tricep extension'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),

-- Leg exercises
('ex_db_028', 'Dumbbell Goblet Squat', 'dumbbell goblet squat', ARRAY['goblet squat', 'db goblet squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['quads', 'glutes'], ARRAY['abs'], NOW(), NOW()),
('ex_db_029', 'Dumbbell Front Squat', 'dumbbell front squat', ARRAY['db front squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['quads', 'glutes'], ARRAY['abs'], NOW(), NOW()),
('ex_db_030', 'Dumbbell Sumo Squat', 'dumbbell sumo squat', ARRAY['db sumo squat', 'sumo goblet squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['quads', 'glutes', 'adductors'], ARRAY['hamstrings'], NOW(), NOW()),
('ex_db_031', 'Dumbbell Bulgarian Split Squat', 'dumbbell bulgarian split squat', ARRAY['db bulgarian split squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),
('ex_db_032', 'Dumbbell Lunge', 'dumbbell lunge', ARRAY['db lunge', 'dumbbell forward lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),
('ex_db_033', 'Dumbbell Reverse Lunge', 'dumbbell reverse lunge', ARRAY['db reverse lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),
('ex_db_034', 'Dumbbell Walking Lunge', 'dumbbell walking lunge', ARRAY['db walking lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),
('ex_db_035', 'Dumbbell Step-Up', 'dumbbell step-up', ARRAY['db step up', 'dumbbell step up'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('ex_db_036', 'Dumbbell Calf Raise', 'dumbbell calf raise', ARRAY['db calf raise', 'dumbbell calf raises'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['calves'], ARRAY[]::text[], NOW(), NOW()),

-- Glute exercises
('ex_db_037', 'Dumbbell Hip Thrust', 'dumbbell hip thrust', ARRAY['db hip thrust'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['glutes', 'hamstrings'], ARRAY['lower-back'], NOW(), NOW()),
('ex_db_038', 'Dumbbell Single Leg Deadlift', 'dumbbell single leg deadlift', ARRAY['db single leg deadlift', 'single leg rdl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['hamstrings', 'glutes'], ARRAY['lower-back', 'abs'], NOW(), NOW()),
('ex_db_039', 'Dumbbell Stiff Leg Deadlift', 'dumbbell stiff leg deadlift', ARRAY['db stiff leg deadlift', 'dumbbell sldl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['hamstrings', 'glutes'], ARRAY['lower-back'], NOW(), NOW()),

-- Core exercises
('ex_db_040', 'Dumbbell Side Bend', 'dumbbell side bend', ARRAY['db side bend', 'side bends'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['obliques'], ARRAY[]::text[], NOW(), NOW()),
('ex_db_041', 'Dumbbell Russian Twist', 'dumbbell russian twist', ARRAY['db russian twist', 'weighted russian twist'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['obliques', 'abs'], ARRAY[]::text[], NOW(), NOW()),
('ex_db_042', 'Dumbbell Woodchop', 'dumbbell woodchop', ARRAY['db woodchop', 'wood chop'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['obliques'], ARRAY['front-delts'], NOW(), NOW()),

-- Forearm exercises
('ex_db_043', 'Dumbbell Wrist Curl', 'dumbbell wrist curl', ARRAY['db wrist curl', 'wrist curls'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['forearms'], ARRAY[]::text[], NOW(), NOW()),
('ex_db_044', 'Dumbbell Reverse Wrist Curl', 'dumbbell reverse wrist curl', ARRAY['db reverse wrist curl', 'reverse wrist curls'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['forearms'], ARRAY[]::text[], NOW(), NOW()),
('ex_db_045', 'Farmer Walk', 'farmer walk', ARRAY['farmers walk', 'farmer carry', 'farmers carry'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['forearms', 'traps'], ARRAY['abs', 'calves'], NOW(), NOW()),

-- Full body
('ex_db_046', 'Dumbbell Thruster', 'dumbbell thruster', ARRAY['db thruster', 'dumbbell squat press'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['quads', 'front-delts'], ARRAY['glutes', 'triceps', 'abs'], NOW(), NOW()),
('ex_db_047', 'Dumbbell Snatch', 'dumbbell snatch', ARRAY['db snatch', 'single arm snatch'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['front-delts', 'glutes', 'hamstrings'], ARRAY['traps', 'abs', 'triceps'], NOW(), NOW()),
('ex_db_048', 'Dumbbell Clean', 'dumbbell clean', ARRAY['db clean', 'dumbbell hang clean'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['hamstrings', 'glutes', 'front-delts'], ARRAY['traps', 'abs'], NOW(), NOW()),
('ex_db_049', 'Dumbbell Clean and Press', 'dumbbell clean and press', ARRAY['db clean and press'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['front-delts', 'hamstrings', 'glutes'], ARRAY['traps', 'triceps', 'abs'], NOW(), NOW()),
('ex_db_050', 'Man Maker', 'man maker', ARRAY['manmaker', 'dumbbell man maker'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['chest', 'front-delts', 'quads', 'lats'], ARRAY['triceps', 'abs'], NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;

-- --------------------------------------------------------------------------
-- 03: Resistance band exercises
-- --------------------------------------------------------------------------

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
('ex_rb_001', 'Band Chest Press', 'band chest press', ARRAY['resistance band chest press', 'band press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('ex_rb_002', 'Band Chest Fly', 'band chest fly', ARRAY['resistance band fly', 'band fly'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_rb_003', 'Band Push-Up', 'band push-up', ARRAY['banded pushup', 'resistance band pushup'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band', 'bodyweight'], ARRAY['chest', 'triceps'], ARRAY['front-delts', 'abs'], NOW(), NOW()),

-- Back exercises
('ex_rb_004', 'Band Pull Apart', 'band pull apart', ARRAY['resistance band pull apart', 'band pull aparts'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['mid-back', 'rear-delts'], ARRAY['traps'], NOW(), NOW()),
('ex_rb_005', 'Band Row', 'band row', ARRAY['resistance band row', 'seated band row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('ex_rb_006', 'Band Lat Pulldown', 'band lat pulldown', ARRAY['resistance band lat pulldown', 'band pulldown'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['lats'], ARRAY['biceps', 'mid-back'], NOW(), NOW()),
('ex_rb_007', 'Band Deadlift', 'band deadlift', ARRAY['resistance band deadlift'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['hamstrings', 'glutes', 'lower-back'], ARRAY['traps', 'forearms'], NOW(), NOW()),
('ex_rb_008', 'Band Good Morning', 'band good morning', ARRAY['resistance band good morning'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['hamstrings', 'lower-back'], ARRAY['glutes'], NOW(), NOW()),

-- Shoulder exercises
('ex_rb_009', 'Band Shoulder Press', 'band shoulder press', ARRAY['resistance band shoulder press', 'band overhead press'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['front-delts', 'triceps'], ARRAY['side-delts'], NOW(), NOW()),
('ex_rb_010', 'Band Lateral Raise', 'band lateral raise', ARRAY['resistance band lateral raise', 'band side raise'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['side-delts'], ARRAY['traps'], NOW(), NOW()),
('ex_rb_011', 'Band Front Raise', 'band front raise', ARRAY['resistance band front raise'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['front-delts'], ARRAY['chest'], NOW(), NOW()),
('ex_rb_012', 'Band Rear Delt Fly', 'band rear delt fly', ARRAY['band reverse fly', 'resistance band rear delt fly'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['rear-delts'], ARRAY['mid-back'], NOW(), NOW()),
('ex_rb_013', 'Band Face Pull', 'band face pull', ARRAY['resistance band face pull'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['rear-delts', 'mid-back'], ARRAY['traps'], NOW(), NOW()),
('ex_rb_014', 'Band Upright Row', 'band upright row', ARRAY['resistance band upright row'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['side-delts', 'traps'], ARRAY['biceps'], NOW(), NOW()),

-- Arm exercises
('ex_rb_015', 'Band Bicep Curl', 'band bicep curl', ARRAY['resistance band curl', 'band curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_rb_016', 'Band Hammer Curl', 'band hammer curl', ARRAY['resistance band hammer curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_rb_017', 'Band Tricep Extension', 'band tricep extension', ARRAY['resistance band tricep extension', 'band overhead extension'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_rb_018', 'Band Tricep Pushdown', 'band tricep pushdown', ARRAY['resistance band pushdown', 'band pushdown'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_rb_019', 'Band Tricep Kickback', 'band tricep kickback', ARRAY['resistance band kickback'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),

-- Leg exercises
('ex_rb_020', 'Band Squat', 'band squat', ARRAY['resistance band squat', 'banded squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),
('ex_rb_021', 'Band Leg Press', 'band leg press', ARRAY['resistance band leg press'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('ex_rb_022', 'Band Leg Extension', 'band leg extension', ARRAY['resistance band leg extension'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['quads'], ARRAY[]::text[], NOW(), NOW()),
('ex_rb_023', 'Band Leg Curl', 'band leg curl', ARRAY['resistance band leg curl', 'band hamstring curl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['hamstrings'], ARRAY[]::text[], NOW(), NOW()),
('ex_rb_024', 'Band Glute Bridge', 'band glute bridge', ARRAY['resistance band glute bridge', 'banded glute bridge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['glutes', 'hamstrings'], ARRAY['lower-back'], NOW(), NOW()),
('ex_rb_025', 'Band Hip Thrust', 'band hip thrust', ARRAY['resistance band hip thrust', 'banded hip thrust'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['glutes', 'hamstrings'], ARRAY['lower-back'], NOW(), NOW()),
('ex_rb_026', 'Band Lunge', 'band lunge', ARRAY['resistance band lunge', 'banded lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),
('ex_rb_027', 'Band Standing Abduction', 'band standing abduction', ARRAY['band hip abduction', 'lateral band walk'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['glutes'], ARRAY[]::text[], NOW(), NOW()),
('ex_rb_028', 'Band Clamshell', 'band clamshell', ARRAY['resistance band clamshell', 'banded clamshell'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['glutes'], ARRAY[]::text[], NOW(), NOW()),
('ex_rb_029', 'Band Monster Walk', 'band monster walk', ARRAY['monster walks', 'resistance band monster walk'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['glutes'], ARRAY['quads'], NOW(), NOW()),

-- Core exercises
('ex_rb_030', 'Band Pallof Press', 'band pallof press', ARRAY['pallof press', 'resistance band pallof press'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['abs', 'obliques'], ARRAY['front-delts'], NOW(), NOW()),
('ex_rb_031', 'Band Woodchop', 'band woodchop', ARRAY['resistance band woodchop', 'band wood chop'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['obliques'], ARRAY['front-delts'], NOW(), NOW()),
('ex_rb_032', 'Band Anti-Rotation Press', 'band anti-rotation press', ARRAY['resistance band anti rotation press'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['abs', 'obliques'], ARRAY['front-delts'], NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;

-- --------------------------------------------------------------------------
-- 04: Kettlebell exercises
-- --------------------------------------------------------------------------

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

-- --------------------------------------------------------------------------
-- 05: Pull-up bar advanced exercises (formerly climbing)
-- --------------------------------------------------------------------------

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
-- Advanced pulling exercises (pull-up bar)
('ex_cl_014', 'Frenchies', 'frenchies', ARRAY['french pull ups', 'frenchies pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'biceps'], ARRAY['forearms', 'mid-back'], NOW(), NOW()),
('ex_cl_015', 'Typewriter Pull-Up', 'typewriter pull-up', ARRAY['typewriter pullup', 'side to side pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'biceps'], ARRAY['forearms', 'front-delts'], NOW(), NOW()),
('ex_cl_016', 'Assisted One Arm Pull-Up', 'assisted one arm pull-up', ARRAY['assisted one arm pullup', 'one arm negative'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'biceps'], ARRAY['forearms', 'abs'], NOW(), NOW()),
('ex_cl_017', 'Lock-Off Hold', 'lock-off hold', ARRAY['lockoff', 'pull up hold'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['biceps', 'lats'], ARRAY['forearms', 'front-delts'], NOW(), NOW()),

-- Antagonist/accessory exercises
('ex_cl_018', 'Reverse Wrist Curl', 'reverse wrist curl', ARRAY['wrist extension', 'extensor training'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['forearms'], ARRAY[]::text[], NOW(), NOW()),
('ex_cl_020', 'Front Lever Progression', 'front lever progression', ARRAY['front lever', 'tuck front lever'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'abs', 'front-delts'], ARRAY['biceps', 'lower-back'], NOW(), NOW()),
('ex_cl_021', 'Scapular Pull-Up', 'scapular pull-up', ARRAY['scap pullup', 'shoulder shrug pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['mid-back'], ARRAY['lats'], NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;

-- --------------------------------------------------------------------------
-- 06: Cable and machine exercises
-- --------------------------------------------------------------------------

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

-- Gym machine exercises -- chest
('ex_cm_032', 'Machine Chest Press', 'machine chest press', ARRAY['chest press machine', 'seated chest press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),

-- Gym machine exercises -- back
('ex_cm_035', 'Machine Chest Supported Row', 'machine chest supported row', ARRAY['chest supported row', 'seated row machine', 'machine row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('ex_cm_036', 'Machine Lat Pulldown', 'machine lat pulldown', ARRAY['pulldown machine', 'lat pull machine'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['lats'], ARRAY['biceps', 'mid-back'], NOW(), NOW()),
('ex_cm_037', 'Machine Back Extension', 'machine back extension', ARRAY['back extension machine', 'roman chair', 'hyperextension'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['lower-back', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),

-- Gym machine exercises -- shoulders
('ex_cm_033', 'Machine Shoulder Press', 'machine shoulder press', ARRAY['shoulder press machine', 'seated machine press'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['front-delts', 'triceps'], ARRAY['side-delts'], NOW(), NOW()),

-- Gym machine exercises -- arms
('ex_cm_038', 'Machine Dip', 'machine dip', ARRAY['dip machine', 'assisted dip', 'machine tricep dip'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['triceps', 'chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_cm_039', 'Machine Preacher Curl', 'machine preacher curl', ARRAY['preacher curl machine', 'machine bicep curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),

-- Gym machine exercises -- legs
('ex_cm_040', 'Machine Leg Adduction', 'machine leg adduction', ARRAY['adductor machine', 'inner thigh machine', 'hip adduction machine'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['adductors'], ARRAY[]::text[], NOW(), NOW()),
('ex_cm_041', 'Machine Leg Abduction', 'machine leg abduction', ARRAY['abductor machine', 'outer thigh machine', 'hip abduction machine'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['glutes'], ARRAY[]::text[], NOW(), NOW()),

-- Gym machine exercises -- core
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

-- --------------------------------------------------------------------------
-- 07: Core and mobility exercises
-- --------------------------------------------------------------------------

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
-- Advanced core exercises
('ex_mo_001', 'Ab Wheel Rollout', 'ab wheel rollout', ARRAY['ab roller', 'ab wheel', 'wheel rollout'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['ab_wheel'], ARRAY['abs'], ARRAY['front-delts', 'lower-back'], NOW(), NOW()),
('ex_mo_002', 'Dead Bug', 'dead bug', ARRAY['deadbug', 'dead bug exercise'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], NOW(), NOW()),
('ex_mo_003', 'Bird Dog', 'bird dog', ARRAY['birddog', 'bird dog exercise'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs', 'lower-back'], ARRAY['glutes', 'front-delts'], NOW(), NOW()),
('ex_mo_004', 'Dragon Flag', 'dragon flag', ARRAY['dragon flags'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bench'], ARRAY['abs'], ARRAY['lats'], NOW(), NOW()),
('ex_mo_006', 'Copenhagen Plank', 'copenhagen plank', ARRAY['copenhagen side plank', 'adductor plank'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bench'], ARRAY['adductors', 'obliques'], ARRAY['abs'], NOW(), NOW()),
('ex_mo_007', 'Pallof Press', 'pallof press', ARRAY['band pallof press', 'anti rotation press'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['abs', 'obliques'], ARRAY['front-delts'], NOW(), NOW()),

-- Mobility and stretching exercises
('ex_mo_008', 'Cat-Cow Stretch', 'cat-cow stretch', ARRAY['cat cow', 'cat camel'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['lower-back'], ARRAY['abs'], NOW(), NOW()),
('ex_mo_009', 'Hip Flexor Stretch', 'hip flexor stretch', ARRAY['kneeling hip flexor stretch', 'lunge stretch'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads'], ARRAY[]::text[], NOW(), NOW()),
('ex_mo_010', 'Pigeon Pose', 'pigeon pose', ARRAY['pigeon stretch', 'hip external rotation stretch'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['glutes'], ARRAY[]::text[], NOW(), NOW()),
('ex_mo_011', 'Childs Pose', 'childs pose', ARRAY['child pose', 'resting pose'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['lower-back', 'lats'], ARRAY['front-delts'], NOW(), NOW()),
('ex_mo_012', 'Downward Dog', 'downward dog', ARRAY['down dog', 'downward facing dog'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['hamstrings', 'calves', 'front-delts'], ARRAY['lower-back'], NOW(), NOW()),
('ex_mo_013', 'Cobra Stretch', 'cobra stretch', ARRAY['cobra pose', 'sphinx pose'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY['chest'], NOW(), NOW()),
('ex_mo_014', 'Thread the Needle', 'thread the needle', ARRAY['spinal rotation stretch'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['mid-back', 'front-delts'], ARRAY['obliques'], NOW(), NOW()),
('ex_mo_015', '90/90 Hip Stretch', 'ninety ninety hip stretch', ARRAY['90-90 stretch', '90/90 stretch', 'seated hip stretch'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['glutes'], ARRAY[]::text[], NOW(), NOW()),

-- Dynamic mobility exercises
('ex_mo_016', 'Leg Swing', 'leg swing', ARRAY['leg swings', 'dynamic leg swing'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['hamstrings'], ARRAY[]::text[], NOW(), NOW()),
('ex_mo_017', 'Arm Circle', 'arm circle', ARRAY['arm circles', 'shoulder circles'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['front-delts'], ARRAY['mid-back'], NOW(), NOW()),
('ex_mo_018', 'Worlds Greatest Stretch', 'worlds greatest stretch', ARRAY['world greatest stretch', 'wgs'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['hamstrings'], ARRAY['front-delts', 'glutes'], NOW(), NOW()),
('ex_mo_019', 'Inchworm', 'inchworm', ARRAY['inchworms', 'inch worm'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['hamstrings', 'abs'], ARRAY['front-delts', 'calves'], NOW(), NOW()),
('ex_mo_020', 'Scorpion Stretch', 'scorpion stretch', ARRAY['scorpion'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['mid-back'], ARRAY['glutes', 'obliques'], NOW(), NOW()),

-- Foam rolling and recovery
('ex_mo_021', 'Foam Roll IT Band', 'foam roll it band', ARRAY['it band foam roll', 'itb foam roll'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['foam_roller'], ARRAY['quads'], ARRAY[]::text[], NOW(), NOW()),
('ex_mo_022', 'Foam Roll Quads', 'foam roll quads', ARRAY['quad foam roll', 'quadriceps foam roll'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['foam_roller'], ARRAY['quads'], ARRAY[]::text[], NOW(), NOW()),
('ex_mo_023', 'Foam Roll Upper Back', 'foam roll upper back', ARRAY['thoracic spine foam roll', 'upper back foam roll'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['foam_roller'], ARRAY['mid-back'], ARRAY[]::text[], NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
