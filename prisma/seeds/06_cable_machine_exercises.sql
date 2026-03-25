-- Cable and Machine Exercises Seed File
-- Run this in Supabase SQL Editor
-- System exercises for cable and machine-based training

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
-- Cable chest exercises
('ex_cm_001', 'Cable Chest Fly', 'cable chest fly', ARRAY['cable fly', 'cable flys'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['chest'], ARRAY['front-delts'], null, NOW(), NOW()),
('ex_cm_002', 'Cable Crossover', 'cable crossover', ARRAY['cable crossovers', 'high cable fly'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['chest'], ARRAY['front-delts'], '1. To get yourself into the starting position, place the pulleys on a high position (above your head), select the resistance to be used and hold the pulleys in each hand.
2. Step forward in front of an imaginary straight line between both pulleys while pulling your arms together in front of you. Your torso should have a small forward bend from the waist. This will be your starting position.
3. With a slight bend on your elbows in order to prevent stress at the biceps tendon, extend your arms to the side (straight out at both sides) in a wide arc until you feel a stretch on your chest. Breathe in as you perform this portion of the movement. Tip: Keep in mind that throughout the movement, the arms and torso should remain stationary; the movement should only occur at the shoulder joint.
4. Return your arms back to the starting position as you breathe out. Make sure to use the same arc of motion used to lower the weights.
5. Hold for a second at the starting position and repeat the movement for the prescribed amount of repetitions.', NOW(), NOW()),
('ex_cm_003', 'Low to High Cable Fly', 'low to high cable fly', ARRAY['low cable fly', 'upward cable fly'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['chest'], ARRAY['front-delts'], '1. To move into the starting position, place the pulleys at the low position, select the resistance to be used and grasp a handle in each hand.
2. Step forward, gaining tension in the pulleys. Your palms should be facing forward, hands below the waist, and your arms straight. This will be your starting position.
3. With a slight bend in your arms, draw your hands upward and toward the midline of your body. Your hands should come together in front of your chest, palms facing up.
4. Return your arms back to the starting position after a brief pause.', NOW(), NOW()),
('ex_cm_004', 'Cable Chest Press', 'cable chest press', ARRAY['standing cable press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], '1. Adjust the weight to an appropriate amount and be seated, grasping the handles. Your upper arms should be about 45 degrees to the body, with your head and chest up. The elbows should be bent to about 90 degrees. This will be your starting position.
2. Begin by extending through the elbow, pressing the handles together straight in front of you. Keep your shoulder blades retracted as you execute the movement.
3. After pausing at full extension, return to th starting position, keeping tension on the cables.
4. You can also execute this movement with your back off the pad, at an incline or decline, or alternate hands.', NOW(), NOW()),

-- Cable back exercises
('ex_cm_005', 'Lat Pulldown', 'lat pulldown', ARRAY['wide grip pulldown', 'lat pull down'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['lats'], ARRAY['biceps', 'mid-back'], '1. Sit down on a pull-down machine with a wide bar attached to the top pulley. Make sure that you adjust the knee pad of the machine to fit your height. These pads will prevent your body from being raised by the resistance attached to the bar.
2. Grab the bar with the palms facing forward using the prescribed grip. Note on grips: For a wide grip, your hands need to be spaced out at a distance wider than shoulder width. For a medium grip, your hands need to be spaced out at a distance equal to your shoulder width and for a close grip at a distance smaller than your shoulder width.
3. As you have both arms extended in front of you holding the bar at the chosen grip width, bring your torso back around 30 degrees or so while creating a curvature on your lower back and sticking your chest out. This is your starting position.
4. As you breathe out, bring the bar down until it touches your upper chest by drawing the shoulders and the upper arms down and back. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary and only the arms should move. The forearms should do no other work except for holding the bar; therefore do not try to pull down the bar using the forearms.
5. After a second at the contracted position squeezing your shoulder blades together, slowly raise the bar back to the starting position when your arms are fully extended and the lats are fully stretched. Inhale during this portion of the movement.
6. Repeat this motion for the prescribed amount of repetitions.', NOW(), NOW()),
('ex_cm_006', 'Close Grip Lat Pulldown', 'close grip lat pulldown', ARRAY['close grip pulldown', 'narrow grip pulldown'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['lats', 'mid-back'], ARRAY['biceps'], '1. Sit down on a pull-down machine with a wide bar attached to the top pulley. Make sure that you adjust the knee pad of the machine to fit your height. These pads will prevent your body from being raised by the resistance attached to the bar.
2. Grab the bar with the palms facing forward using the prescribed grip. Note on grips: For a wide grip, your hands need to be spaced out at a distance wider than your shoulder width. For a medium grip, your hands need to be spaced out at a distance equal to your shoulder width and for a close grip at a distance smaller than your shoulder width.
3. As you have both arms extended in front of you - while holding the bar at the chosen grip width - bring your torso back around 30 degrees or so while creating a curvature on your lower back and sticking your chest out. This is your starting position.
4. As you breathe out, bring the bar down until it touches your upper chest by drawing the shoulders and the upper arms down and back. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary (only the arms should move). The forearms should do no other work except for holding the bar; therefore do not try to pull the bar down using the forearms.
5. After a second in the contracted position, while squeezing your shoulder blades together, slowly raise the bar back to the starting position when your arms are fully extended and the lats are fully stretched. Inhale during this portion of the movement.
6. 6. Repeat this motion for the prescribed amount of repetitions.', NOW(), NOW()),
('ex_cm_007', 'Reverse Grip Lat Pulldown', 'reverse grip lat pulldown', ARRAY['underhand pulldown', 'supinated pulldown'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['lats', 'biceps'], ARRAY['mid-back'], null, NOW(), NOW()),
('ex_cm_008', 'Straight Arm Pulldown', 'straight arm pulldown', ARRAY['straight arm lat pulldown', 'stiff arm pulldown'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['lats'], ARRAY['triceps', 'front-delts'], '1. You will start by grabbing the wide bar from the top pulley of a pulldown machine and using a wider than shoulder-width pronated (palms down) grip. Step backwards two feet or so.
2. Bend your torso forward at the waist by around 30-degrees with your arms fully extended in front of you and a slight bend at the elbows. If your arms are not fully extended then you need to step a bit more backwards until they are. Once your arms are fully extended and your torso is slightly bent at the waist, tighten the lats and then you are ready to begin.
3. While keeping the arms straight, pull the bar down by contracting the lats until your hands are next to the side of the thighs. Breathe out as you perform this step.
4. While keeping the arms straight, go back to the starting position while breathing in.
5. Repeat for the recommended amount of repetitions.', NOW(), NOW()),
('ex_cm_009', 'Seated Cable Row', 'seated cable row', ARRAY['cable row', 'seated row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], '1. For this exercise you will need access to a low pulley row machine with a V-bar. Note: The V-bar will enable you to have a neutral grip where the palms of your hands face each other. To get into the starting position, first sit down on the machine and place your feet on the front platform or crossbar provided making sure that your knees are slightly bent and not locked.
2. Lean over as you keep the natural alignment of your back and grab the V-bar handles.
3. With your arms extended pull back until your torso is at a 90-degree angle from your legs. Your back should be slightly arched and your chest should be sticking out. You should be feeling a nice stretch on your lats as you hold the bar in front of you. This is the starting position of the exercise.
4. Keeping the torso stationary, pull the handles back towards your torso while keeping the arms close to it until you touch the abdominals. Breathe out as you perform that movement. At that point you should be squeezing your back muscles hard. Hold that contraction for a second and slowly go back to the original position while breathing in.
5. Repeat for the recommended amount of repetitions.', NOW(), NOW()),
('ex_cm_010', 'Single Arm Cable Row', 'single arm cable row', ARRAY['one arm cable row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], '1. Begin by moving the pulleys to the high position, select the resistance to be used, and take a handle in each hand.
2. Step forward in front of both pulleys with your arms extended in front of you, bringing your hands together. Your head and chest should be up as you lean forward, while your feet should be staggered. This will be your starting position.
3. Keeping your left arm in place, allow your right arm to extend out to the side, maintaining a slight bend at the elbow. The right arm should be perpendicular to the body at approximately shoulder level.
4. Return your arm back to the starting position by pulling your hand back to the midline of the body.
5. Hold for a second at the starting position and repeat the movement on the opposite side. Continue alternating back and forth for the prescribed number of repetitions.', NOW(), NOW()),

-- Cable shoulder exercises
('ex_cm_011', 'Cable Lateral Raise', 'cable lateral raise', ARRAY['cable side raise'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['side-delts'], ARRAY['traps'], '1. Stand in the middle of two low pulleys that are opposite to each other and place a flat bench right behind you (in perpendicular fashion to you; the narrow edge of the bench should be the one behind you). Select the weight to be used on each pulley.
2. Now sit at the edge of the flat bench behind you with your feet placed in front of your knees.
3. Bend forward while keeping your back flat and rest your torso on the thighs.
4. Have someone give you the single handles attached to the pulleys. Grasp the left pulley with the right hand and the right pulley with the left after you select your weight. The pulleys should run under your knees and your arms will be extended with palms facing each other and a slight bend at the elbows. This will be the starting position.
5. While keeping the arms stationary, raise the upper arms to the sides until they are parallel to the floor and at shoulder height. Exhale during the execution of this movement and hold the contraction for a second.
6. Slowly lower your arms to the starting position as you inhale.
7. Repeat for the recommended amount of repetitions. Tip: Maintain upper arms perpendicular to torso and a fixed elbow position (10 degree to 30 degree angle) throughout exercise.', NOW(), NOW()),
('ex_cm_012', 'Cable Front Raise', 'cable front raise', ARRAY['cable front raises'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['front-delts'], ARRAY['chest'], '1. Select the weight on a low pulley machine and grasp the single hand cable attachment that is attached to the low pulley with your left hand.
2. Face away from the pulley and put your arm straight down with the hand cable attachment in front of your thighs at arms'' length with the palms of the hand facing your thighs. This will be your starting position.
3. While maintaining the torso stationary (no swinging), lift the left arm to the front with a slight bend on the elbow and the palms of the hand always faces down. Continue to go up until you arm is slightly above parallel to the floor. Exhale as you execute this portion of the movement and pause for a second at the top.
4. Now as you inhale lower the arm back down slowly to the starting position.
5. Once all of the recommended amount of repetitions have been performed for this arm, switch arms and perform the exercise with the right one.', NOW(), NOW()),
('ex_cm_013', 'Cable Reverse Fly', 'cable reverse fly', ARRAY['cable rear delt fly', 'bent over cable fly'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['rear-delts'], ARRAY['mid-back', 'traps'], '1. Adjust the pulleys to the appropriate height and adjust the weight. The pulleys should be above your head.
2. Grab the left pulley with your right hand and the right pulley with your left hand, crossing them in front of you. This will be your starting position.
3. Initiate the movement by moving your arms back and outward, keeping your arms straight as you execute the movement.
4. Pause at the end of the motion before returning the handles to the start position.', NOW(), NOW()),
('ex_cm_014', 'Cable Face Pull', 'cable face pull', ARRAY['face pulls', 'rope face pull'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['rear-delts', 'mid-back'], ARRAY['traps'], '1. Facing a high pulley with a rope or dual handles attached, pull the weight directly towards your face, separating your hands as you do so. Keep your upper arms parallel to the ground.', NOW(), NOW()),
('ex_cm_015', 'Cable Upright Row', 'cable upright row', ARRAY['cable upright rows'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['side-delts', 'traps'], ARRAY['biceps'], '1. Grasp a straight bar cable attachment that is attached to a low pulley with a pronated (palms facing your thighs) grip that is slightly less than shoulder width. The bar should be resting on top of your thighs. Your arms should be extended with a slight bend at the elbows and your back should be straight. This will be your starting position.
2. Use your side shoulders to lift the cable bar as you exhale. The bar should be close to the body as you move it up. Continue to lift it until it nearly touches your chin. Tip: Your elbows should drive the motion. As you lift the bar, your elbows should always be higher than your forearms. Also, keep your torso stationary and pause for a second at the top of the movement.
3. Lower the bar back down slowly to the starting position. Inhale as you perform this portion of the movement.
4. Repeat for the recommended amount of repetitions.', NOW(), NOW()),

-- Cable arm exercises
('ex_cm_016', 'Cable Bicep Curl', 'cable bicep curl', ARRAY['cable curl', 'cable curls'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['biceps'], ARRAY['forearms'], null, NOW(), NOW()),
('ex_cm_017', 'Cable Hammer Curl', 'cable hammer curl', ARRAY['rope hammer curl', 'cable rope curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['biceps'], ARRAY['forearms'], '1. Start out by placing a flat bench in front of a low pulley cable that has a straight bar attachment.
2. Use your arms to grab the cable bar with a narrow to shoulder width supinated grip (palms up) and bring them up so that your forearms are resting against the top of your thighs. Your wrists should be hanging just beyond your knees.
3. Start out by curling your wrist upwards and exhaling. Keep the contraction for a second.
4. Slowly lower your wrists back down to the starting position while inhaling.
5. Your forearms should be stationary as your wrist is the only movement needed to perform this exercise.
6. Repeat for the recommended amount of repetitions.', NOW(), NOW()),
('ex_cm_018', 'Cable Tricep Pushdown', 'cable tricep pushdown', ARRAY['tricep pushdown', 'cable pushdown', 'rope pushdown'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['triceps'], ARRAY[]::text[], '1. Attach a straight or angled bar to a high pulley and grab with an overhand grip (palms facing down) at shoulder width.
2. Standing upright with the torso straight and a very small inclination forward, bring the upper arms close to your body and perpendicular to the floor. The forearms should be pointing up towards the pulley as they hold the bar. This is your starting position.
3. Using the triceps, bring the bar down until it touches the front of your thighs and the arms are fully extended perpendicular to the floor. The upper arms should always remain stationary next to your torso and only the forearms should move. Exhale as you perform this movement.
4. After a second hold at the contracted position, bring the bar slowly up to the starting point. Breathe in as you perform this step.
5. Repeat for the recommended amount of repetitions.', NOW(), NOW()),
('ex_cm_019', 'Cable Overhead Tricep Extension', 'cable overhead tricep extension', ARRAY['cable overhead extension', 'rope overhead extension'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['triceps'], ARRAY[]::text[], '1. Attach a rope to the bottom pulley of the pulley machine.
2. Grasping the rope with both hands, extend your arms with your hands directly above your head using a neutral grip (palms facing each other). Your elbows should be in close to your head and the arms should be perpendicular to the floor with the knuckles aimed at the ceiling. This will be your starting position.
3. Slowly lower the rope behind your head as you hold the upper arms stationary. Inhale as you perform this movement and pause when your triceps are fully stretched.
4. Return to the starting position by flexing your triceps as you breathe out.
5. Repeat for the recommended amount of repetitions.', NOW(), NOW()),
('ex_cm_020', 'Cable Tricep Kickback', 'cable tricep kickback', ARRAY['cable kickback'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['triceps'], ARRAY[]::text[], null, NOW(), NOW()),

-- Cable leg exercises
('ex_cm_021', 'Cable Pull Through', 'cable pull through', ARRAY['cable pullthrough'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['glutes', 'hamstrings'], ARRAY['lower-back'], '1. Begin standing a few feet in front of a low pulley with a rope or handle attached. Face away from the machine, straddling the cable, with your feet set wide apart.
2. Begin the movement by reaching through your legs as far as possible, bending at the hips. Keep your knees slightly bent. Keeping your arms straight, extend through the hip to stand straight up. Avoid pulling upward through the shoulders; all of the motion should originate through the hips.', NOW(), NOW()),
('ex_cm_022', 'Cable Kickback', 'cable kickback', ARRAY['glute kickback', 'cable glute kickback'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['glutes'], ARRAY['hamstrings'], '1. Kneel on the floor or an exercise mat and bend at the waist with your arms extended in front of you (perpendicular to the torso) in order to get into a kneeling push-up position but with the arms spaced at shoulder width. Your head should be looking forward and the bend of the knees should create a 90-degree angle between the hamstrings and the calves. This will be your starting position.
2. As you exhale, lift up your right leg until the hamstrings are in line with the back while maintaining the 90-degree angle bend. Contract the glutes throughout this movement and hold the contraction at the top for a second. Tip: At the end of the movement the upper leg should be parallel to the floor while the calf should be perpendicular to it.
3. Go back to the initial position as you inhale and now repeat with the left leg.
4. Continue to alternate legs until all of the recommended repetitions have been performed.', NOW(), NOW()),
('ex_cm_023', 'Cable Hip Abduction', 'cable hip abduction', ARRAY['cable leg abduction', 'standing cable abduction'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['glutes'], ARRAY[]::text[], null, NOW(), NOW()),
('ex_cm_024', 'Cable Hip Adduction', 'cable hip adduction', ARRAY['cable leg adduction', 'standing cable adduction'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['adductors'], ARRAY[]::text[], '1. Stand in front of a low pulley facing forward with one leg next to the pulley and the other one away.
2. Attach the ankle cuff to the cable and also to the ankle of the leg that is next to the pulley.
3. Now step out and away from the stack with a wide stance and grasp the bar of the pulley system.
4. Stand on the foot that does not have the ankle cuff (the far foot) and allow the leg with the cuff to be pulled towards the low pulley. This will be your starting position.
5. Now perform the movement by moving the leg with the ankle cuff in front of the far leg by using the inner thighs to abduct the hip. Breathe out during this portion of the movement.
6. Slowly return to the starting position as you breathe in.
7. Repeat for the recommended amount of repetitions and then repeat the same movement with the opposite leg.', NOW(), NOW()),

-- Cable core exercises
('ex_cm_025', 'Cable Crunch', 'cable crunch', ARRAY['rope crunch', 'kneeling cable crunch'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['abs'], ARRAY[]::text[], '1. Kneel below a high pulley that contains a rope attachment.
2. Grasp cable rope attachment and lower the rope until your hands are placed next to your face.
3. Flex your hips slightly and allow the weight to hyperextend the lower back. This will be your starting position.
4. With the hips stationary, flex the waist as you contract the abs so that the elbows travel towards the middle of the thighs. Exhale as you perform this portion of the movement and hold the contraction for a second.
5. Slowly return to the starting position as you inhale. Tip: Make sure that you keep constant tension on the abs throughout the movement. Also, do not choose a weight so heavy that the lower back handles the brunt of the work.
6. Repeat for the recommended amount of repetitions.', NOW(), NOW()),
('ex_cm_026', 'Cable Woodchop', 'cable woodchop', ARRAY['wood chop', 'cable wood chop'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['obliques'], ARRAY['front-delts'], '1. Connect a standard handle to a tower, and move the cable to the highest pulley position.
2. With your side to the cable, grab the handle with one hand and step away from the tower. You should be approximately arm''s length away from the pulley, with the tension of the weight on the cable. Your outstretched arm should be aligned with the cable.
3. With your feet positioned shoulder width apart, reach upward with your other hand and grab the handle with both hands. Your arms should still be fully extended.
4. In one motion, pull the handle down and across your body to your front knee while rotating your torso.
5. Keep your back and arms straight and core tight while you pivot your back foot and bend your knees to get a full range of motion.
6. Maintain your stance and straight arms. Return to the neutral position in a slow and controlled manner.
7. Repeat to failure.
8. Then, reposition and repeat the same series of movements on the opposite side.', NOW(), NOW()),
('ex_cm_027', 'Cable Pallof Press', 'cable pallof press', ARRAY['pallof press'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['abs', 'obliques'], ARRAY['front-delts'], '1. Connect a standard handle to a tower, and—if possible—position the cable to shoulder height. If not, a low pulley will suffice.
2. With your side to the cable, grab the handle with both hands and step away from the tower. You should be approximately arm''s length away from the pulley, with the tension of the weight on the cable.
3. With your feet positioned hip-width apart and knees slightly bent, hold the cable to the middle of your chest. This will be your starting position.
4. Press the cable away from your chest, fully extending both arms. You core should be tight and engaged.
5. Hold the repetition for several seconds before returning to the starting position.
6. At the conclusion of the set, repeat facing the other direction.', NOW(), NOW()),
('ex_cm_028', 'Cable Russian Twist', 'cable russian twist', ARRAY['standing cable twist'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable machine'], ARRAY['obliques', 'abs'], ARRAY[]::text[], '1. Connect a standard handle attachment, and position the cable to a middle pulley position.
2. Lie on a stability ball perpendicular to the cable and grab the handle with one hand. You should be approximately arm''s length away from the pulley, with the tension of the weight on the cable.
3. Grab the handle with both hands and fully extend your arms above your chest. You hands should be directly in-line with the pulley. If not, adjust the pulley up or down until they are.
4. Keep your hips elevated and abs engaged. Rotate your torso away from the pulley for a full-quarter rotation. Your body should be flat from head to knees.
5. Pause for a moment and in a slow and controlled manner reset to the starting position. You should still have side tension on the cable in the resting position.
6. Repeat the same movement to failure.
7. Then, reposition and repeat the same series of movements on the opposite side.', NOW(), NOW()),

-- Machine-specific exercises
('ex_cm_029', 'Smith Machine Bench Press', 'smith machine bench press', ARRAY['smith bench', 'smith bench press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['smith machine', 'bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], '1. Place a flat bench underneath the smith machine. Now place the barbell at a height that you can reach when lying down and your arms are almost fully extended. Once the weight you need is selected, lie down on the flat bench. Using a pronated grip that is wider than shoulder width, unlock the bar from the rack and hold it straight over you with your arms locked. This will be your starting position.
2. As you breathe in, come down slowly until you feel the bar on your middle chest.
3. After a second pause, bring the bar back to the starting position as you breathe out and push the bar using your chest muscles. Lock your arms in the contracted position, hold for a second and then start coming down slowly again. Tip: It should take at least twice as long to go down than to come up.
4. Repeat the movement for the prescribed amount of repetitions.
5. When you are done, lock the bar back in the rack.', NOW(), NOW()),
('ex_cm_030', 'Smith Machine Squat', 'smith machine squat', ARRAY['smith squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['smith machine'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], '1. To begin, first set the bar on the height that best matches your height. Once the correct height is chosen and the bar is loaded, step under the bar and place the back of your shoulders (slightly below the neck) across it.
2. Hold on to the bar using both arms at each side (palms facing forward), unlock it and lift it off the rack by first pushing with your legs and at the same time straightening your torso.
3. Position your legs using a shoulder width medium stance with the toes slightly pointed out. Keep your head up at all times and also maintain a straight back. This will be your starting position. (Note: For the purposes of this discussion we will use the medium stance which targets overall development; however you can choose any of the three stances discussed in the foot stances section).
4. Begin to slowly lower the bar by bending the knees as you maintain a straight posture with the head up. Continue down until the angle between the upper leg and the calves becomes slightly less than 90-degrees (which is the point in which the upper legs are below parallel to the floor). Inhale as you perform this portion of the movement. Tip: If you performed the exercise correctly, the front of the knees should make an imaginary straight line with the toes that is perpendicular to the front. If your knees are past that imaginary line (if they are past your toes) then you are placing undue stress on the knee and the exercise has been performed incorrectly.
5. Begin to raise the bar as you exhale by pushing the floor with the heel of your foot as you straighten the legs again and go back to the starting position.
6. Repeat for the recommended amount of repetitions.', NOW(), NOW()),
('ex_cm_031', 'Pec Deck Fly', 'pec deck fly', ARRAY['pec deck', 'machine fly', 'chest fly machine'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pec deck machine'], ARRAY['chest'], ARRAY['front-delts'], null, NOW(), NOW()),
('ex_cm_032', 'Machine Chest Press', 'machine chest press', ARRAY['chest press machine'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['chest press machine'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], '1. Adjust the weight to an appropriate amount and be seated, grasping the handles. Your upper arms should be about 45 degrees to the body, with your head and chest up. The elbows should be bent to about 90 degrees. This will be your starting position.
2. Begin by extending through the elbow, pressing the handles together straight in front of you. Keep your shoulder blades retracted as you execute the movement.
3. After pausing at full extension, return to th starting position, keeping tension on the cables.
4. You can also execute this movement with your back off the pad, at an incline or decline, or alternate hands.', NOW(), NOW()),
('ex_cm_033', 'Machine Shoulder Press', 'machine shoulder press', ARRAY['shoulder press machine'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['shoulder press machine'], ARRAY['front-delts', 'triceps'], ARRAY['side-delts'], '1. Sit down on the Shoulder Press Machine and select the weight.
2. Grab the handles to your sides as you keep the elbows bent and in line with your torso. This will be your starting position.
3. Now lift the handles as you exhale and you extend the arms fully. At the top of the position make sure that you hold the contraction for a second.
4. Lower the handles slowly back to the starting position as you inhale.
5. Repeat for the recommended amount of repetitions.', NOW(), NOW()),
('ex_cm_034', 'Hack Squat', 'hack squat', ARRAY['hack squat machine'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['hack squat machine'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], null, NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
