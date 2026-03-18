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
  "createdAt",
  "updatedAt"
) VALUES
-- Advanced pulling exercises (pull-up bar)
('ex_cl_014', 'Frenchies', 'frenchies', ARRAY['french pull ups', 'frenchies pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'biceps'], ARRAY['forearms', 'mid-back'], NOW(), NOW()),
('ex_cl_015', 'Typewriter Pull-Up', 'typewriter pull-up', ARRAY['typewriter pullup', 'side to side pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'biceps'], ARRAY['forearms', 'front-delts'], NOW(), NOW()),
('ex_cl_016', 'Assisted One Arm Pull-Up', 'assisted one arm pull-up', ARRAY['assisted one arm pullup', 'one arm negative'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'biceps'], ARRAY['forearms', 'abs'], NOW(), NOW()),
('ex_cl_017', 'Lock-Off Hold', 'lock-off hold', ARRAY['lockoff', 'pull up hold'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['biceps', 'lats'], ARRAY['forearms', 'front-delts'], NOW(), NOW()),

-- Antagonist/accessory exercises
('ex_cl_018', 'Reverse Wrist Curl', 'reverse wrist curl', ARRAY['wrist extension', 'extensor training'], 'arms', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['dumbbell'], ARRAY['forearms'], ARRAY[]::text[], NOW(), NOW()),
('ex_cl_020', 'Front Lever Progression', 'front lever progression', ARRAY['front lever', 'tuck front lever'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['lats', 'abs', 'front-delts'], ARRAY['biceps', 'lower-back'], NOW(), NOW()),
('ex_cl_021', 'Scapular Pull-Up', 'scapular pull-up', ARRAY['scap pullup', 'shoulder shrug pullup'], 'back', true, null, '00000000-0000-0000-0000-000000000000', ARRAY['pull_up_bar'], ARRAY['mid-back'], ARRAY['lats'], NOW(), NOW())
ON CONFLICT ("normalizedName") DO NOTHING;
