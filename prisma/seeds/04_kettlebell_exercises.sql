-- Kettlebell Exercises Seed File
-- Run this in Supabase SQL Editor
-- System exercises for kettlebell training

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
-- Ballistic/Power exercises
('ex_kb_001', 'Kettlebell Swing', 'kettlebell swing', ARRAY['kb swing', 'russian swing', 'two hand swing'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['glutes', 'hamstrings', 'lower-back'], ARRAY['front-delts', 'abs'], null, NOW(), NOW()),
('ex_kb_002', 'Single Arm Kettlebell Swing', 'single arm kettlebell swing', ARRAY['one arm swing', 'single kb swing'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['glutes', 'hamstrings', 'lower-back'], ARRAY['front-delts', 'abs', 'obliques'], null, NOW(), NOW()),
('ex_kb_003', 'American Kettlebell Swing', 'american kettlebell swing', ARRAY['american swing', 'overhead swing'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['glutes', 'hamstrings', 'front-delts'], ARRAY['lower-back', 'abs'], '1. Allow the dumbbell to hang at arms length between your legs, holding it with both hands. Keep your back straight and your head up.
2. Swing the dumbbell between your legs, flexing at the hips and bending the knees slightly.
3. Powerfully reverse the motion by extending at the hips, knees, and ankles to propel yourself upward, swinging the dumbell over your head.
4. As you land, absorb the impact through your legs and draw the dumbbell to your torso before the next repetition.', NOW(), NOW()),
('ex_kb_004', 'Kettlebell Snatch', 'kettlebell snatch', ARRAY['kb snatch', 'single arm snatch'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['front-delts', 'glutes', 'hamstrings'], ARRAY['traps', 'abs', 'forearms'], '1. Place two kettlebells behind your feet. Bend your knees and sit back to pick up the kettlebells.
2. Swing the kettlebells between your legs forcefully and reverse the direction.
3. Drive through with your hips and lock the ketttlebells overhead in one uninterrupted motion.', NOW(), NOW()),
('ex_kb_005', 'Kettlebell Clean', 'kettlebell clean', ARRAY['kb clean', 'single arm clean'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['hamstrings', 'glutes', 'front-delts'], ARRAY['traps', 'abs', 'forearms'], '1. Place kettlebell between your feet. To get in the starting position, push your butt back and look straight ahead.
2. Clean the kettlebell to your shoulder. Clean the kettlebell to your shoulders by extending through the legs and hips as you raise the kettlebell towards your shoulder. The wrist should rotate as you do so.
3. Lower the kettlebell, keeping the hamstrings loaded by keeping your back straight and your butt out.', NOW(), NOW()),
('ex_kb_006', 'Kettlebell Clean and Press', 'kettlebell clean and press', ARRAY['kb clean and press'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['front-delts', 'hamstrings', 'glutes'], ARRAY['traps', 'triceps', 'abs'], '1. Assume a shoulder-width stance, with knees inside the arms. Now while keeping the back flat, bend at the knees and hips so that you can grab the bar with the arms fully extended and a pronated grip that is slightly wider than shoulder width. Point the elbows out to sides. The bar should be close to the shins. Position the shoulders over or slightly ahead of the bar. Establish a flat back posture. This will be your starting position.
2. Begin to pull the bar by extending the knees. Move your hips forward and raise the shoulders at the same rate while keeping the angle of the back constant; continue to lift the bar straight up while keeping it close to your body.
3. As the bar passes the knee, extend at the ankles, knees, and hips forcefully, similar to a jumping motion. As you do so, continue to guide the bar with your hands, shrugging your shoulders and using the momentum from your movement to pull the bar as high as possible. The bar should travel close to your body, and you should keep your elbows out.
4. At maximum elevation, your feet should clear the floor and you should start to pull yourself under the bar. The mechanics of this could change slightly, depending on the weight used. You should descend into a squatting position as you pull yourself under the bar.
5. As the bar hits terminal height, rotate your elbows around and under the bar. Rack the bar across the front of the shoulders while keeping the torso erect and flexing the hips and knees to absorb the weight of the bar.
6. Stand to full height, holding the bar in the clean position.
7. Without moving your feet, press the bar overhead as you exhale. Lower the bar under control .', NOW(), NOW()),
('ex_kb_007', 'Kettlebell High Pull', 'kettlebell high pull', ARRAY['kb high pull'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['traps', 'front-delts', 'hamstrings'], ARRAY['glutes', 'abs'], '1. Place a kettlebell on the ground between your feet. Position your feet in a wide stance, and grasp the kettlebell with two hands. Set your hips back as far as possible, with your knees bent. Keep your chest and head up. This will be your starting position.
2. Begin by extending the hips and knees, simultaneously pulling the kettlebell to your shoulders, raising your elbows as you do so. Reverse the motion to return to the starting position.', NOW(), NOW()),

-- Pressing exercises
('ex_kb_008', 'Kettlebell Press', 'kettlebell press', ARRAY['kb press', 'kettlebell shoulder press', 'single arm kb press'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['front-delts', 'triceps'], ARRAY['abs', 'chest'], '1. Sit on a bench with back support in a squat rack. Position a barbell at a height that is just above your head. Grab the barbell with a pronated grip (palms facing forward).
2. Once you pick up the barbell with the correct grip width, lift the bar up over your head by locking your arms. Hold at about shoulder level and slightly in front of your head. This is your starting position.
3. Lower the bar down to the shoulders slowly as you inhale.
4. Lift the bar back up to the starting position as you exhale.
5. Repeat for the recommended amount of repetitions.', NOW(), NOW()),
('ex_kb_009', 'Kettlebell Push Press', 'kettlebell push press', ARRAY['kb push press'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['front-delts', 'triceps'], ARRAY['quads', 'abs'], '1. Clean two kettlebells to your shoulders.
2. Squat down a few inches and reverse the motion rapidly. Use the momentum from the legs to drive the kettlebells overhead.
3. Once the kettlebells are locked out, lower the kettlebells to your shoulders and repeat.', NOW(), NOW()),
('ex_kb_010', 'Kettlebell Floor Press', 'kettlebell floor press', ARRAY['kb floor press'], 'chest', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['chest', 'triceps'], ARRAY['front-delts'], '1. Adjust the j-hooks so they are at the appropriate height to rack the bar. Begin lying on the floor with your head near the end of a power rack. Keeping your shoulder blades pulled together; pull the bar off of the hooks.
2. Lower the bar towards the bottom of your chest or upper stomach, squeezing the bar and attempting to pull it apart as you do so. Ensure that you tuck your elbows throughout the movement. Lower the bar until your upper arm contacts the ground and pause, preventing any slamming or bouncing of the weight.
3. Press the bar back up as fast as you can, keeping the bar, your wrists, and elbows in line as you do so.', NOW(), NOW()),
('ex_kb_011', 'Kettlebell Thruster', 'kettlebell thruster', ARRAY['kb thruster'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['quads', 'front-delts'], ARRAY['glutes', 'triceps', 'abs'], '1. Clean two kettlebells to your shoulders. Clean the kettlebells to your shoulders by extending through the legs and hips as you pull the kettlebells towards your shoulders. Rotate your wrists as you do so. This will be your starting position.
2. Begin to squat by flexing your hips and knees, lowering your hips between your legs. Maintain an upright, straight back as you descend as low as you can.
3. At the bottom, reverse direction and squat by extending your knees and hips, driving through your heels. As you do so, press both kettlebells overhead by extending your arms straight up, using the momentum from the squat to help drive the weights upward.
4. As you begin the next repetition, return the weights to the shoulders.', NOW(), NOW()),

-- Squatting exercises
('ex_kb_012', 'Kettlebell Goblet Squat', 'kettlebell goblet squat', ARRAY['kb goblet squat', 'goblet squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['quads', 'glutes'], ARRAY['abs', 'mid-back'], '1. Stand holding a light kettlebell by the horns close to your chest. This will be your starting position.
2. Squat down between your legs until your hamstrings are on your calves. Keep your chest and head up and your back straight.
3. At the bottom position, pause and use your elbows to push your knees out. Return to the starting position, and repeat for 10-20 repetitions.', NOW(), NOW()),
('ex_kb_013', 'Kettlebell Front Squat', 'kettlebell front squat', ARRAY['kb front squat', 'double kettlebell front squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['quads', 'glutes'], ARRAY['abs', 'mid-back'], null, NOW(), NOW()),
('ex_kb_014', 'Kettlebell Pistol Squat', 'kettlebell pistol squat', ARRAY['kb pistol squat'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], '1. Pick up a kettlebell with two hands and hold it by the horns. Hold one leg off of the floor and squat down on the other.
2. Squat down by flexing the knee and sitting back with the hips, holding the kettlebell up in front of you.
3. Hold the bottom position for a second and then reverse the motion, driving through the heel and keeping your head and chest up.
4. Lower yourself again and repeat.', NOW(), NOW()),

-- Lunging exercises
('ex_kb_015', 'Kettlebell Lunge', 'kettlebell lunge', ARRAY['kb lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], null, NOW(), NOW()),
('ex_kb_016', 'Kettlebell Reverse Lunge', 'kettlebell reverse lunge', ARRAY['kb reverse lunge'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['quads', 'glutes'], ARRAY['hamstrings', 'abs'], '1. Stand with your feet shoulder width apart. This will be your starting position.
2. Perform a rear lunge by stepping back with one foot and flexing the hips and front knee. As you do so, rotate your torso across the front leg.
3. After a brief pause, return to the starting position and repeat on the other side, continuing in an alternating fashion.', NOW(), NOW()),

-- Rowing exercises
('ex_kb_017', 'Kettlebell Row', 'kettlebell row', ARRAY['kb row', 'single arm kettlebell row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['lats', 'mid-back'], ARRAY['biceps', 'rear-delts'], '1. Place a kettlebell in front of your feet. Bend your knees slightly and then push your butt out as much as possible as you bend over to get in the starting position. Grab the kettlebell and pull it to your stomach, retracting your shoulder blade and flexing the elbow. Keep your back straight. Lower and repeat.', NOW(), NOW()),
('ex_kb_018', 'Kettlebell Renegade Row', 'kettlebell renegade row', ARRAY['renegade row', 'kb renegade row'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['lats', 'mid-back', 'abs'], ARRAY['biceps', 'front-delts'], '1. Place two kettlebells on the floor about shoulder width apart. Position yourself on your toes and your hands as though you were doing a pushup, with the body straight and extended. Use the handles of the kettlebells to support your upper body. You may need to position your feet wide for support.
2. Push one kettlebell into the floor and row the other kettlebell, retracting the shoulder blade of the working side as you flex the elbow, pulling it to your side.
3. Then lower the kettlebell to the floor and begin the kettlebell in the opposite hand. Repeat for several reps.', NOW(), NOW()),

-- Deadlift variations
('ex_kb_019', 'Kettlebell Deadlift', 'kettlebell deadlift', ARRAY['kb deadlift'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['hamstrings', 'glutes', 'lower-back'], ARRAY['traps', 'forearms'], null, NOW(), NOW()),
('ex_kb_020', 'Single Leg Kettlebell Deadlift', 'single leg kettlebell deadlift', ARRAY['single leg kb deadlift', 'kb single leg rdl'], 'legs', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['hamstrings', 'glutes'], ARRAY['lower-back', 'abs'], null, NOW(), NOW()),

-- Core exercises
('ex_kb_021', 'Kettlebell Turkish Get-Up', 'kettlebell turkish get-up', ARRAY['turkish get up', 'tgu', 'kb turkish get up'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['abs', 'front-delts'], ARRAY['glutes', 'quads', 'triceps'], '1. Lie on your back on the floor and press a kettlebell to the top position by extending the elbow. Bend the knee on the same side as the kettlebell.
2. Keeping the kettlebell locked out at all times, pivot to the opposite side and use your non- working arm to assist you in driving forward to the lunge position. Using your free hand, push yourself to a seated position, then progressing to one knee.
3. While looking up at the kettlebell, slowly stand up. Reverse the motion back to the starting position and repeat.', NOW(), NOW()),
('ex_kb_022', 'Kettlebell Windmill', 'kettlebell windmill', ARRAY['kb windmill'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['obliques', 'front-delts'], ARRAY['glutes', 'hamstrings'], '1. Place a kettlebell in front of your lead foot and clean and press it overhead with your opposite arm. Clean the kettlebell to your shoulder by extending through the legs and hips as you pull the kettlebell towards your shoulders. Rotate your wrist as you do so, so that the palm faces forward. Press it overhead by extending the elbow.
2. Keeping the kettlebell locked out at all times, push your butt out in the direction of the locked out kettlebell. Turn your feet out at a forty-five degree angle from the arm with the locked out kettlebell. Bending at the hip to one side, sticking your butt out, slowly lean until you can touch the floor with your free hand. Keep your eyes on the kettlebell that you hold over your head at all times.
3. Pause for a second after reaching the ground and reverse the motion back to the starting position.', NOW(), NOW()),
('ex_kb_023', 'Kettlebell Halo', 'kettlebell halo', ARRAY['kb halo'], 'shoulders', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['front-delts', 'side-delts'], ARRAY['abs', 'mid-back'], null, NOW(), NOW()),
('ex_kb_024', 'Kettlebell Russian Twist', 'kettlebell russian twist', ARRAY['kb russian twist'], 'core', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['obliques', 'abs'], ARRAY[]::text[], '1. Lie down on the floor placing your feet either under something that will not move or by having a partner hold them. Your legs should be bent at the knees.
2. Elevate your upper body so that it creates an imaginary V-shape with your thighs. Your arms should be fully extended in front of you perpendicular to your torso and with the hands clasped. This is the starting position.
3. Twist your torso to the right side until your arms are parallel with the floor while breathing out.
4. Hold the contraction for a second and move back to the starting position while breathing out. Now move to the opposite side performing the same techniques you applied to the right side.
5. Repeat for the recommended amount of repetitions.', NOW(), NOW()),

-- Carries
('ex_kb_025', 'Kettlebell Farmer Carry', 'kettlebell farmer carry', ARRAY['kb farmer carry', 'kettlebell farmers walk'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['forearms', 'traps'], ARRAY['abs', 'calves'], '1. There are various implements that can be used for the farmers walk. These can also be performed with heavy dumbbells or short bars if these implements aren''t available. Begin by standing between the implements.
2. After gripping the handles, lift them up by driving through your heels, keeping your back straight and your head up.
3. Walk taking short, quick steps, and don''t forget to breathe. Move for a given distance, typically 50-100 feet, as fast as possible.', NOW(), NOW()),
('ex_kb_026', 'Kettlebell Rack Carry', 'kettlebell rack carry', ARRAY['kb rack carry', 'rack walk'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['abs', 'front-delts'], ARRAY['calves', 'mid-back'], null, NOW(), NOW()),
('ex_kb_027', 'Kettlebell Overhead Carry', 'kettlebell overhead carry', ARRAY['kb overhead carry', 'overhead walk'], 'full body', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['kettlebell'], ARRAY['front-delts', 'abs'], ARRAY['triceps', 'calves'], null, NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
