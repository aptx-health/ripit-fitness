-- Resistance Band Exercises Seed File
-- Run this in Supabase SQL Editor
-- System exercises for resistance band training

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
('ex_rb_001', 'Band Chest Press', 'band chest press', ARRAY['resistance band chest press', 'band press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], NOW(), NOW()),
('ex_rb_002', 'Band Chest Fly', 'band chest fly', ARRAY['resistance band fly', 'band fly'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['chest'], ARRAY['front-delts'], NOW(), NOW()),
('ex_rb_003', 'Band Push-Up', 'band push-up', ARRAY['banded pushup', 'resistance band pushup'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band', 'bodyweight'], ARRAY['chest', 'triceps'], ARRAY['front-delts', 'abs'], NOW(), NOW()),

-- Back exercises
('ex_rb_004', 'Band Pull Apart', 'band pull apart', ARRAY['resistance band pull apart', 'band pull aparts'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['mid-back', 'rear-delts'], ARRAY['traps'], NOW(), NOW()),
('ex_rb_005', 'Band Row', 'band row', ARRAY['resistance band row', 'seated band row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], NOW(), NOW()),
('ex_rb_006', 'Band Lat Pulldown', 'band lat pulldown', ARRAY['resistance band lat pulldown', 'band pulldown'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['lats'], ARRAY['biceps', 'mid-back'], NOW(), NOW()),
('ex_rb_007', 'Band Deadlift', 'band deadlift', ARRAY['resistance band deadlift'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['hamstrings', 'glutes', 'lower-back'], ARRAY['traps', 'forearms'], NOW(), NOW()),
('ex_rb_008', 'Band Good Morning', 'band good morning', ARRAY['resistance band good morning'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['hamstrings', 'lower-back'], ARRAY['glutes'], NOW(), NOW()),

-- Shoulder exercises
('ex_rb_009', 'Band Shoulder Press', 'band shoulder press', ARRAY['resistance band shoulder press', 'band overhead press'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['front-delts', 'triceps'], ARRAY['side-delts'], NOW(), NOW()),
('ex_rb_010', 'Band Lateral Raise', 'band lateral raise', ARRAY['resistance band lateral raise', 'band side raise'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['side-delts'], ARRAY['traps'], NOW(), NOW()),
('ex_rb_011', 'Band Front Raise', 'band front raise', ARRAY['resistance band front raise'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['front-delts'], ARRAY['chest'], NOW(), NOW()),
('ex_rb_012', 'Band Rear Delt Fly', 'band rear delt fly', ARRAY['band reverse fly', 'resistance band rear delt fly'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['rear-delts'], ARRAY['mid-back'], NOW(), NOW()),
('ex_rb_013', 'Band Face Pull', 'band face pull', ARRAY['resistance band face pull'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['rear-delts', 'mid-back'], ARRAY['traps'], NOW(), NOW()),
('ex_rb_014', 'Band Upright Row', 'band upright row', ARRAY['resistance band upright row'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['side-delts', 'traps'], ARRAY['biceps'], NOW(), NOW()),

-- Arm exercises
('ex_rb_015', 'Band Bicep Curl', 'band bicep curl', ARRAY['resistance band curl', 'band curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_rb_016', 'Band Hammer Curl', 'band hammer curl', ARRAY['resistance band hammer curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['biceps'], ARRAY['forearms'], NOW(), NOW()),
('ex_rb_017', 'Band Tricep Extension', 'band tricep extension', ARRAY['resistance band tricep extension', 'band overhead extension'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_rb_018', 'Band Tricep Pushdown', 'band tricep pushdown', ARRAY['resistance band pushdown', 'band pushdown'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),
('ex_rb_019', 'Band Tricep Kickback', 'band tricep kickback', ARRAY['resistance band kickback'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['triceps'], ARRAY[]::text[], NOW(), NOW()),

-- Leg exercises
('ex_rb_020', 'Band Squat', 'band squat', ARRAY['resistance band squat', 'banded squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),
('ex_rb_021', 'Band Leg Press', 'band leg press', ARRAY['resistance band leg press'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], NOW(), NOW()),
('ex_rb_022', 'Band Leg Extension', 'band leg extension', ARRAY['resistance band leg extension'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['quads'], ARRAY[]::text[], NOW(), NOW()),
('ex_rb_023', 'Band Leg Curl', 'band leg curl', ARRAY['resistance band leg curl', 'band hamstring curl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['hamstrings'], ARRAY[]::text[], NOW(), NOW()),
('ex_rb_024', 'Band Glute Bridge', 'band glute bridge', ARRAY['resistance band glute bridge', 'banded glute bridge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['glutes', 'hamstrings'], ARRAY['lower-back'], NOW(), NOW()),
('ex_rb_025', 'Band Hip Thrust', 'band hip thrust', ARRAY['resistance band hip thrust', 'banded hip thrust'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['glutes', 'hamstrings'], ARRAY['lower-back'], NOW(), NOW()),
('ex_rb_026', 'Band Lunge', 'band lunge', ARRAY['resistance band lunge', 'banded lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], NOW(), NOW()),
('ex_rb_027', 'Band Standing Abduction', 'band standing abduction', ARRAY['band hip abduction', 'lateral band walk'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['glutes'], ARRAY[]::text[], NOW(), NOW()),
('ex_rb_028', 'Band Clamshell', 'band clamshell', ARRAY['resistance band clamshell', 'banded clamshell'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['glutes'], ARRAY[]::text[], NOW(), NOW()),
('ex_rb_029', 'Band Monster Walk', 'band monster walk', ARRAY['monster walks', 'resistance band monster walk'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['glutes'], ARRAY['quads'], NOW(), NOW()),

-- Core exercises
('ex_rb_030', 'Band Pallof Press', 'band pallof press', ARRAY['pallof press', 'resistance band pallof press'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['abs', 'obliques'], ARRAY['front-delts'], NOW(), NOW()),
('ex_rb_031', 'Band Woodchop', 'band woodchop', ARRAY['resistance band woodchop', 'band wood chop'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['obliques'], ARRAY['front-delts'], NOW(), NOW()),
('ex_rb_032', 'Band Anti-Rotation Press', 'band anti-rotation press', ARRAY['resistance band anti rotation press'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['abs', 'obliques'], ARRAY['front-delts'], NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
