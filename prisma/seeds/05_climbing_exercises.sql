-- Pull-Up Bar Advanced Exercises Seed File
-- (Formerly climbing exercises — climbing-specific equipment exercises removed)
-- Retains pull-up bar exercises useful for general strength training

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
-- Advanced pulling exercises (pull-up bar)
('ex_cl_014', 'Frenchies', 'frenchies', ARRAY['french pull ups', 'frenchies pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'biceps'], ARRAY['forearms', 'mid-back'], null, null, null, null, NOW(), NOW()),
('ex_cl_015', 'Typewriter Pull-Up', 'typewriter pull-up', ARRAY['typewriter pullup', 'side to side pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'biceps'], ARRAY['forearms', 'front-delts'], '1. Grab the pull-up bar with the palms facing forward using a wide grip.
2. As you have both arms extended in front of you holding the bar at a wide grip, bring your torso back around 30 degrees or so while creating a curvature on your lower back and sticking your chest out. This is your starting position.
3. Pull your torso up while leaning to the left hand side until the bar almost touches your upper chest by drawing the shoulders and the upper arms down and back. Exhale as you perform this portion of the movement. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary as it moves through space (no swinging) and only the arms should move. The forearms should do no other work other than hold the bar.
4. After a second of contraction, inhale as you go back to the starting position.
5. Now, pull your torso up while leaning to the right hand side until the bar almost touches your upper chest by drawing the shoulders and the upper arms down and back. Exhale as you perform this portion of the movement. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary as it moves through space and only the arms should move. The forearms should do no other work other than hold the bar.
6. After a second of contraction, inhale as you go back to the starting position.
7. Repeat steps 3-6 until you have performed the prescribed amount of repetitions for each side.', 'pull', 'compound', 'intermediate', NOW(), NOW()),
('ex_cl_016', 'Assisted One Arm Pull-Up', 'assisted one arm pull-up', ARRAY['assisted one arm pullup', 'one arm negative'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'biceps'], ARRAY['forearms', 'abs'], null, null, null, null, NOW(), NOW()),
('ex_cl_017', 'Lock-Off Hold', 'lock-off hold', ARRAY['lockoff', 'pull up hold'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['biceps', 'lats'], ARRAY['forearms', 'front-delts'], null, null, null, null, NOW(), NOW()),

-- Antagonist/accessory exercises
('ex_cl_018', 'Reverse Wrist Curl', 'reverse wrist curl', ARRAY['wrist extension', 'extensor training'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['forearms'], ARRAY[]::text[], null, null, null, null, NOW(), NOW()),
('ex_cl_020', 'Front Lever Progression', 'front lever progression', ARRAY['front lever', 'tuck front lever'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'abs', 'front-delts'], ARRAY['biceps', 'lower-back'], null, null, null, null, NOW(), NOW()),
('ex_cl_021', 'Scapular Pull-Up', 'scapular pull-up', ARRAY['scap pullup', 'shoulder shrug pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['mid-back'], ARRAY['lats'], '1. Take a pronated grip on a pull-up bar.
2. From a hanging position, raise yourself a few inches without using your arms. Do this by depressing your shoulder girdle in a reverse shrugging motion.
3. Pause at the completion of the movement, and then slowly return to the starting position before performing more repetitions.', 'pull', 'isolation', 'beginner', NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
