-- Legacy System Exercises (CUID IDs)
-- These are the original 27 exercises created early in the project
-- They MUST be seeded FIRST to preserve their IDs for existing programs
-- Run this in Supabase SQL Editor BEFORE all other exercise seed files

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
