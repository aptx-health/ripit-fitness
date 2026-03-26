-- Bodyweight Exercises Seed File
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
  instructions,
  force,
  mechanic,
  level,
  "createdAt",
  "updatedAt"
) VALUES
-- Push-up variations
('ex_bw_001', 'Standard Push-Up', 'standard push-up', ARRAY['push-up', 'pushup', 'push up', 'standard pushup'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], '1. Lie on the floor face down and place your hands about 36 inches apart while holding your torso up at arms length.
2. Next, lower yourself downward until your chest almost touches the floor as you inhale.
3. Now breathe out and press your upper body back up to the starting position while squeezing your chest.
4. After a brief pause at the top contracted position, you can begin to lower yourself downward again for as many repetitions as needed.', 'push', 'compound', 'beginner', NOW(), NOW()),
('ex_bw_002', 'Wide Push-Up', 'wide push-up', ARRAY['wide pushup', 'wide grip pushup'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['chest'], ARRAY['front-delts', 'triceps'], '1. Lie on the floor face down and place your hands about 36 inches apart while holding your torso up at arms length. Move your feet up to a box or bench. This will be your starting position.
2. Next, lower yourself downward until your chest almost touches the floor as you inhale.
3. Now breathe out and press your upper body back up to the starting position while squeezing your chest.
4. After a brief pause at the top contracted position, you can begin to lower yourself downward again for as many repetitions as needed.', 'push', 'compound', 'beginner', NOW(), NOW()),
('ex_bw_003', 'Diamond Push-Up', 'diamond push-up', ARRAY['diamond pushup', 'close grip pushup', 'triangle pushup'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['triceps', 'chest'], ARRAY['front-delts'], null, null, null, null, NOW(), NOW()),
('ex_bw_004', 'Decline Push-Up', 'decline push-up', ARRAY['decline pushup', 'feet elevated pushup'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight', 'bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], '1. Lie on the floor face down and place your hands about 36 inches apart while holding your torso up at arms length. Move your feet up to a box or bench. This will be your starting position.
2. Next, lower yourself downward until your chest almost touches the floor as you inhale.
3. Now breathe out and press your upper body back up to the starting position while squeezing your chest.
4. After a brief pause at the top contracted position, you can begin to lower yourself downward again for as many repetitions as needed.', 'push', 'compound', 'beginner', NOW(), NOW()),
('ex_bw_005', 'Incline Push-Up', 'incline push-up', ARRAY['incline pushup', 'hands elevated pushup'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight', 'bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], '1. Stand facing bench or sturdy elevated platform. Place hands on edge of bench or platform, slightly wider than shoulder width.
2. Position forefoot back from bench or platform with arms and body straight. Arms should be perpendicular to body. Keeping body straight, lower chest to edge of box or platform by bending arms.
3. Push body up until arms are extended. Repeat.', 'push', 'compound', 'beginner', NOW(), NOW()),
('ex_bw_006', 'Pike Push-Up', 'pike push-up', ARRAY['pike pushup', 'shoulder pushup'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['front-delts', 'triceps'], ARRAY['chest'], null, null, null, null, NOW(), NOW()),
('ex_bw_007', 'Archer Push-Up', 'archer push-up', ARRAY['archer pushup', 'side to side pushup'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], null, null, null, null, NOW(), NOW()),

-- Pull-up/Chin-up variations
('ex_bw_008', 'Chin-Up', 'chin-up', ARRAY['chinup', 'chin up', 'underhand pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['biceps', 'lats'], ARRAY['mid-back', 'forearms'], '1. Grab the pull-up bar with the palms facing your torso and a grip closer than the shoulder width.
2. As you have both arms extended in front of you holding the bar at the chosen grip width, keep your torso as straight as possible while creating a curvature on your lower back and sticking your chest out. This is your starting position. Tip: Keeping the torso as straight as possible maximizes biceps stimulation while minimizing back involvement.
3. As you breathe out, pull your torso up until your head is around the level of the pull-up bar. Concentrate on using the biceps muscles in order to perform the movement. Keep the elbows close to your body. Tip: The upper torso should remain stationary as it moves through space and only the arms should move. The forearms should do no other work other than hold the bar.
4. After a second of squeezing the biceps in the contracted position, slowly lower your torso back to the starting position; when your arms are fully extended. Breathe in as you perform this portion of the movement.
5. Repeat this motion for the prescribed amount of repetitions.', 'pull', 'compound', 'beginner', NOW(), NOW()),
('ex_bw_009', 'Wide Grip Pull-Up', 'wide grip pull-up', ARRAY['wide pullup', 'wide grip pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats'], ARRAY['mid-back', 'biceps'], '1. Grab the pull-up bar with the palms facing forward using a wide grip.
2. As you have both arms extended in front of you holding the bar, bring your torso forward and head so that there is an imaginary line from the pull-up bar to the back of your neck. This is your starting position.
3. Pull your torso up until the bar is near the back of your neck. To do this, draw the shoulders and upper arms down and back while slightly leaning your head forward. Exhale as you perform this portion of the movement. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary as it moves through space and only the arms should move. The forearms should do no other work other than hold the bar.
4. After a second on the contracted position, start to inhale and slowly lower your torso back to the starting position when your arms are fully extended and the lats are fully stretched.
5. Repeat this motion for the prescribed amount of repetitions.', 'pull', 'compound', 'intermediate', NOW(), NOW()),
('ex_bw_010', 'Neutral Grip Pull-Up', 'neutral grip pull-up', ARRAY['neutral pullup', 'parallel grip pullup', 'hammer grip pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'biceps'], ARRAY['forearms'], null, null, null, null, NOW(), NOW()),
('ex_bw_011', 'L-Sit Pull-Up', 'l-sit pull-up', ARRAY['l sit pullup', 'lsit pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'biceps', 'abs'], ARRAY['forearms'], null, null, null, null, NOW(), NOW()),
('ex_bw_012', 'Muscle-Up', 'muscle-up', ARRAY['muscle up', 'muscleup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'triceps', 'chest'], ARRAY['front-delts'], '1. Grip the rings using a false grip, with the base of your palms on top of the rings. Initiate a pull up by pulling the elbows down to your side, flexing the elbows.
2. As you reach the top position of the pull-up, pull the rings to your armpits as you roll your shoulders forward, allowing your elbows to move straight back behind you. This puts you into the proper position to continue into the dip portion of the movement.
3. Maintaining control and stability, extend through the elbow to complete the motion.
4. Use care when lowering yourself to the ground.', 'pull', 'compound', 'intermediate', NOW(), NOW()),

-- Squat variations
('ex_bw_013', 'Bodyweight Squat', 'bodyweight squat', ARRAY['air squat', 'squat', 'bw squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], '1. Stand with your feet shoulder width apart. You can place your hands behind your head. This will be your starting position.
2. Begin the movement by flexing your knees and hips, sitting back with your hips.
3. Continue down to full depth if you are able,and quickly reverse the motion until you return to the starting position. As you squat, keep your head and chest up and push your knees out.', 'push', 'compound', 'beginner', NOW(), NOW()),
('ex_bw_014', 'Jump Squat', 'jump squat', ARRAY['squat jump', 'jumping squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'calves'], '1. Assume a lunge stance position with one foot forward with the knee bent, and the rear knee nearly touching the ground.
2. Ensure that the front knee is over the midline of the foot.
3. Extending through both legs, jump as high as possible, swinging your arms to gain lift.
4. As you jump, bring your feet together, and move them back to their initial positions as you land.
5. Absorb the impact by reverting back to the starting position.', 'push', 'compound', 'beginner', NOW(), NOW()),
('ex_bw_015', 'Pistol Squat', 'pistol squat', ARRAY['single leg squat', 'one leg squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], '1. Start by standing about 2 to 3 feet in front of a flat bench with your back facing the bench. Have a barbell in front of you on the floor. Tip: Your feet should be shoulder width apart from each other.
2. Bend the knees and use a pronated grip with your hands being wider than shoulder width apart from each other to lift the barbell up until you can rest it on your chest.
3. Then lift the barbell over your head and rest it on the base of your neck. Move one foot back so that your toe is resting on the flat bench. Your other foot should be stationary in front of you. Keep your head up at all times as looking down will get you off balance and also maintain a straight back. Tip: Make sure your back is straight and chest is out while performing this exercise.
4. As you inhale, slowly lower your leg until your thigh is parallel to the floor. At this point, your knee should be over your toes. Your chest should be directly above the middle of your thigh.
5. Leading with the chest and hips and contracting the quadriceps, elevate your leg back to the starting position as you exhale.
6. Repeat for the recommended amount of repetitions.
7. Switch legs and repeat the movement.', 'push', 'compound', 'expert', NOW(), NOW()),
('ex_bw_016', 'Bulgarian Split Squat', 'bulgarian split squat', ARRAY['rear foot elevated split squat', 'bulgarian squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight', 'bench'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], '1. Suspend your straps so the handles are 18-30 inches from the floor.
2. Facing away from the setup, place your rear foot into the handle behind you. Keep your head looking forward and your chest up, with your knee slightly bent. This will be your starting position.
3. Descend by flexing the knee and hips, lowering yourself to the ground. Keep your weight on the heel of your foot and maintain your posture throughout the exercise.
4. At the bottom of the movement, reverse the motion, extending through the hip and knee to return to the starting position.', 'push', 'compound', 'intermediate', NOW(), NOW()),
('ex_bw_017', 'Sissy Squat', 'sissy squat', ARRAY['sissy squats'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads'], ARRAY['abs'], '1. Stand with your feet shoulder width apart. This will be your starting position.
2. Begin the movement by flexing your knees and hips, sitting back with your hips.
3. Continue until you have squatted a portion of the way down, but are above parallel, and quickly reverse the motion until you return to the starting position. Repeat for 5-10 repetitions.', 'push', null, 'beginner', NOW(), NOW()),

-- Lunge variations
('ex_bw_018', 'Bodyweight Lunge', 'bodyweight lunge', ARRAY['lunge', 'forward lunge', 'bw lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], '1. Begin standing with your feet shoulder width apart and your hands on your hips.
2. Step forward with one leg, flexing the knees to drop your hips. Descend until your rear knee nearly touches the ground. Your posture should remain upright, and your front knee should stay above the front foot.
3. Drive through the heel of your lead foot and extend both knees to raise yourself back up.
4. Step forward with your rear foot, repeating the lunge on the opposite leg.', 'push', 'compound', 'beginner', NOW(), NOW()),
('ex_bw_019', 'Reverse Lunge', 'reverse lunge', ARRAY['backward lunge', 'step back lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], null, null, null, null, NOW(), NOW()),
('ex_bw_020', 'Walking Lunge', 'walking lunge', ARRAY['walking lunges'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], '1. Begin standing with your feet shoulder width apart and a barbell across your upper back.
2. Step forward with one leg, flexing the knees to drop your hips. Descend until your rear knee nearly touches the ground. Your posture should remain upright, and your front knee should stay above the front foot.
3. Drive through the heel of your lead foot and extend both knees to raise yourself back up.
4. Step forward with your rear foot, repeating the lunge on the opposite leg.', 'push', 'compound', 'beginner', NOW(), NOW()),
('ex_bw_021', 'Jumping Lunge', 'jumping lunge', ARRAY['jump lunge', 'lunge jump', 'split jump'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'calves'], '1. Assume a lunge stance position with one foot forward with the knee bent, and the rear knee nearly touching the ground.
2. Ensure that the front knee is over the midline of the foot.
3. Extending through both legs, jump as high as possible, swinging your arms to gain lift.
4. As you jump, bring your feet together, and move them back to their initial positions as you land.
5. Absorb the impact by reverting back to the starting position.', 'push', 'compound', 'beginner', NOW(), NOW()),

-- Core exercises
('ex_bw_022', 'Sit-Up', 'sit-up', ARRAY['situp', 'sit up'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], '1. Lie down on the floor placing your feet either under something that will not move or by having a partner hold them. Your legs should be bent at the knees.
2. Place your hands behind your head and lock them together by clasping your fingers. This is the starting position.
3. Elevate your upper body so that it creates an imaginary V-shape with your thighs. Breathe out when performing this part of the exercise.
4. Once you feel the contraction for a second, lower your upper body back down to the starting position while inhaling.
5. Repeat for the recommended amount of repetitions.', 'pull', 'isolation', 'beginner', NOW(), NOW()),
('ex_bw_023', 'Crunch', 'crunch', ARRAY['crunches', 'abdominal crunch'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], '1. Lie flat on your back with your feet flat on the ground, or resting on a bench with your knees bent at a 90 degree angle. If you are resting your feet on a bench, place them three to four inches apart and point your toes inward so they touch.
2. Now place your hands lightly on either side of your head keeping your elbows in. Tip: Don''t lock your fingers behind your head.
3. While pushing the small of your back down in the floor to better isolate your abdominal muscles, begin to roll your shoulders off the floor.
4. Continue to push down as hard as you can with your lower back as you contract your abdominals and exhale. Your shoulders should come up off the floor only about four inches, and your lower back should remain on the floor. At the top of the movement, contract your abdominals hard and keep the contraction for a second. Tip: Focus on slow, controlled movement - don''t cheat yourself by using momentum.
5. After the one second contraction, begin to come down slowly again to the starting position as you inhale.
6. Repeat for the recommended amount of repetitions.', 'pull', 'isolation', 'beginner', NOW(), NOW()),
('ex_bw_024', 'Bicycle Crunch', 'bicycle crunch', ARRAY['bicycle crunches', 'bicycle'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs', 'obliques'], ARRAY[]::text[], '1. Kneel below a high pulley that contains a rope attachment.
2. Grasp cable rope attachment and lower the rope until your hands are placed next to your face.
3. Flex your hips slightly and allow the weight to hyperextend the lower back. This will be your starting position.
4. With the hips stationary, flex the waist as you contract the abs so that the elbows travel towards the middle of the thighs. Exhale as you perform this portion of the movement and hold the contraction for a second.
5. Slowly return to the starting position as you inhale. Tip: Make sure that you keep constant tension on the abs throughout the movement. Also, do not choose a weight so heavy that the lower back handles the brunt of the work.
6. Repeat for the recommended amount of repetitions.', 'pull', 'isolation', 'beginner', NOW(), NOW()),
('ex_bw_025', 'Russian Twist', 'russian twist', ARRAY['russian twists'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['obliques', 'abs'], ARRAY[]::text[], '1. Lie down on the floor placing your feet either under something that will not move or by having a partner hold them. Your legs should be bent at the knees.
2. Elevate your upper body so that it creates an imaginary V-shape with your thighs. Your arms should be fully extended in front of you perpendicular to your torso and with the hands clasped. This is the starting position.
3. Twist your torso to the right side until your arms are parallel with the floor while breathing out.
4. Hold the contraction for a second and move back to the starting position while breathing out. Now move to the opposite side performing the same techniques you applied to the right side.
5. Repeat for the recommended amount of repetitions.', 'pull', 'compound', 'intermediate', NOW(), NOW()),
('ex_bw_026', 'Leg Raise', 'leg raise', ARRAY['leg raises', 'lying leg raise'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], '1. Hang from a chin-up bar with both arms extended at arms length in top of you using either a wide grip or a medium grip. The legs should be straight down with the pelvis rolled slightly backwards. This will be your starting position.
2. Raise your legs until the torso makes a 90-degree angle with the legs. Exhale as you perform this movement and hold the contraction for a second or so.
3. Go back slowly to the starting position as you breathe in.
4. Repeat for the recommended amount of repetitions.', 'pull', 'isolation', 'expert', NOW(), NOW()),
('ex_bw_027', 'Hanging Leg Raise', 'hanging leg raise', ARRAY['hanging leg raises', 'hanging knee raise'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['abs'], ARRAY['forearms', 'lats'], '1. Hang from a chin-up bar with both arms extended at arms length in top of you using either a wide grip or a medium grip. The legs should be straight down with the pelvis rolled slightly backwards. This will be your starting position.
2. Raise your legs until the torso makes a 90-degree angle with the legs. Exhale as you perform this movement and hold the contraction for a second or so.
3. Go back slowly to the starting position as you breathe in.
4. Repeat for the recommended amount of repetitions.', 'pull', 'isolation', 'expert', NOW(), NOW()),
('ex_bw_028', 'Mountain Climber', 'mountain climber', ARRAY['mountain climbers'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY['front-delts'], '1. Begin in a pushup position, with your weight supported by your hands and toes. Flexing the knee and hip, bring one leg until the knee is approximately under the hip. This will be your starting position.
2. Explosively reverse the positions of your legs, extending the bent leg until the leg is straight and supported by the toe, and bringing the other foot up with the hip and knee flexed. Repeat in an alternating fashion for 20-30 seconds.', 'pull', 'compound', 'beginner', NOW(), NOW()),
('ex_bw_029', 'Hollow Body Hold', 'hollow body hold', ARRAY['hollow hold', 'hollow body'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], null, null, null, null, NOW(), NOW()),
('ex_bw_030', 'V-Up', 'v-up', ARRAY['v up', 'vup', 'jackknife'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], null, null, null, null, NOW(), NOW()),

-- Plank variations
('ex_bw_031', 'Side Plank', 'side plank', ARRAY['side planks'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['obliques'], ARRAY['front-delts'], null, null, null, null, NOW(), NOW()),
('ex_bw_032', 'Plank to Push-Up', 'plank to push-up', ARRAY['up down plank', 'plank up down'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs', 'triceps'], ARRAY['front-delts', 'chest'], null, null, null, null, NOW(), NOW()),
('ex_bw_033', 'Plank Shoulder Tap', 'plank shoulder tap', ARRAY['shoulder taps', 'plank taps'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY['obliques'], null, null, null, null, NOW(), NOW()),

-- Dip variations
('ex_bw_034', 'Tricep Dip', 'tricep dip', ARRAY['triceps dip', 'bench dip'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dip_bars'], ARRAY['triceps'], ARRAY['rear-delts'], '1. For this exercise you will need to place a bench behind your back. With the bench perpendicular to your body, and while looking away from it, hold on to the bench on its edge with the hands fully extended, separated at shoulder width. The legs will be extended forward, bent at the waist and perpendicular to your torso. This will be your starting position.
2. Slowly lower your body as you inhale by bending at the elbows until you lower yourself far enough to where there is an angle slightly smaller than 90 degrees between the upper arm and the forearm. Tip: Keep the elbows as close as possible throughout the movement. Forearms should always be pointing down.
3. Using your triceps to bring your torso up again, lift yourself back to the starting position.
4. Repeat for the recommended amount of repetitions.', 'push', 'compound', 'beginner', NOW(), NOW()),
('ex_bw_035', 'Chest Dip', 'chest dip', ARRAY['chest dips'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dip_bars'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], '1. For this exercise you will need access to parallel bars. To get yourself into the starting position, hold your body at arms length (arms locked) above the bars.
2. While breathing in, lower yourself slowly with your torso leaning forward around 30 degrees or so and your elbows flared out slightly until you feel a slight stretch in the chest.
3. Once you feel the stretch, use your chest to bring your body back to the starting position as you breathe out. Tip: Remember to squeeze the chest at the top of the movement for a second.
4. Repeat the movement for the prescribed amount of repetitions.', 'push', 'compound', 'intermediate', NOW(), NOW()),

-- Bodyweight back exercises
('ex_bw_036', 'Inverted Row', 'inverted row', ARRAY['bodyweight row', 'australian pullup', 'horizontal pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], '1. Position a bar in a rack to about waist height. You can also use a smith machine.
2. Take a wider than shoulder width grip on the bar and position yourself hanging underneath the bar. Your body should be straight with your heels on the ground with your arms fully extended. This will be your starting position.
3. Begin by flexing the elbow, pulling your chest towards the bar. Retract your shoulder blades as you perform the movement.
4. Pause at the top of the motion, and return yourself to the start position.
5. Repeat for the desired number of repetitions.', 'pull', 'compound', 'beginner', NOW(), NOW()),
('ex_bw_037', 'Superman', 'superman', ARRAY['superman exercise', 'back extension'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['lower-back', 'glutes'], ARRAY['hamstrings'], '1. To begin, lie straight and face down on the floor or exercise mat. Your arms should be fully extended in front of you. This is the starting position.
2. Simultaneously raise your arms, legs, and chest off of the floor and hold this contraction for 2 seconds. Tip: Squeeze your lower back to get the best results from this exercise. Remember to exhale during this movement. Note: When holding the contracted position, you should look like superman when he is flying.
3. Slowly begin to lower your arms, legs and chest back down to the starting position while inhaling.
4. Repeat for the recommended amount of repetitions prescribed in your program.', 'static', 'compound', 'beginner', NOW(), NOW()),

-- Glute/hamstring exercises
('ex_bw_038', 'Glute Bridge', 'glute bridge', ARRAY['hip bridge', 'bridge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['glutes', 'hamstrings'], ARRAY['lower-back'], '1. Begin seated on the ground with a loaded barbell over your legs. Using a fat bar or having a pad on the bar can greatly reduce the discomfort caused by this exercise. Roll the bar so that it is directly above your hips, and lay down flat on the floor.
2. Begin the movement by driving through with your heels, extending your hips vertically through the bar. Your weight should be supported by your upper back and the heels of your feet.
3. Extend as far as possible, then reverse the motion to return to the starting position.', 'push', 'compound', 'intermediate', NOW(), NOW()),
('ex_bw_039', 'Single Leg Glute Bridge', 'single leg glute bridge', ARRAY['one leg bridge', 'single leg bridge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['glutes', 'hamstrings'], ARRAY[]::text[], '1. Lay on the floor with your feet flat and knees bent.
2. Raise one leg off of the ground, pulling the knee to your chest. This will be your starting position.
3. Execute the movement by driving through the heel, extending your hip upward and raising your glutes off of the ground.
4. Extend as far as possible, pause and then return to the starting position.', 'push', 'isolation', 'beginner', NOW(), NOW()),
('ex_bw_040', 'Nordic Curl', 'nordic curl', ARRAY['nordic hamstring curl', 'natural leg curl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['hamstrings'], ARRAY['glutes'], '1. Begin on the floor laying on your back with your feet on top of the ball.
2. Position the ball so that when your legs are extended your ankles are on top of the ball. This will be your starting position.
3. Raise your hips off of the ground, keeping your weight on the shoulder blades and your feet.
4. Flex the knees, pulling the ball as close to you as you can, contracting the hamstrings.
5. After a brief pause, return to the starting position.', 'pull', 'isolation', 'beginner', NOW(), NOW()),

-- Calisthenics
('ex_bw_041', 'Burpee', 'burpee', ARRAY['burpees'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['chest', 'quads'], ARRAY['front-delts', 'triceps'], null, null, null, null, NOW(), NOW()),
('ex_bw_042', 'Handstand Push-Up', 'handstand push-up', ARRAY['handstand pushup', 'hspu', 'vertical pushup'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['front-delts', 'triceps'], ARRAY['chest'], '1. With your back to the wall bend at the waist and place both hands on the floor at shoulder width.
2. Kick yourself up against the wall with your arms straight. Your body should be upside down with the arms and legs fully extended. Keep your whole body as straight as possible. Tip: If doing this for the first time, have a spotter help you. Also, make sure that you keep facing the wall with your head, rather than looking down.
3. Slowly lower yourself to the ground as you inhale until your head almost touches the floor. Tip: It is of utmost importance that you come down slow in order to avoid head injury.
4. Push yourself back up slowly as you exhale until your elbows are nearly locked.
5. Repeat for the recommended amount of repetitions.', 'push', 'compound', 'expert', NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
