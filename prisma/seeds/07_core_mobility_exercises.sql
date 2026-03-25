-- Core and Mobility Exercises Seed File
-- System exercises for core stability and mobility training
-- Removed: lacrosse ball (not available), L-Sit on parallel bars (not available)

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
  force,
  mechanic,
  level,
  "createdAt",
  "updatedAt"
) VALUES
-- Advanced core exercises
('ex_mo_001', 'Ab Wheel Rollout', 'ab wheel rollout', ARRAY['ab roller', 'ab wheel', 'wheel rollout'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['ab_wheel'], ARRAY['abs'], ARRAY['front-delts', 'lower-back'], '1. Hold the Ab Roller with both hands and kneel on the floor.
2. Now place the ab roller on the floor in front of you so that you are on all your hands and knees (as in a kneeling push up position). This will be your starting position.
3. Slowly roll the ab roller straight forward, stretching your body into a straight position. Tip: Go down as far as you can without touching the floor with your body. Breathe in during this portion of the movement.
4. After a pause at the stretched position, start pulling yourself back to the starting position as you breathe out. Tip: Go slowly and keep your abs tight at all times.', 'pull', 'compound', 'intermediate', NOW(), NOW()),
('ex_mo_002', 'Dead Bug', 'dead bug', ARRAY['deadbug', 'dead bug exercise'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], '1. Begin lying on your back with your hands extended above you toward the ceiling.
2. Bring your feet, knees, and hips up to 90 degrees.
3. Exhale hard to bring your ribcage down and flatten your back onto the floor, rotating your pelvis up and squeezing your glutes. Hold this position throughout the movement. This will be your starting position.
4. Initiate the exercise by extending one leg, straightening the knee and hip to bring the leg just above the ground.
5. Maintain the position of your lumbar and pelvis as you perform the movement, as your back is going to want to arch.
6. Stay tight and return the working leg to the starting position.
7. Repeat on the opposite side, alternating until the set is complete.', 'pull', 'compound', 'beginner', NOW(), NOW()),
('ex_mo_003', 'Bird Dog', 'bird dog', ARRAY['birddog', 'bird dog exercise'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs', 'lower-back'], ARRAY['glutes', 'front-delts'], null, null, null, null, NOW(), NOW()),
('ex_mo_004', 'Dragon Flag', 'dragon flag', ARRAY['dragon flags'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bench'], ARRAY['abs'], ARRAY['lats'], null, null, null, null, NOW(), NOW()),
('ex_mo_006', 'Copenhagen Plank', 'copenhagen plank', ARRAY['copenhagen side plank', 'adductor plank'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bench'], ARRAY['adductors', 'obliques'], ARRAY['abs'], null, null, null, null, NOW(), NOW()),
('ex_mo_007', 'Pallof Press', 'pallof press', ARRAY['band pallof press', 'anti rotation press'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['resistance_band'], ARRAY['abs', 'obliques'], ARRAY['front-delts'], '1. Connect a standard handle to a tower, and—if possible—position the cable to shoulder height. If not, a low pulley will suffice.
2. With your side to the cable, grab the handle with both hands and step away from the tower. You should be approximately arm''s length away from the pulley, with the tension of the weight on the cable.
3. With your feet positioned hip-width apart and knees slightly bent, hold the cable to the middle of your chest. This will be your starting position.
4. Press the cable away from your chest, fully extending both arms. You core should be tight and engaged.
5. Hold the repetition for several seconds before returning to the starting position.
6. At the conclusion of the set, repeat facing the other direction.', 'pull', 'isolation', 'beginner', NOW(), NOW()),

-- Mobility and stretching exercises
('ex_mo_008', 'Cat-Cow Stretch', 'cat-cow stretch', ARRAY['cat cow', 'cat camel'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['lower-back'], ARRAY['abs'], '1. Position yourself on the floor on your hands and knees.
2. Pull your belly in and round your spine, lower back, shoulders, and neck, letting your head drop.
3. Hold for 15 seconds.', 'static', null, 'beginner', NOW(), NOW()),
('ex_mo_009', 'Hip Flexor Stretch', 'hip flexor stretch', ARRAY['kneeling hip flexor stretch', 'lunge stretch'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads'], ARRAY[]::text[], '1. Kneel on a mat and bring your right knee up so the bottom of your foot is on the floor and extend your left leg out behind you so the top of your foot is on the floor.
2. Shift your weight forward until you feel a stretch in your hip. Hold for 15 seconds, then repeat for your other side.', 'static', 'isolation', 'beginner', NOW(), NOW()),
('ex_mo_010', 'Pigeon Pose', 'pigeon pose', ARRAY['pigeon stretch', 'hip external rotation stretch'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['glutes'], ARRAY[]::text[], '1. Sit in a chair so your back is straight and your feet planted on the floor.
2. Interlace your fingers behind your head, elbows out and your chin down.
3. Twist your upper body to one side about 3 times as far as you can. Then lean forward and twist your torso to reach your elbow to the floor on the inside of your knee.
4. Return to upright position and then repeat for your other side.', 'static', 'isolation', 'beginner', NOW(), NOW()),
('ex_mo_011', 'Childs Pose', 'childs pose', ARRAY['child pose', 'resting pose'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['lower-back', 'lats'], ARRAY['front-delts'], '1. Get on your hands and knees, walk your hands in front of you.
2. Lower your buttocks down to sit on your heels. Let your arms drag along the floor as you sit back to stretch your entire spine.
3. Once you settle onto your heels, bring your hands next to your feet and relax. "breathe" into your back. Rest your forehead on the floor. Avoid this position if you have knee problems.', 'static', null, 'beginner', NOW(), NOW()),
('ex_mo_012', 'Downward Dog', 'downward dog', ARRAY['down dog', 'downward facing dog'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['hamstrings', 'calves', 'front-delts'], ARRAY['lower-back'], '1. Lie facedown on top of an exercise ball.
2. While resting on your stomach on the ball, walk your hands forward along the floor and lift your legs, extending your elbows and knees.', 'static', 'isolation', 'intermediate', NOW(), NOW()),
('ex_mo_013', 'Cobra Stretch', 'cobra stretch', ARRAY['cobra pose', 'sphinx pose'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY['chest'], null, null, null, null, NOW(), NOW()),
('ex_mo_014', 'Thread the Needle', 'thread the needle', ARRAY['spinal rotation stretch'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['mid-back', 'front-delts'], ARRAY['obliques'], '1. Sit in a chair so your back is straight and your feet planted on the floor.
2. Interlace your fingers behind your head, elbows out and your chin down.
3. Twist your upper body to one side about 3 times as far as you can. Then lean forward and twist your torso to reach your elbow to the floor on the inside of your knee.
4. Return to upright position and then repeat for your other side.', 'static', 'isolation', 'beginner', NOW(), NOW()),
('ex_mo_015', '90/90 Hip Stretch', 'ninety ninety hip stretch', ARRAY['90-90 stretch', '90/90 stretch', 'seated hip stretch'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['glutes'], ARRAY[]::text[], null, null, null, null, NOW(), NOW()),

-- Dynamic mobility exercises
('ex_mo_016', 'Leg Swing', 'leg swing', ARRAY['leg swings', 'dynamic leg swing'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['hamstrings'], ARRAY[]::text[], null, null, null, null, NOW(), NOW()),
('ex_mo_017', 'Arm Circle', 'arm circle', ARRAY['arm circles', 'shoulder circles'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['front-delts'], ARRAY['mid-back'], '1. Stand up and extend your arms straight out by the sides. The arms should be parallel to the floor and perpendicular (90-degree angle) to your torso. This will be your starting position.
2. Slowly start to make circles of about 1 foot in diameter with each outstretched arm. Breathe normally as you perform the movement.
3. Continue the circular motion of the outstretched arms for about ten seconds. Then reverse the movement, going the opposite direction.', 'push', 'isolation', 'beginner', NOW(), NOW()),
('ex_mo_018', 'Worlds Greatest Stretch', 'worlds greatest stretch', ARRAY['world greatest stretch', 'wgs'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['hamstrings'], ARRAY['front-delts', 'glutes'], '1. This is a three-part stretch. Begin by lunging forward, with your front foot flat on the ground and on the toes of your back foot. With your knees bent, squat down until your knee is almost touching the ground. Keep your torso erect, and hold this position for 10-20 seconds.
2. Now, place the arm on the same side as your front leg on the ground, with the elbow next to the foot. Your other hand should be placed on the ground, parallel to your lead leg, to help support you during this portion of the stretch.
3. After 10-20 seconds, place your hands on either side of your front foot. Raise the toes of the front foot off of the ground, and straighten your leg. You may need to reposition your rear leg to do so. Hold for 10-20 seconds, and then repeat the entire sequence for the other side.', 'static', null, 'intermediate', NOW(), NOW()),
('ex_mo_019', 'Inchworm', 'inchworm', ARRAY['inchworms', 'inch worm'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['hamstrings', 'abs'], ARRAY['front-delts', 'calves'], '1. Stand with your feet close together. Keeping your legs straight, stretch down and put your hands on the floor directly in front of you. This will be your starting position.
2. Begin by walking your hands forward slowly, alternating your left and your right. As you do so, bend only at the hip, keeping your legs straight.
3. Keep going until your body is parallel to the ground in a pushup position.
4. Now, keep your hands in place and slowly take short steps with your feet, moving only a few inches at a time.
5. Continue walking until your feet are by hour hands, keeping your legs straight as you do so.', null, 'compound', 'beginner', NOW(), NOW()),
('ex_mo_020', 'Scorpion Stretch', 'scorpion stretch', ARRAY['scorpion'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['mid-back'], ARRAY['glutes', 'obliques'], null, null, null, null, NOW(), NOW()),

-- Foam rolling and recovery
('ex_mo_021', 'Foam Roll IT Band', 'foam roll it band', ARRAY['it band foam roll', 'itb foam roll'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['foam_roller'], ARRAY['quads'], ARRAY[]::text[], null, null, null, null, NOW(), NOW()),
('ex_mo_022', 'Foam Roll Quads', 'foam roll quads', ARRAY['quad foam roll', 'quadriceps foam roll'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['foam_roller'], ARRAY['quads'], ARRAY[]::text[], '1. Lay facedown on the floor with your weight supported by your hands or forearms. Place a foam roll underneath one leg on the quadriceps, and keep the foot off of the ground. Make sure to relax the leg as much as possible. This will be your starting position.
2. Shifting as much weight onto the leg to be stretched as is tolerable, roll over the foam from above the knee to below the hip, holding points of tension for 10-30 seconds. Switch sides.', 'static', 'isolation', 'intermediate', NOW(), NOW()),
('ex_mo_023', 'Foam Roll Upper Back', 'foam roll upper back', ARRAY['thoracic spine foam roll', 'upper back foam roll'], 'mobility', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['foam_roller'], ARRAY['mid-back'], ARRAY[]::text[], '1. While seated, bend forward to hug your thighs from underneath with both arms.
2. Keep your knees together and your legs extended out as you bring your chest down to your knees. You can also stretch your middle back by pulling your back away from your knees as your hugging them.', 'static', null, 'beginner', NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
