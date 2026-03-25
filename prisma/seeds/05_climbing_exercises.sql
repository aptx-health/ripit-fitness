-- Climbing-Specific Exercises Seed File
-- Run this in Supabase SQL Editor
-- System exercises for climbing and finger strength training

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
  instructions,
  "createdAt",
  "updatedAt"
) VALUES
-- Hangboard exercises
('ex_cl_001', 'Hangboard Max Hang', 'hangboard max hang', ARRAY['max hang', 'fingerboard max hang', 'dead hang'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['hangboard'], ARRAY['forearms'], ARRAY['front-delts', 'lats'], null, NOW(), NOW()),
('ex_cl_002', 'Hangboard Repeaters', 'hangboard repeaters', ARRAY['repeaters', 'fingerboard repeaters', 'hang repeaters'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['hangboard'], ARRAY['forearms'], ARRAY['front-delts', 'lats'], null, NOW(), NOW()),
('ex_cl_003', 'Half Crimp Hang', 'half crimp hang', ARRAY['half crimp', 'closed crimp hang'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['hangboard'], ARRAY['forearms'], ARRAY['front-delts'], null, NOW(), NOW()),
('ex_cl_004', 'Open Hand Hang', 'open hand hang', ARRAY['open crimp', 'three finger drag', 'open grip hang'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['hangboard'], ARRAY['forearms'], ARRAY['front-delts'], null, NOW(), NOW()),
('ex_cl_005', 'Weighted Hangboard Hang', 'weighted hangboard hang', ARRAY['weighted hang', 'added weight hang'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['hangboard', 'weight belt'], ARRAY['forearms'], ARRAY['front-delts', 'lats'], null, NOW(), NOW()),
('ex_cl_006', 'One Arm Hang', 'one arm hang', ARRAY['single arm hang', 'one handed hang'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['hangboard'], ARRAY['forearms', 'lats'], ARRAY['front-delts', 'abs'], null, NOW(), NOW()),
('ex_cl_007', 'Two Finger Pocket Hang', 'two finger pocket hang', ARRAY['pocket hang', 'two finger hang'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['hangboard'], ARRAY['forearms'], ARRAY['front-delts'], null, NOW(), NOW()),

-- Campus board exercises
('ex_cl_008', 'Campus Board Ladder', 'campus board ladder', ARRAY['campus ladder', 'ladder ups'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['campus board'], ARRAY['forearms', 'lats'], ARRAY['front-delts', 'biceps', 'abs'], null, NOW(), NOW()),
('ex_cl_009', 'Campus Board Max Ladder', 'campus board max ladder', ARRAY['max ladder', 'campus max'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['campus board'], ARRAY['forearms', 'lats'], ARRAY['front-delts', 'biceps', 'abs'], null, NOW(), NOW()),
('ex_cl_010', 'Campus Board Double Dyno', 'campus board double dyno', ARRAY['double dyno', 'campus dyno'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['campus board'], ARRAY['forearms', 'lats'], ARRAY['front-delts', 'biceps', 'abs'], null, NOW(), NOW()),
('ex_cl_011', 'Campus Board Touch and Go', 'campus board touch and go', ARRAY['touch and go', 'campus touches'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['campus board'], ARRAY['forearms'], ARRAY['front-delts', 'lats'], null, NOW(), NOW()),

-- System board/tension board exercises
('ex_cl_012', 'System Board Power Endurance', 'system board power endurance', ARRAY['system board workout', 'tension board workout'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['system board'], ARRAY['forearms'], ARRAY['abs', 'front-delts'], null, NOW(), NOW()),
('ex_cl_013', 'Boulder Circuit', 'boulder circuit', ARRAY['climbing circuit', 'boulder laps'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['climbing wall'], ARRAY['forearms'], ARRAY['abs', 'front-delts', 'quads'], null, NOW(), NOW()),

-- Climbing-specific pulling exercises
('ex_cl_014', 'Frenchies', 'frenchies', ARRAY['french pull ups', 'frenchies pullup'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull-up bar'], ARRAY['lats', 'biceps'], ARRAY['forearms', 'mid-back'], null, NOW(), NOW()),
('ex_cl_015', 'Typewriter Pull-Up', 'typewriter pull-up', ARRAY['typewriter pullup', 'side to side pullup'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull-up bar'], ARRAY['lats', 'biceps'], ARRAY['forearms', 'front-delts'], '1. Grab the pull-up bar with the palms facing forward using a wide grip.
2. As you have both arms extended in front of you holding the bar at a wide grip, bring your torso back around 30 degrees or so while creating a curvature on your lower back and sticking your chest out. This is your starting position.
3. Pull your torso up while leaning to the left hand side until the bar almost touches your upper chest by drawing the shoulders and the upper arms down and back. Exhale as you perform this portion of the movement. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary as it moves through space (no swinging) and only the arms should move. The forearms should do no other work other than hold the bar.
4. After a second of contraction, inhale as you go back to the starting position.
5. Now, pull your torso up while leaning to the right hand side until the bar almost touches your upper chest by drawing the shoulders and the upper arms down and back. Exhale as you perform this portion of the movement. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary as it moves through space and only the arms should move. The forearms should do no other work other than hold the bar.
6. After a second of contraction, inhale as you go back to the starting position.
7. Repeat steps 3-6 until you have performed the prescribed amount of repetitions for each side.', NOW(), NOW()),
('ex_cl_016', 'Assisted One Arm Pull-Up', 'assisted one arm pull-up', ARRAY['assisted one arm pullup', 'one arm negative'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull-up bar'], ARRAY['lats', 'biceps'], ARRAY['forearms', 'abs'], null, NOW(), NOW()),
('ex_cl_017', 'Lock-Off Hold', 'lock-off hold', ARRAY['lockoff', 'pull up hold'], 'climbing', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull-up bar'], ARRAY['biceps', 'lats'], ARRAY['forearms', 'front-delts'], null, NOW(), NOW()),

-- Core/antagonist training for climbers
('ex_cl_018', 'Reverse Wrist Curl', 'reverse wrist curl', ARRAY['wrist extension', 'extensor training'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbells'], ARRAY['forearms'], ARRAY[]::text[], null, NOW(), NOW()),
('ex_cl_019', 'Finger Extension Exercise', 'finger extension exercise', ARRAY['rubber band extensions', 'extensor work'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['rubber band'], ARRAY['forearms'], ARRAY[]::text[], null, NOW(), NOW()),
('ex_cl_020', 'Front Lever Progression', 'front lever progression', ARRAY['front lever', 'tuck front lever'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull-up bar'], ARRAY['lats', 'abs', 'front-delts'], ARRAY['biceps', 'lower-back'], null, NOW(), NOW()),
('ex_cl_021', 'Scapular Pull-Up', 'scapular pull-up', ARRAY['scap pullup', 'shoulder shrug pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull-up bar'], ARRAY['mid-back'], ARRAY['lats'], '1. Take a pronated grip on a pull-up bar.
2. From a hanging position, raise yourself a few inches without using your arms. Do this by depressing your shoulder girdle in a reverse shrugging motion.
3. Pause at the completion of the movement, and then slowly return to the starting position before performing more repetitions.', NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
