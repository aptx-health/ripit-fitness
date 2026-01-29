-- Bodyweight Exercises Seed File
-- Run this in Supabase SQL Editor
-- System exercises for bodyweight training

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
('ex_bw_008', 'Chin-Up', 'chin-up', ARRAY['chinup', 'chin up', 'underhand pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull-up bar'], ARRAY['biceps', 'lats'], ARRAY['mid-back', 'forearms'], NOW(), NOW()),
('ex_bw_009', 'Wide Grip Pull-Up', 'wide grip pull-up', ARRAY['wide pullup', 'wide grip pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull-up bar'], ARRAY['lats'], ARRAY['mid-back', 'biceps'], NOW(), NOW()),
('ex_bw_010', 'Neutral Grip Pull-Up', 'neutral grip pull-up', ARRAY['neutral pullup', 'parallel grip pullup', 'hammer grip pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull-up bar'], ARRAY['lats', 'biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_bw_011', 'L-Sit Pull-Up', 'l-sit pull-up', ARRAY['l sit pullup', 'lsit pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull-up bar'], ARRAY['lats', 'biceps', 'abs'], ARRAY['forearms'], NOW(), NOW()),
('ex_bw_012', 'Muscle-Up', 'muscle-up', ARRAY['muscle up', 'muscleup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull-up bar'], ARRAY['lats', 'triceps', 'chest'], ARRAY['front-delts'], NOW(), NOW()),

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
('ex_bw_027', 'Hanging Leg Raise', 'hanging leg raise', ARRAY['hanging leg raises', 'hanging knee raise'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull-up bar'], ARRAY['abs'], ARRAY['forearms', 'lats'], NOW(), NOW()),
('ex_bw_028', 'Mountain Climber', 'mountain climber', ARRAY['mountain climbers'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY['front-delts'], NOW(), NOW()),
('ex_bw_029', 'Hollow Body Hold', 'hollow body hold', ARRAY['hollow hold', 'hollow body'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], NOW(), NOW()),
('ex_bw_030', 'V-Up', 'v-up', ARRAY['v up', 'vup', 'jackknife'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], NOW(), NOW()),

-- Plank variations
('ex_bw_031', 'Side Plank', 'side plank', ARRAY['side planks'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['obliques'], ARRAY['front-delts'], NOW(), NOW()),
('ex_bw_032', 'Plank to Push-Up', 'plank to push-up', ARRAY['up down plank', 'plank up down'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs', 'triceps'], ARRAY['front-delts', 'chest'], NOW(), NOW()),
('ex_bw_033', 'Plank Shoulder Tap', 'plank shoulder tap', ARRAY['shoulder taps', 'plank taps'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY['obliques'], NOW(), NOW()),

-- Dip variations
('ex_bw_034', 'Tricep Dip', 'tricep dip', ARRAY['triceps dip', 'bench dip'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dip bars'], ARRAY['triceps'], ARRAY['rear-delts'], NOW(), NOW()),
('ex_bw_035', 'Chest Dip', 'chest dip', ARRAY['chest dips'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dip bars'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),

-- Bodyweight back exercises
('ex_bw_036', 'Inverted Row', 'inverted row', ARRAY['bodyweight row', 'australian pullup', 'horizontal pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell', 'rack'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('ex_bw_037', 'Superman', 'superman', ARRAY['superman exercise', 'back extension'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['lower-back', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),

-- Glute/hamstring exercises
('ex_bw_038', 'Glute Bridge', 'glute bridge', ARRAY['hip bridge', 'bridge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['glutes', 'hamstrings'], ARRAY['lower-back'], NOW(), NOW()),
('ex_bw_039', 'Single Leg Glute Bridge', 'single leg glute bridge', ARRAY['one leg bridge', 'single leg bridge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['glutes', 'hamstrings'], ARRAY[]::text[], NOW(), NOW()),
('ex_bw_040', 'Nordic Curl', 'nordic curl', ARRAY['nordic hamstring curl', 'natural leg curl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['hamstrings'], ARRAY['glutes'], NOW(), NOW()),

-- Calisthenics
('ex_bw_041', 'Burpee', 'burpee', ARRAY['burpees'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['chest', 'quads'], ARRAY['front-delts', 'triceps'], NOW(), NOW()),
('ex_bw_042', 'Handstand Push-Up', 'handstand push-up', ARRAY['handstand pushup', 'hspu', 'vertical pushup'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['front-delts', 'triceps'], ARRAY['chest'], NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
