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
('cmiz7vl1k0009vr0m306fts69', 'Barbell Curl', 'barbell curl', ARRAY[]::text[], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('cmiz7vnpc000ovr0mcuhs0bum', 'Hammer Curl', 'hammer curl', ARRAY[]::text[], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('cmiz7vl76000avr0m27zo6aos', 'Tricep Pushdown', 'tricep pushdown', ARRAY[]::text[], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),

-- Back (5)
('cmiz7vk1i0003vr0mqucd1f52', 'Barbell Row', 'barbell row', ARRAY[]::text[], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('cmiz7vmmg000ivr0mojncaj84', 'Cable Row', 'cable row', ARRAY[]::text[], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['lats', 'mid-back'], ARRAY['biceps'], NOW(), NOW()),
('cmiz7vjvh0002vr0mtcmhiz70', 'Conventional Deadlift', 'conventional deadlift', ARRAY[]::text[], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['hamstrings', 'glutes', 'lower-back'], ARRAY['traps', 'forearms'], NOW(), NOW()),
('cmiz7vmgd000hvr0mkidkt6uu', 'Dumbbell Row', 'dumbbell row', ARRAY[]::text[], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['lats', 'mid-back'], ARRAY['biceps'], NOW(), NOW()),
('cmiz7vkvr0008vr0m7rv3dapc', 'Pull-Up', 'pull-up', ARRAY[]::text[], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['lats', 'biceps'], ARRAY['mid-back', 'forearms'], NOW(), NOW()),

-- Chest (4)
('cmiz7vjju0000vr0m4b1o6bec', 'Barbell Bench Press', 'barbell bench press', ARRAY[]::text[], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('cmiz7vmyl000kvr0mmr9a482v', 'Dips', 'dips', ARRAY[]::text[], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('cmiz7vkpg0007vr0mpbaneax3', 'Dumbbell Bench Press', 'dumbbell bench press', ARRAY[]::text[], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('cmiz7vkji0006vr0mrxfixnvy', 'Incline Barbell Bench Press', 'incline barbell bench press', ARRAY[]::text[], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),

-- Core (1)
('cmiz7vnjj000nvr0mgfa1vmx1', 'Plank', 'plank', ARRAY[]::text[], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], NOW(), NOW()),

-- Legs (9)
('cmiz7vjpo0001vr0msv9of7ib', 'Barbell Back Squat', 'barbell back squat', ARRAY[]::text[], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('cmiz7vnam000mvr0mano9z27r', 'Calf Raise', 'calf raise', ARRAY[]::text[], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['calves'], ARRAY[]::text[], NOW(), NOW()),
('cmiz7vm4s000fvr0mfh2shcrv', 'Front Squat', 'front squat', ARRAY[]::text[], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell', 'rack'], ARRAY['quads'], ARRAY['glutes'], NOW(), NOW()),
('cmiz7vljh000cvr0mlk0r5kco', 'Leg Curl', 'leg curl', ARRAY[]::text[], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['hamstrings'], ARRAY[]::text[], NOW(), NOW()),
('cmiz7vlqf000dvr0mm39bhj97', 'Leg Extension', 'leg extension', ARRAY[]::text[], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['quads'], ARRAY[]::text[], NOW(), NOW()),
('cmiz7vldb000bvr0mw4qzzagc', 'Leg Press', 'leg press', ARRAY[]::text[], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('cmiz7vn4b000lvr0m5aq17wb7', 'Lunges', 'lunges', ARRAY[]::text[], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('cmiz7vkdh0005vr0mr5dm18ls', 'Romanian Deadlift', 'romanian deadlift', ARRAY[]::text[], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['hamstrings', 'glutes'], ARRAY['lower-back'], NOW(), NOW()),
('cmiz7vma9000gvr0mmjmxhp9s', 'Sumo Deadlift', 'sumo deadlift', ARRAY[]::text[], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['hamstrings', 'glutes', 'adductors'], ARRAY['lower-back', 'traps'], NOW(), NOW()),

-- Shoulders (3)
('cmiz7vmsh000jvr0mq9pwqarc', 'Face Pull', 'face pull', ARRAY[]::text[], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['rear-delts'], ARRAY['traps', 'mid-back'], NOW(), NOW()),
('cmiz7vlyh000evr0m9d8snpzh', 'Lateral Raise', 'lateral raise', ARRAY[]::text[], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['side-delts'], ARRAY['traps'], NOW(), NOW()),
('cmiz7vk780004vr0md53c57bz', 'Overhead Press', 'overhead press', ARRAY[]::text[], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY[]::text[], ARRAY['front-delts', 'triceps'], ARRAY['chest'], NOW(), NOW())

ON CONFLICT ("normalizedName") DO NOTHING;
