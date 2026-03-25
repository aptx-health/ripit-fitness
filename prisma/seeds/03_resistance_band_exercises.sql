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
  instructions,
  "createdAt",
  "updatedAt"
) VALUES
-- Chest exercises
('ex_rb_001', 'Band Chest Press', 'band chest press', ARRAY['resistance band chest press', 'band press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], null, NOW(), NOW()),
('ex_rb_002', 'Band Chest Fly', 'band chest fly', ARRAY['resistance band fly', 'band fly'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['chest'], ARRAY['front-delts'], null, NOW(), NOW()),
('ex_rb_003', 'Band Push-Up', 'band push-up', ARRAY['banded pushup', 'resistance band pushup'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band', 'bodyweight'], ARRAY['chest', 'triceps'], ARRAY['front-delts', 'abs'], null, NOW(), NOW()),

-- Back exercises
('ex_rb_004', 'Band Pull Apart', 'band pull apart', ARRAY['resistance band pull apart', 'band pull aparts'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['mid-back', 'rear-delts'], ARRAY['traps'], '1. Begin with your arms extended straight out in front of you, holding the band with both hands.
2. Initiate the movement by performing a reverse fly motion, moving your hands out laterally to your sides.
3. Keep your elbows extended as you perform the movement, bringing the band to your chest. Ensure that you keep your shoulders back during the exercise.
4. Pause as you complete the movement, returning to the starting position under control.', NOW(), NOW()),
('ex_rb_005', 'Band Row', 'band row', ARRAY['resistance band row', 'seated band row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], null, NOW(), NOW()),
('ex_rb_006', 'Band Lat Pulldown', 'band lat pulldown', ARRAY['resistance band lat pulldown', 'band pulldown'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['lats'], ARRAY['biceps', 'mid-back'], null, NOW(), NOW()),
('ex_rb_007', 'Band Deadlift', 'band deadlift', ARRAY['resistance band deadlift'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['hamstrings', 'glutes', 'lower-back'], ARRAY['traps', 'forearms'], null, NOW(), NOW()),
('ex_rb_008', 'Band Good Morning', 'band good morning', ARRAY['resistance band good morning'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['hamstrings', 'lower-back'], ARRAY['glutes'], '1. Using a 41 inch band, stand on one end, spreading your feet a small amount. Bend at the hips to loop the end of the band behind your neck. This will be your starting position.
2. Keeping your legs straight, extend through the hips to come to a near vertical position.
3. Ensure that you do not round your back as you go down back to the starting position.', NOW(), NOW()),

-- Shoulder exercises
('ex_rb_009', 'Band Shoulder Press', 'band shoulder press', ARRAY['resistance band shoulder press', 'band overhead press'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['front-delts', 'triceps'], ARRAY['side-delts'], '1. To begin, stand on an exercise band so that tension begins at arm''s length. Grasp the handles and lift them so that the hands are at shoulder height at each side.
2. Rotate the wrists so that the palms of your hands are facing forward. Your elbows should be bent, with the upper arms and forearms in line to the torso. This is your starting position.
3. As you exhale, lift the handles up until your arms are fully extended overhead.', NOW(), NOW()),
('ex_rb_010', 'Band Lateral Raise', 'band lateral raise', ARRAY['resistance band lateral raise', 'band side raise'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['side-delts'], ARRAY['traps'], '1. To begin, stand on an exercise band so that tension begins at arm''s length. Grasp the handles using a pronated (palms facing your thighs) grip that is slightly less than shoulder width. The handles should be resting on the sides of your thighs. Your arms should be extended with a slight bend at the elbows and your back should be straight. This will be your starting position.
2. Use your side shoulders to lift the handles to the sides as you exhale. Continue to lift the handles until they are slightly above parallel. Tip: As you lift the handles, slightly tilt the hand as if you were pouring water and keep your arms extended. Also, keep your torso stationary and pause for a second at the top of the movement.
3. Lower the handles back down slowly to the starting position. Inhale as you perform this portion of the movement.
4. Repeat for the recommended amount of repetitions.', NOW(), NOW()),
('ex_rb_011', 'Band Front Raise', 'band front raise', ARRAY['resistance band front raise'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['front-delts'], ARRAY['chest'], null, NOW(), NOW()),
('ex_rb_012', 'Band Rear Delt Fly', 'band rear delt fly', ARRAY['band reverse fly', 'resistance band rear delt fly'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['rear-delts'], ARRAY['mid-back'], null, NOW(), NOW()),
('ex_rb_013', 'Band Face Pull', 'band face pull', ARRAY['resistance band face pull'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['rear-delts', 'mid-back'], ARRAY['traps'], '1. Facing a high pulley with a rope or dual handles attached, pull the weight directly towards your face, separating your hands as you do so. Keep your upper arms parallel to the ground.', NOW(), NOW()),
('ex_rb_014', 'Band Upright Row', 'band upright row', ARRAY['resistance band upright row'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['side-delts', 'traps'], ARRAY['biceps'], '1. To begin, stand on an exercise band so that tension begins at arm''s length. Grasp the handles using a pronated (palms facing your thighs) grip that is slightly less than shoulder width. The handles should be resting on top of your thighs. Your arms should be extended with a slight bend at the elbows and your back should be straight. This will be your starting position.
2. Use your side shoulders to lift the handles as you exhale. The handles should be close to the body as you move them up. Continue to lift the handles until they nearly touches your chin. Tip: Your elbows should drive the motion. As you lift the handles, your elbows should always be higher than your forearms. Also, keep your torso stationary and pause for a second at the top of the movement.
3. Lower the handles back down slowly to the starting position. Inhale as you perform this portion of the movement.
4. Repeat for the recommended amount of repetitions.', NOW(), NOW()),

-- Arm exercises
('ex_rb_015', 'Band Bicep Curl', 'band bicep curl', ARRAY['resistance band curl', 'band curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['biceps'], ARRAY['forearms'], null, NOW(), NOW()),
('ex_rb_016', 'Band Hammer Curl', 'band hammer curl', ARRAY['resistance band hammer curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['biceps'], ARRAY['forearms'], null, NOW(), NOW()),
('ex_rb_017', 'Band Tricep Extension', 'band tricep extension', ARRAY['resistance band tricep extension', 'band overhead extension'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['triceps'], ARRAY[]::text[], null, NOW(), NOW()),
('ex_rb_018', 'Band Tricep Pushdown', 'band tricep pushdown', ARRAY['resistance band pushdown', 'band pushdown'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['triceps'], ARRAY[]::text[], null, NOW(), NOW()),
('ex_rb_019', 'Band Tricep Kickback', 'band tricep kickback', ARRAY['resistance band kickback'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['triceps'], ARRAY[]::text[], null, NOW(), NOW()),

-- Leg exercises
('ex_rb_020', 'Band Squat', 'band squat', ARRAY['resistance band squat', 'banded squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], null, NOW(), NOW()),
('ex_rb_021', 'Band Leg Press', 'band leg press', ARRAY['resistance band leg press'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], null, NOW(), NOW()),
('ex_rb_022', 'Band Leg Extension', 'band leg extension', ARRAY['resistance band leg extension'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['quads'], ARRAY[]::text[], null, NOW(), NOW()),
('ex_rb_023', 'Band Leg Curl', 'band leg curl', ARRAY['resistance band leg curl', 'band hamstring curl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['hamstrings'], ARRAY[]::text[], null, NOW(), NOW()),
('ex_rb_024', 'Band Glute Bridge', 'band glute bridge', ARRAY['resistance band glute bridge', 'banded glute bridge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['glutes', 'hamstrings'], ARRAY['lower-back'], null, NOW(), NOW()),
('ex_rb_025', 'Band Hip Thrust', 'band hip thrust', ARRAY['resistance band hip thrust', 'banded hip thrust'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['glutes', 'hamstrings'], ARRAY['lower-back'], null, NOW(), NOW()),
('ex_rb_026', 'Band Lunge', 'band lunge', ARRAY['resistance band lunge', 'banded lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], null, NOW(), NOW()),
('ex_rb_027', 'Band Standing Abduction', 'band standing abduction', ARRAY['band hip abduction', 'lateral band walk'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['glutes'], ARRAY[]::text[], null, NOW(), NOW()),
('ex_rb_028', 'Band Clamshell', 'band clamshell', ARRAY['resistance band clamshell', 'banded clamshell'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['glutes'], ARRAY[]::text[], null, NOW(), NOW()),
('ex_rb_029', 'Band Monster Walk', 'band monster walk', ARRAY['monster walks', 'resistance band monster walk'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['glutes'], ARRAY['quads'], '1. Place a band around both ankles and another around both knees. There should be enough tension that they are tight when your feet are shoulder width apart.
2. To begin, take short steps forward alternating your left and right foot.
3. After several steps, do just the opposite and walk backward to where you started.', NOW(), NOW()),

-- Core exercises
('ex_rb_030', 'Band Pallof Press', 'band pallof press', ARRAY['pallof press', 'resistance band pallof press'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['abs', 'obliques'], ARRAY['front-delts'], '1. Connect a standard handle to a tower, and—if possible—position the cable to shoulder height. If not, a low pulley will suffice.
2. With your side to the cable, grab the handle with both hands and step away from the tower. You should be approximately arm''s length away from the pulley, with the tension of the weight on the cable.
3. With your feet positioned hip-width apart and knees slightly bent, hold the cable to the middle of your chest. This will be your starting position.
4. Press the cable away from your chest, fully extending both arms. You core should be tight and engaged.
5. Hold the repetition for several seconds before returning to the starting position.
6. At the conclusion of the set, repeat facing the other direction.', NOW(), NOW()),
('ex_rb_031', 'Band Woodchop', 'band woodchop', ARRAY['resistance band woodchop', 'band wood chop'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['obliques'], ARRAY['front-delts'], '1. Connect a standard handle to a tower, and move the cable to the highest pulley position.
2. With your side to the cable, grab the handle with one hand and step away from the tower. You should be approximately arm''s length away from the pulley, with the tension of the weight on the cable. Your outstretched arm should be aligned with the cable.
3. With your feet positioned shoulder width apart, reach upward with your other hand and grab the handle with both hands. Your arms should still be fully extended.
4. In one motion, pull the handle down and across your body to your front knee while rotating your torso.
5. Keep your back and arms straight and core tight while you pivot your back foot and bend your knees to get a full range of motion.
6. Maintain your stance and straight arms. Return to the neutral position in a slow and controlled manner.
7. Repeat to failure.
8. Then, reposition and repeat the same series of movements on the opposite side.', NOW(), NOW()),
('ex_rb_032', 'Band Anti-Rotation Press', 'band anti-rotation press', ARRAY['resistance band anti rotation press'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance band'], ARRAY['abs', 'obliques'], ARRAY['front-delts'], null, NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
