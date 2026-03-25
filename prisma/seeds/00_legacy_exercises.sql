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
  instructions,
  force,
  mechanic,
  level,
  "createdAt",
  "updatedAt"
) VALUES
-- Arms (3)
('cmiz7vl1k0009vr0m306fts69', 'Barbell Curl', 'barbell curl', ARRAY['bb curl', 'standing barbell curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['biceps'], ARRAY['forearms'], '1. Stand up with your torso upright while holding a barbell at a shoulder-width grip. The palm of your hands should be facing forward and the elbows should be close to the torso. This will be your starting position.
2. While holding the upper arms stationary, curl the weights forward while contracting the biceps as you breathe out. Tip: Only the forearms should move.
3. Continue the movement until your biceps are fully contracted and the bar is at shoulder level. Hold the contracted position for a second and squeeze the biceps hard.
4. Slowly begin to bring the bar back to starting position as your breathe in.
5. Repeat for the recommended amount of repetitions.', 'pull', 'isolation', 'beginner', NOW(), NOW()),
('cmiz7vnpc000ovr0mcuhs0bum', 'Hammer Curl', 'hammer curl', ARRAY['dumbbell hammer curl', 'db hammer curl'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['biceps'], ARRAY['forearms'], '1. Stand up with your torso upright and a dumbbell on each hand being held at arms length. The elbows should be close to the torso.
2. The palms of the hands should be facing your torso. This will be your starting position.
3. Now, while holding your upper arm stationary, exhale and curl the weight forward while contracting the biceps. Continue to raise the weight until the biceps are fully contracted and the dumbbell is at shoulder level. Hold the contracted position for a brief moment as you squeeze the biceps. Tip: Focus on keeping the elbow stationary and only moving your forearm.
4. After the brief pause, inhale and slowly begin the lower the dumbbells back down to the starting position.
5. Repeat for the recommended amount of repetitions.', 'pull', 'isolation', 'beginner', NOW(), NOW()),
('cmiz7vl76000avr0m27zo6aos', 'Tricep Pushdown', 'tricep pushdown', ARRAY['cable tricep pushdown', 'rope pushdown'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['triceps'], ARRAY[]::text[], '1. Attach a straight or angled bar to a high pulley and grab with an overhand grip (palms facing down) at shoulder width.
2. Standing upright with the torso straight and a very small inclination forward, bring the upper arms close to your body and perpendicular to the floor. The forearms should be pointing up towards the pulley as they hold the bar. This is your starting position.
3. Using the triceps, bring the bar down until it touches the front of your thighs and the arms are fully extended perpendicular to the floor. The upper arms should always remain stationary next to your torso and only the forearms should move. Exhale as you perform this movement.
4. After a second hold at the contracted position, bring the bar slowly up to the starting point. Breathe in as you perform this step.
5. Repeat for the recommended amount of repetitions.', 'push', 'isolation', 'beginner', NOW(), NOW()),

-- Back (5)
('cmiz7vk1i0003vr0mqucd1f52', 'Barbell Row', 'barbell row', ARRAY['bent over barbell row', 'bb row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], '1. Holding a barbell with a pronated grip (palms facing down), bend your knees slightly and bring your torso forward, by bending at the waist, while keeping the back straight until it is almost parallel to the floor. Tip: Make sure that you keep the head up. The barbell should hang directly in front of you as your arms hang perpendicular to the floor and your torso. This is your starting position.
2. Now, while keeping the torso stationary, breathe out and lift the barbell to you. Keep the elbows close to the body and only use the forearms to hold the weight. At the top contracted position, squeeze the back muscles and hold for a brief pause.
3. Then inhale and slowly lower the barbell back to the starting position.
4. Repeat for the recommended amount of repetitions.', 'pull', 'compound', 'beginner', NOW(), NOW()),
('cmiz7vmmg000ivr0mojncaj84', 'Cable Row', 'cable row', ARRAY['seated cable row', 'cable rows'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['lats', 'mid-back'], ARRAY['biceps'], '1. For this exercise you will need access to a low pulley row machine with a V-bar. Note: The V-bar will enable you to have a neutral grip where the palms of your hands face each other. To get into the starting position, first sit down on the machine and place your feet on the front platform or crossbar provided making sure that your knees are slightly bent and not locked.
2. Lean over as you keep the natural alignment of your back and grab the V-bar handles.
3. With your arms extended pull back until your torso is at a 90-degree angle from your legs. Your back should be slightly arched and your chest should be sticking out. You should be feeling a nice stretch on your lats as you hold the bar in front of you. This is the starting position of the exercise.
4. Keeping the torso stationary, pull the handles back towards your torso while keeping the arms close to it until you touch the abdominals. Breathe out as you perform that movement. At that point you should be squeezing your back muscles hard. Hold that contraction for a second and slowly go back to the original position while breathing in.
5. Repeat for the recommended amount of repetitions.', 'pull', 'compound', 'beginner', NOW(), NOW()),
('cmiz7vjvh0002vr0mtcmhiz70', 'Conventional Deadlift', 'conventional deadlift', ARRAY['deadlift', 'barbell deadlift'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['hamstrings', 'glutes', 'lower-back'], ARRAY['traps', 'forearms'], '1. Stand in front of a loaded barbell.
2. While keeping the back as straight as possible, bend your knees, bend forward and grasp the bar using a medium (shoulder width) overhand grip. This will be the starting position of the exercise. Tip: If it is difficult to hold on to the bar with this grip, alternate your grip or use wrist straps.
3. While holding the bar, start the lift by pushing with your legs while simultaneously getting your torso to the upright position as you breathe out. In the upright position, stick your chest out and contract the back by bringing the shoulder blades back. Think of how the soldiers in the military look when they are in standing in attention.
4. Go back to the starting position by bending at the knees while simultaneously leaning the torso forward at the waist while keeping the back straight. When the weights on the bar touch the floor you are back at the starting position and ready to perform another repetition.
5. Perform the amount of repetitions prescribed in the program.', 'pull', 'compound', 'intermediate', NOW(), NOW()),
('cmiz7vmgd000hvr0mkidkt6uu', 'Dumbbell Row', 'dumbbell row', ARRAY['db row', 'one arm dumbbell row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['lats', 'mid-back'], ARRAY['biceps'], '1. Choose a flat bench and place a dumbbell on each side of it.
2. Place the right leg on top of the end of the bench, bend your torso forward from the waist until your upper body is parallel to the floor, and place your right hand on the other end of the bench for support.
3. Use the left hand to pick up the dumbbell on the floor and hold the weight while keeping your lower back straight. The palm of the hand should be facing your torso. This will be your starting position.
4. Pull the resistance straight up to the side of your chest, keeping your upper arm close to your side and keeping the torso stationary. Breathe out as you perform this step. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. Also, make sure that the force is performed with the back muscles and not the arms. Finally, the upper torso should remain stationary and only the arms should move. The forearms should do no other work except for holding the dumbbell; therefore do not try to pull the dumbbell up using the forearms.
5. Lower the resistance straight down to the starting position. Breathe in as you perform this step.
6. Repeat the movement for the specified amount of repetitions.
7. Switch sides and repeat again with the other arm.', 'pull', 'compound', 'beginner', NOW(), NOW()),
('cmiz7vkvr0008vr0m7rv3dapc', 'Pull-Up', 'pull-up', ARRAY['pullup', 'pull up'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'biceps'], ARRAY['mid-back', 'forearms'], '1. Grab the pull-up bar with the palms facing forward using the prescribed grip. Note on grips: For a wide grip, your hands need to be spaced out at a distance wider than your shoulder width. For a medium grip, your hands need to be spaced out at a distance equal to your shoulder width and for a close grip at a distance smaller than your shoulder width.
2. As you have both arms extended in front of you holding the bar at the chosen grip width, bring your torso back around 30 degrees or so while creating a curvature on your lower back and sticking your chest out. This is your starting position.
3. Pull your torso up until the bar touches your upper chest by drawing the shoulders and the upper arms down and back. Exhale as you perform this portion of the movement. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary as it moves through space and only the arms should move. The forearms should do no other work other than hold the bar.
4. After a second on the contracted position, start to inhale and slowly lower your torso back to the starting position when your arms are fully extended and the lats are fully stretched.
5. Repeat this motion for the prescribed amount of repetitions.', 'pull', 'compound', 'beginner', NOW(), NOW()),

-- Chest (4)
('cmiz7vjju0000vr0m4b1o6bec', 'Barbell Bench Press', 'barbell bench press', ARRAY['bench press', 'flat bench', 'bb bench'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell', 'bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], '1. Secure your legs at the end of the decline bench and slowly lay down on the bench.
2. Using a medium width grip (a grip that creates a 90-degree angle in the middle of the movement between the forearms and the upper arms), lift the bar from the rack and hold it straight over you with your arms locked. The arms should be perpendicular to the floor. This will be your starting position. Tip: In order to protect your rotator cuff, it is best if you have a spotter help you lift the barbell off the rack.
3. As you breathe in, come down slowly until you feel the bar on your lower chest.
4. After a second pause, bring the bar back to the starting position as you breathe out and push the bar using your chest muscles. Lock your arms and squeeze your chest in the contracted position, hold for a second and then start coming down slowly again. Tip: It should take at least twice as long to go down than to come up).
5. Repeat the movement for the prescribed amount of repetitions.
6. When you are done, place the bar back in the rack.', 'push', 'compound', 'beginner', NOW(), NOW()),
('cmiz7vmyl000kvr0mmr9a482v', 'Dips', 'dips', ARRAY['parallel bar dips', 'weighted dips'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dip_bars'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], '1. Stand between a set of parallel bars. Place a hand on each bar, and then take a small jump to help you get into the starting position with your arms locked out.
2. Begin by flexing the elbow, lowering your body until your arms break 90 degrees. Avoid swinging, and maintain good posture throughout the descent.
3. Reverse the motion by extending the elbow, pushing yourself back up into the starting position.
4. Repeat for the desired number of repetitions.', 'push', 'compound', 'beginner', NOW(), NOW()),
('cmiz7vkpg0007vr0mpbaneax3', 'Dumbbell Bench Press', 'dumbbell bench press', ARRAY['db bench press', 'flat db bench'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell', 'bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], '1. Lie down on a flat bench with a dumbbell in each hand resting on top of your thighs. The palms of your hands will be facing each other.
2. Then, using your thighs to help raise the dumbbells up, lift the dumbbells one at a time so that you can hold them in front of you at shoulder width.
3. Once at shoulder width, rotate your wrists forward so that the palms of your hands are facing away from you. The dumbbells should be just to the sides of your chest, with your upper arm and forearm creating a 90 degree angle. Be sure to maintain full control of the dumbbells at all times. This will be your starting position.
4. Then, as you breathe out, use your chest to push the dumbbells up. Lock your arms at the top of the lift and squeeze your chest, hold for a second and then begin coming down slowly. Tip: Ideally, lowering the weight should take about twice as long as raising it.
5. Repeat the movement for the prescribed amount of repetitions of your training program.', 'push', 'compound', 'beginner', NOW(), NOW()),
('cmiz7vkji0006vr0mrxfixnvy', 'Incline Barbell Bench Press', 'incline barbell bench press', ARRAY['incline bench press', 'incline bb bench'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell', 'bench'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], '1. Secure your legs at the end of the decline bench and slowly lay down on the bench.
2. Using a medium width grip (a grip that creates a 90-degree angle in the middle of the movement between the forearms and the upper arms), lift the bar from the rack and hold it straight over you with your arms locked. The arms should be perpendicular to the floor. This will be your starting position. Tip: In order to protect your rotator cuff, it is best if you have a spotter help you lift the barbell off the rack.
3. As you breathe in, come down slowly until you feel the bar on your lower chest.
4. After a second pause, bring the bar back to the starting position as you breathe out and push the bar using your chest muscles. Lock your arms and squeeze your chest in the contracted position, hold for a second and then start coming down slowly again. Tip: It should take at least twice as long to go down than to come up).
5. Repeat the movement for the prescribed amount of repetitions.
6. When you are done, place the bar back in the rack.', 'push', 'compound', 'beginner', NOW(), NOW()),

-- Core (1)
('cmiz7vnjj000nvr0mgfa1vmx1', 'Plank', 'plank', ARRAY['front plank', 'elbow plank'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['abs'], ARRAY[]::text[], '1. Get into a prone position on the floor, supporting your weight on your toes and your forearms. Your arms are bent and directly below the shoulder.
2. Keep your body straight at all times, and hold this position as long as possible. To increase difficulty, an arm or leg can be raised.', 'static', 'isolation', 'beginner', NOW(), NOW()),

-- Legs (9)
('cmiz7vjpo0001vr0msv9of7ib', 'Barbell Back Squat', 'barbell back squat', ARRAY['back squat', 'squat', 'bb squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], '1. Stand up straight while holding a barbell behind you at arms length and your feet at shoulder width. Tip: A shoulder width grip is best with the palms of your hands facing back. You can use wrist wraps for this exercise for a better grip. This will be your starting position.
2. While keeping your head and eyes up and back straight, squat until your upper thighs are parallel to the floor. Breathe in as you slowly go down.
3. Pressing mainly with the heel of the foot and squeezing the thighs, go back up as you breathe out.
4. Repeat for the recommended amount of repetitions.', 'push', 'compound', 'intermediate', NOW(), NOW()),
('cmiz7vnam000mvr0mano9z27r', 'Calf Raise', 'calf raise', ARRAY['machine calf raise', 'standing calf raise'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['calves'], ARRAY[]::text[], '1. Adjust the padded lever of the calf raise machine to fit your height.
2. Place your shoulders under the pads provided and position your toes facing forward (or using any of the two other positions described at the beginning of the chapter). The balls of your feet should be secured on top of the calf block with the heels extending off it. Push the lever up by extending your hips and knees until your torso is standing erect. The knees should be kept with a slight bend; never locked. Toes should be facing forward, outwards or inwards as described at the beginning of the chapter. This will be your starting position.
3. Raise your heels as you breathe out by extending your ankles as high as possible and flexing your calf. Ensure that the knee is kept stationary at all times. There should be no bending at any time. Hold the contracted position by a second before you start to go back down.
4. Go back slowly to the starting position as you breathe in by lowering your heels as you bend the ankles until calves are stretched.
5. Repeat for the recommended amount of repetitions.', 'push', 'isolation', 'beginner', NOW(), NOW()),
('cmiz7vm4s000fvr0mfh2shcrv', 'Front Squat', 'front squat', ARRAY['barbell front squat', 'bb front squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['quads'], ARRAY['glutes'], '1. This exercise is best performed inside a squat rack for safety purposes. To begin, first set the bar on a rack just above shoulder level. Once the correct height is chosen and the bar is loaded, step under the bar and place the back of your shoulders (slightly below the neck) across it.
2. Hold on to the bar using both arms at each side and lift it off the rack by first pushing with your legs and at the same time straightening your torso.
3. Step away from the rack and position your legs using a shoulder-width medium stance with the toes slightly pointed out. Keep your head up at all times and maintain a straight back. This will be your starting position.
4. Begin to slowly lower the bar by bending the knees and sitting back with your hips as you maintain a straight posture with the head up. Continue down until your hamstrings are on your calves. Inhale as you perform this portion of the movement.
5. Begin to raise the bar as you exhale by pushing the floor with the heel or middle of your foot as you straighten the legs and extend the hips to go back to the starting position.
6. Repeat for the recommended amount of repetitions.', 'push', 'compound', 'intermediate', NOW(), NOW()),
('cmiz7vljh000cvr0mlk0r5kco', 'Leg Curl', 'leg curl', ARRAY['seated leg curl', 'machine leg curl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['hamstrings'], ARRAY[]::text[], '1. Adjust the machine lever to fit your height and sit on the machine with your back against the back support pad.
2. Place the back of lower leg on top of padded lever (just a few inches under the calves) and secure the lap pad against your thighs, just above the knees. Then grasp the side handles on the machine as you point your toes straight (or you can also use any of the other two stances) and ensure that the legs are fully straight right in front of you. This will be your starting position.
3. As you exhale, pull the machine lever as far as possible to the back of your thighs by flexing at the knees. Keep your torso stationary at all times. Hold the contracted position for a second.
4. Slowly return to the starting position as you breathe in.
5. Repeat for the recommended amount of repetitions.', 'pull', 'isolation', 'beginner', NOW(), NOW()),
('cmiz7vlqf000dvr0mm39bhj97', 'Leg Extension', 'leg extension', ARRAY['machine leg extension', 'quad extension'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['quads'], ARRAY[]::text[], '1. For this exercise you will need to use a leg extension machine. First choose your weight and sit on the machine with your legs under the pad (feet pointed forward) and the hands holding the side bars. This will be your starting position. Tip: You will need to adjust the pad so that it falls on top of your lower leg (just above your feet). Also, make sure that your legs form a 90-degree angle between the lower and upper leg. If the angle is less than 90-degrees then that means the knee is over the toes which in turn creates undue stress at the knee joint. If the machine is designed that way, either look for another machine or just make sure that when you start executing the exercise you stop going down once you hit the 90-degree angle.
2. Using your quadriceps, extend your legs to the maximum as you exhale. Ensure that the rest of the body remains stationary on the seat. Pause a second on the contracted position.
3. Slowly lower the weight back to the original position as you inhale, ensuring that you do not go past the 90-degree angle limit.
4. Repeat for the recommended amount of times.', 'push', 'isolation', 'beginner', NOW(), NOW()),
('cmiz7vldb000bvr0mw4qzzagc', 'Leg Press', 'leg press', ARRAY['machine leg press', 'seated leg press'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['machine'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], '1. Using a leg press machine, sit down on the machine and place your legs on the platform directly in front of you at a medium (shoulder width) foot stance. (Note: For the purposes of this discussion we will use the medium stance described above which targets overall development; however you can choose any of the three stances described in the foot positioning section).
2. Lower the safety bars holding the weighted platform in place and press the platform all the way up until your legs are fully extended in front of you. Tip: Make sure that you do not lock your knees. Your torso and the legs should make a perfect 90-degree angle. This will be your starting position.
3. As you inhale, slowly lower the platform until your upper and lower legs make a 90-degree angle.
4. Pushing mainly with the heels of your feet and using the quadriceps go back to the starting position as you exhale.
5. Repeat for the recommended amount of repetitions and ensure to lock the safety pins properly once you are done. You do not want that platform falling on you fully loaded.', 'push', 'compound', 'beginner', NOW(), NOW()),
('cmiz7vn4b000lvr0m5aq17wb7', 'Lunges', 'lunges', ARRAY['bodyweight lunge', 'forward lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['bodyweight'], ARRAY['quads', 'glutes'], ARRAY['hamstrings'], '1. Begin standing with your feet shoulder width apart and your hands on your hips.
2. Step forward with one leg, flexing the knees to drop your hips. Descend until your rear knee nearly touches the ground. Your posture should remain upright, and your front knee should stay above the front foot.
3. Drive through the heel of your lead foot and extend both knees to raise yourself back up.
4. Step forward with your rear foot, repeating the lunge on the opposite leg.', 'push', 'compound', 'beginner', NOW(), NOW()),
('cmiz7vkdh0005vr0mr5dm18ls', 'Romanian Deadlift', 'romanian deadlift', ARRAY['rdl', 'barbell rdl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['hamstrings', 'glutes'], ARRAY['lower-back'], '1. Put a barbell in front of you on the ground and grab it using a pronated (palms facing down) grip that a little wider than shoulder width. Tip: Depending on the weight used, you may need wrist wraps to perform the exercise and also a raised platform in order to allow for better range of motion.
2. Bend the knees slightly and keep the shins vertical, hips back and back straight. This will be your starting position.
3. Keeping your back and arms completely straight at all times, use your hips to lift the bar as you exhale. Tip: The movement should not be fast but steady and under control.
4. Once you are standing completely straight up, lower the bar by pushing the hips back, only slightly bending the knees, unlike when squatting. Tip: Take a deep breath at the start of the movement and keep your chest up. Hold your breath as you lower and exhale as you complete the movement.
5. Repeat for the recommended amount of repetitions.', 'pull', 'compound', 'intermediate', NOW(), NOW()),
('cmiz7vma9000gvr0mmjmxhp9s', 'Sumo Deadlift', 'sumo deadlift', ARRAY['barbell sumo deadlift', 'wide stance deadlift'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['hamstrings', 'glutes', 'adductors'], ARRAY['lower-back', 'traps'], '1. Begin with a bar loaded on the ground. Approach the bar so that the bar intersects the middle of the feet. The feet should be set very wide, near the collars. Bend at the hips to grip the bar. The arms should be directly below the shoulders, inside the legs, and you can use a pronated grip, a mixed grip, or hook grip. Relax the shoulders, which in effect lengthens your arms.
2. Take a breath, and then lower your hips, looking forward with your head with your chest up. Drive through the floor, spreading your feet apart, with your weight on the back half of your feet. Extend through the hips and knees.
3. As the bar passes through the knees, lean back and drive the hips into the bar, pulling your shoulder blades together.
4. Return the weight to the ground by bending at the hips and controlling the weight on the way down.', 'pull', 'compound', 'intermediate', NOW(), NOW()),

-- Shoulders (3)
('cmiz7vmsh000jvr0mq9pwqarc', 'Face Pull', 'face pull', ARRAY['cable face pull', 'rope face pull'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['cable'], ARRAY['rear-delts'], ARRAY['traps', 'mid-back'], '1. Facing a high pulley with a rope or dual handles attached, pull the weight directly towards your face, separating your hands as you do so. Keep your upper arms parallel to the ground.', 'pull', 'compound', 'intermediate', NOW(), NOW()),
('cmiz7vlyh000evr0m9d8snpzh', 'Lateral Raise', 'lateral raise', ARRAY['dumbbell lateral raise', 'side raise'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['side-delts'], ARRAY['traps'], '1. To begin, stand on an exercise band so that tension begins at arm''s length. Grasp the handles using a pronated (palms facing your thighs) grip that is slightly less than shoulder width. The handles should be resting on the sides of your thighs. Your arms should be extended with a slight bend at the elbows and your back should be straight. This will be your starting position.
2. Use your side shoulders to lift the handles to the sides as you exhale. Continue to lift the handles until they are slightly above parallel. Tip: As you lift the handles, slightly tilt the hand as if you were pouring water and keep your arms extended. Also, keep your torso stationary and pause for a second at the top of the movement.
3. Lower the handles back down slowly to the starting position. Inhale as you perform this portion of the movement.
4. Repeat for the recommended amount of repetitions.', 'push', 'isolation', 'beginner', NOW(), NOW()),
('cmiz7vk780004vr0md53c57bz', 'Overhead Press', 'overhead press', ARRAY['ohp', 'barbell overhead press', 'military press'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['barbell'], ARRAY['front-delts', 'triceps'], ARRAY['chest'], '1. Sit on a bench with back support in a squat rack. Position a barbell at a height that is just above your head. Grab the barbell with a pronated grip (palms facing forward).
2. Once you pick up the barbell with the correct grip width, lift the bar up over your head by locking your arms. Hold at about shoulder level and slightly in front of your head. This is your starting position.
3. Lower the bar down to the shoulders slowly as you inhale.
4. Lift the bar back up to the starting position as you exhale.
5. Repeat for the recommended amount of repetitions.', 'push', 'compound', 'intermediate', NOW(), NOW())

ON CONFLICT ("normalizedName") DO NOTHING;
