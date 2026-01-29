-- Core and Mobility Exercises Seed File
-- Run this in Supabase SQL Editor
-- System exercises for core stability and mobility training

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
('ex_mo_001', 'Ab Wheel Rollout', 'ab wheel rollout', ARRAY['ab roller', 'ab wheel', 'wheel rollout'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['ab wheel'], ARRAY['abs'], ARRAY['front-delts', 'lower-back'], NOW(), NOW()),
('ex_mo_002', 'Dead Bug', 'dead bug', ARRAY['deadbug', 'dead bug exercise'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], NOW(), NOW()),
('ex_mo_003', 'Bird Dog', 'bird dog', ARRAY['birddog', 'bird dog exercise'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs', 'lower-back'], ARRAY['glutes', 'front-delts'], NOW(), NOW()),
('ex_mo_004', 'Dragon Flag', 'dragon flag', ARRAY['dragon flags'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bench'], ARRAY['abs'], ARRAY['lats'], NOW(), NOW()),
('ex_mo_005', 'L-Sit', 'l-sit', ARRAY['l sit', 'lsit'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['parallel bars'], ARRAY['abs'], ARRAY['triceps', 'front-delts'], NOW(), NOW()),
('ex_mo_006', 'Copenhagen Plank', 'copenhagen plank', ARRAY['copenhagen side plank', 'adductor plank'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bench'], ARRAY['adductors', 'obliques'], ARRAY['abs'], NOW(), NOW()),
('ex_mo_007', 'Pallof Press', 'pallof press', ARRAY['band pallof press', 'anti rotation press'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['abs', 'obliques'], ARRAY['front-delts'], NOW(), NOW()),

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
('ex_mo_021', 'Foam Roll IT Band', 'foam roll it band', ARRAY['it band foam roll', 'itb foam roll'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['foam roller'], ARRAY['quads'], ARRAY[]::text[], NOW(), NOW()),
('ex_mo_022', 'Foam Roll Quads', 'foam roll quads', ARRAY['quad foam roll', 'quadriceps foam roll'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['foam roller'], ARRAY['quads'], ARRAY[]::text[], NOW(), NOW()),
('ex_mo_023', 'Foam Roll Upper Back', 'foam roll upper back', ARRAY['thoracic spine foam roll', 'upper back foam roll'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['foam roller'], ARRAY['mid-back'], ARRAY[]::text[], NOW(), NOW()),
('ex_mo_024', 'Lacrosse Ball Glute Release', 'lacrosse ball glute release', ARRAY['glute smash', 'lacrosse ball glutes'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['lacrosse ball'], ARRAY['glutes'], ARRAY[]::text[], NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
