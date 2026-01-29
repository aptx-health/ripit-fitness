-- Seed data for CommunityProgram table
-- 25 programs: 15 strength, 10 cardio
-- Run this in Supabase SQL Editor

-- Note: Replace 'YOUR_USER_ID_HERE' with an actual user ID from your auth.users table
-- Note: This uses system exercise definition IDs that should exist in your database
-- If you get foreign key errors, you may need to create some exercise definitions first

-- STRENGTH PROGRAMS (15)

INSERT INTO "CommunityProgram" (
  "id", "name", "description", "programType", "authorUserId", "displayName",
  "publishedAt", "originalProgramId", "programData", "weekCount", "workoutCount", "exerciseCount"
) VALUES
(
  'comm-prog-001',
  'Push Pull Legs - Beginner',
  'Classic PPL split perfect for beginners. Focus on compound movements and progressive overload. 3 days per week with rest days in between.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Mike Thompson',
  NOW() - INTERVAL '5 days',
  'orig-prog-001',
  '{"id":"orig-prog-001","weeks":[{"id":"week-1","weekNumber":1,"workouts":[{"id":"workout-1","name":"Push Day","dayNumber":1,"exercises":[{"id":"ex-1","name":"Bench Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"8-12","weight":null,"rpe":8,"rir":null}]},{"id":"ex-2","name":"Overhead Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"8-12","weight":null,"rpe":8,"rir":null}]},{"id":"ex-3","name":"Tricep Dips","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":3,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"8-12","weight":null,"rpe":8,"rir":null}]}]},{"id":"workout-2","name":"Pull Day","dayNumber":2,"exercises":[{"id":"ex-4","name":"Deadlift","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":8,"rir":null}]},{"id":"ex-5","name":"Pull-ups","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"AMRAP","weight":null,"rpe":8,"rir":null}]},{"id":"ex-6","name":"Barbell Rows","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":3,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"8-12","weight":null,"rpe":8,"rir":null}]}]},{"id":"workout-3","name":"Leg Day","dayNumber":3,"exercises":[{"id":"ex-7","name":"Squat","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":8,"rir":null}]},{"id":"ex-8","name":"Leg Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"10-15","weight":null,"rpe":7,"rir":null}]},{"id":"ex-9","name":"Leg Curls","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":3,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"10-15","weight":null,"rpe":7,"rir":null}]}]}]}]}',
  1,
  3,
  9
),
(
  'comm-prog-002',
  'Starting Strength 12 Week',
  'Linear progression program based on Starting Strength principles. Focus on the big 3: squat, bench, deadlift. Perfect for novice lifters looking to build a foundation.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Sarah Martinez',
  NOW() - INTERVAL '12 days',
  'orig-prog-002',
  '{"id":"orig-prog-002","weeks":[{"id":"week-1","weekNumber":1,"workouts":[{"id":"workout-1","name":"Workout A","dayNumber":1,"exercises":[{"id":"ex-1","name":"Squat","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":null,"rir":2}]},{"id":"ex-2","name":"Bench Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":null,"rir":2}]},{"id":"ex-3","name":"Deadlift","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":3,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":null,"rir":2}]}]},{"id":"workout-2","name":"Workout B","dayNumber":3,"exercises":[{"id":"ex-4","name":"Squat","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":null,"rir":2}]},{"id":"ex-5","name":"Overhead Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":null,"rir":2}]},{"id":"ex-6","name":"Power Clean","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":3,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":null,"rir":2}]}]}]}]}',
  12,
  2,
  6
);

-- For brevity, I'll create a simplified version for the remaining programs
-- Each will have the minimum required structure but simplified exercises

INSERT INTO "CommunityProgram" (
  "id", "name", "description", "programType", "authorUserId", "displayName",
  "publishedAt", "originalProgramId", "programData", "weekCount", "workoutCount", "exerciseCount"
) VALUES
(
  'comm-prog-003',
  'Upper Lower 4 Day Split',
  'Efficient 4-day split hitting each muscle group twice per week. Great for intermediate lifters wanting to increase training frequency.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Alex Chen',
  NOW() - INTERVAL '8 days',
  'orig-prog-003',
  '{"id":"orig-prog-003","weeks":[{"id":"w1","weekNumber":1,"workouts":[{"id":"wo1","name":"Upper Power","dayNumber":1,"exercises":[{"id":"e1","name":"Bench Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":8,"rir":null}]}]},{"id":"wo2","name":"Lower Power","dayNumber":2,"exercises":[{"id":"e2","name":"Squat","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":8,"rir":null}]}]},{"id":"wo3","name":"Upper Hypertrophy","dayNumber":4,"exercises":[{"id":"e3","name":"Dumbbell Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"10-12","weight":null,"rpe":8,"rir":null}]}]},{"id":"wo4","name":"Lower Hypertrophy","dayNumber":5,"exercises":[{"id":"e4","name":"Leg Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"10-12","weight":null,"rpe":8,"rir":null}]}]}]}]}',
  1,
  4,
  4
),
(
  'comm-prog-004',
  'Powerlifting Peaking Program',
  'Competition prep program designed to peak strength in squat, bench, and deadlift. 8 weeks of progressive overload leading to competition day.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Marcus Johnson',
  NOW() - INTERVAL '15 days',
  'orig-prog-004',
  '{"id":"orig-prog-004","weeks":[{"id":"w1","weekNumber":1,"workouts":[{"id":"wo1","name":"Squat Day","dayNumber":1,"exercises":[{"id":"e1","name":"Competition Squat","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"3","weight":null,"rpe":9,"rir":null}]}]},{"id":"wo2","name":"Bench Day","dayNumber":3,"exercises":[{"id":"e2","name":"Competition Bench","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"3","weight":null,"rpe":9,"rir":null}]}]},{"id":"wo3","name":"Deadlift Day","dayNumber":5,"exercises":[{"id":"e3","name":"Competition Deadlift","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"3","weight":null,"rpe":9,"rir":null}]}]}]}]}',
  8,
  3,
  3
),
(
  'comm-prog-005',
  'Bodyweight Home Workout',
  'No equipment needed! Progressive bodyweight training focusing on push-ups, pull-ups, dips, and squats. Perfect for home training.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Emma Wilson',
  NOW() - INTERVAL '3 days',
  'orig-prog-005',
  '{"id":"orig-prog-005","weeks":[{"id":"w1","weekNumber":1,"workouts":[{"id":"wo1","name":"Upper Push","dayNumber":1,"exercises":[{"id":"e1","name":"Push-ups","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"AMRAP","weight":null,"rpe":8,"rir":null}]}]},{"id":"wo2","name":"Upper Pull","dayNumber":3,"exercises":[{"id":"e2","name":"Pull-ups","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"AMRAP","weight":null,"rpe":8,"rir":null}]}]},{"id":"wo3","name":"Lower","dayNumber":5,"exercises":[{"id":"e3","name":"Pistol Squats","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5-8","weight":null,"rpe":8,"rir":null}]}]}]}]}',
  1,
  3,
  3
),
(
  'comm-prog-006',
  'Olympic Weightlifting Base',
  'Introduction to snatch and clean & jerk. Focus on technique and mobility. Includes assistance work for building the classic lifts.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Dimitri Volkov',
  NOW() - INTERVAL '20 days',
  'orig-prog-006',
  '{"id":"orig-prog-006","weeks":[{"id":"w1","weekNumber":1,"workouts":[{"id":"wo1","name":"Snatch Day","dayNumber":1,"exercises":[{"id":"e1","name":"Power Snatch","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"3","weight":null,"rpe":7,"rir":null}]}]},{"id":"wo2","name":"Clean Day","dayNumber":3,"exercises":[{"id":"e2","name":"Power Clean","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"3","weight":null,"rpe":7,"rir":null}]}]},{"id":"wo3","name":"Jerk Day","dayNumber":5,"exercises":[{"id":"e3","name":"Push Jerk","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"3","weight":null,"rpe":7,"rir":null}]}]}]}]}',
  4,
  3,
  3
),
(
  'comm-prog-007',
  '5x5 Stronglifts Modified',
  'Modified version of the classic Stronglifts 5x5. Added accessory work for balanced development. 3 days per week.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Jason Park',
  NOW() - INTERVAL '6 days',
  'orig-prog-007',
  '{"id":"orig-prog-007","weeks":[{"id":"w1","weekNumber":1,"workouts":[{"id":"wo1","name":"Workout A","dayNumber":1,"exercises":[{"id":"e1","name":"Squat","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":null,"rir":2}]},{"id":"e2","name":"Bench Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":null,"rir":2}]}]},{"id":"wo2","name":"Workout B","dayNumber":3,"exercises":[{"id":"e3","name":"Deadlift","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":null,"rir":2}]}]}]}]}',
  1,
  2,
  3
),
(
  'comm-prog-008',
  'Hypertrophy Arm Specialization',
  'Dedicated arm program to add size to biceps and triceps. Can be added to existing program or run standalone.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Tony Rodriguez',
  NOW() - INTERVAL '10 days',
  'orig-prog-008',
  '{"id":"orig-prog-008","weeks":[{"id":"w1","weekNumber":1,"workouts":[{"id":"wo1","name":"Arm Day 1","dayNumber":1,"exercises":[{"id":"e1","name":"Barbell Curl","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"8-12","weight":null,"rpe":8,"rir":null}]},{"id":"e2","name":"Skull Crushers","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"8-12","weight":null,"rpe":8,"rir":null}]}]},{"id":"wo2","name":"Arm Day 2","dayNumber":4,"exercises":[{"id":"e3","name":"Hammer Curl","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"8-12","weight":null,"rpe":8,"rir":null}]},{"id":"e4","name":"Cable Pushdowns","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"12-15","weight":null,"rpe":7,"rir":null}]}]}]}]}',
  4,
  2,
  4
),
(
  'comm-prog-009',
  'CrossFit Inspired Strength',
  'Strength-focused CrossFit style programming. Mix of barbell work, gymnastics, and conditioning. High intensity.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Katie Sullivan',
  NOW() - INTERVAL '2 days',
  'orig-prog-009',
  '{"id":"orig-prog-009","weeks":[{"id":"w1","weekNumber":1,"workouts":[{"id":"wo1","name":"Monday WOD","dayNumber":1,"exercises":[{"id":"e1","name":"Squat Clean","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":8,"rir":null}]},{"id":"e2","name":"Muscle-ups","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":9,"rir":null}]},{"id":"e3","name":"Box Jumps","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":3,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"10","weight":null,"rpe":7,"rir":null}]}]},{"id":"wo2","name":"Wednesday WOD","dayNumber":3,"exercises":[{"id":"e4","name":"Deadlift","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":8,"rir":null}]}]},{"id":"wo3","name":"Friday WOD","dayNumber":5,"exercises":[{"id":"e5","name":"Front Squat","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":8,"rir":null}]}]}]}]}',
  1,
  3,
  5
),
(
  'comm-prog-010',
  'Back and Biceps Blast',
  'Focused program for building a thick, wide back and peaked biceps. Twice per week frequency for optimal growth.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Derek Stone',
  NOW() - INTERVAL '18 days',
  'orig-prog-010',
  '{"id":"orig-prog-010","weeks":[{"id":"w1","weekNumber":1,"workouts":[{"id":"wo1","name":"Back Width","dayNumber":1,"exercises":[{"id":"e1","name":"Lat Pulldown","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"8-12","weight":null,"rpe":8,"rir":null}]},{"id":"e2","name":"Cable Curl","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"10-12","weight":null,"rpe":7,"rir":null}]}]},{"id":"wo2","name":"Back Thickness","dayNumber":4,"exercises":[{"id":"e3","name":"Deadlift","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":8,"rir":null}]},{"id":"e4","name":"Barbell Curl","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"8-10","weight":null,"rpe":8,"rir":null}]}]}]}]}',
  1,
  2,
  4
),
(
  'comm-prog-011',
  'Chest and Shoulders Builder',
  'Focus on upper body pushing movements. Build a massive chest and boulder shoulders. Great for bench press strength.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Brad Mitchell',
  NOW() - INTERVAL '7 days',
  'orig-prog-011',
  '{"id":"orig-prog-011","weeks":[{"id":"w1","weekNumber":1,"workouts":[{"id":"wo1","name":"Chest Focus","dayNumber":1,"exercises":[{"id":"e1","name":"Barbell Bench Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":8,"rir":null}]},{"id":"e2","name":"Incline Dumbbell Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"8-12","weight":null,"rpe":8,"rir":null}]}]},{"id":"wo2","name":"Shoulder Focus","dayNumber":4,"exercises":[{"id":"e3","name":"Overhead Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":8,"rir":null}]},{"id":"e4","name":"Lateral Raises","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"12-15","weight":null,"rpe":7,"rir":null}]}]}]}]}',
  1,
  2,
  4
),
(
  'comm-prog-012',
  'Leg Day Destroyer',
  'Brutal leg program for serious quad and hamstring development. Not for the faint of heart. Includes glute work.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Samantha Lee',
  NOW() - INTERVAL '14 days',
  'orig-prog-012',
  '{"id":"orig-prog-012","weeks":[{"id":"w1","weekNumber":1,"workouts":[{"id":"wo1","name":"Quad Focus","dayNumber":1,"exercises":[{"id":"e1","name":"Back Squat","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"8-12","weight":null,"rpe":8,"rir":null}]},{"id":"e2","name":"Leg Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"12-15","weight":null,"rpe":8,"rir":null}]}]},{"id":"wo2","name":"Hamstring Focus","dayNumber":4,"exercises":[{"id":"e3","name":"Romanian Deadlift","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"8-12","weight":null,"rpe":8,"rir":null}]},{"id":"e4","name":"Leg Curl","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"12-15","weight":null,"rpe":7,"rir":null}]}]}]}]}',
  1,
  2,
  4
),
(
  'comm-prog-013',
  'Full Body 3x Per Week',
  'Time-efficient full body program. Perfect for busy professionals. Hit every major muscle group each session.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Chris Anderson',
  NOW() - INTERVAL '4 days',
  'orig-prog-013',
  '{"id":"orig-prog-013","weeks":[{"id":"w1","weekNumber":1,"workouts":[{"id":"wo1","name":"Workout A","dayNumber":1,"exercises":[{"id":"e1","name":"Squat","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":8,"rir":null}]},{"id":"e2","name":"Bench Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":8,"rir":null}]},{"id":"e3","name":"Pull-ups","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":3,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"AMRAP","weight":null,"rpe":8,"rir":null}]}]},{"id":"wo2","name":"Workout B","dayNumber":3,"exercises":[{"id":"e4","name":"Deadlift","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"5","weight":null,"rpe":8,"rir":null}]}]},{"id":"wo3","name":"Workout C","dayNumber":5,"exercises":[{"id":"e5","name":"Front Squat","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"8-12","weight":null,"rpe":8,"rir":null}]}]}]}]}',
  1,
  3,
  5
),
(
  'comm-prog-014',
  'Powerbuilding Hybrid',
  'Combination of powerlifting and bodybuilding. Build strength AND size. 4 days per week with varied rep ranges.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Ryan Cooper',
  NOW() - INTERVAL '22 days',
  'orig-prog-014',
  '{"id":"orig-prog-014","weeks":[{"id":"w1","weekNumber":1,"workouts":[{"id":"wo1","name":"Lower Power","dayNumber":1,"exercises":[{"id":"e1","name":"Squat","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"3-5","weight":null,"rpe":8,"rir":null}]}]},{"id":"wo2","name":"Upper Power","dayNumber":2,"exercises":[{"id":"e2","name":"Bench Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"3-5","weight":null,"rpe":8,"rir":null}]}]},{"id":"wo3","name":"Lower Hypertrophy","dayNumber":4,"exercises":[{"id":"e3","name":"Leg Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"10-15","weight":null,"rpe":8,"rir":null}]}]},{"id":"wo4","name":"Upper Hypertrophy","dayNumber":5,"exercises":[{"id":"e4","name":"Incline Press","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"10-12","weight":null,"rpe":8,"rir":null}]}]}]}]}',
  1,
  4,
  4
),
(
  'comm-prog-015',
  'Strength Endurance Program',
  'Build both strength and muscular endurance. Higher rep ranges with moderate weight. Great for general fitness.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Nicole Bennett',
  NOW() - INTERVAL '1 day',
  'orig-prog-015',
  '{"id":"orig-prog-015","weeks":[{"id":"w1","weekNumber":1,"workouts":[{"id":"wo1","name":"Upper Body","dayNumber":1,"exercises":[{"id":"e1","name":"Push-ups","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"15-20","weight":null,"rpe":7,"rir":null}]},{"id":"e2","name":"Pull-ups","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"AMRAP","weight":null,"rpe":8,"rir":null}]}]},{"id":"wo2","name":"Lower Body","dayNumber":3,"exercises":[{"id":"e3","name":"Goblet Squat","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":1,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"15-20","weight":null,"rpe":7,"rir":null}]},{"id":"e4","name":"Lunges","exerciseDefinitionId":"00000000-0000-0000-0000-000000000000","order":2,"exerciseGroup":null,"notes":null,"prescribedSets":[{"setNumber":1,"reps":"12-15","weight":null,"rpe":7,"rir":null}]}]}]}]}',
  1,
  2,
  4
);

-- CARDIO PROGRAMS (10)
-- Note: Cardio programs use a simplified structure since they don't have the same exercise hierarchy

INSERT INTO "CommunityProgram" (
  "id", "name", "description", "programType", "authorUserId", "displayName",
  "publishedAt", "originalProgramId", "programData", "weekCount", "workoutCount", "exerciseCount"
) VALUES
(
  'comm-prog-016',
  'Couch to 5K Running',
  'Beginner-friendly running program to get you from the couch to running a 5K. Gradual progression over 8 weeks.',
  'cardio',
  'YOUR_USER_ID_HERE',
  'Jennifer Walsh',
  NOW() - INTERVAL '9 days',
  'orig-prog-016',
  '{"id":"orig-prog-016","type":"cardio","weeks":[{"weekNumber":1,"sessions":[{"name":"Walk/Run Intervals","duration":"30 minutes","intensity":"Easy"}]}]}',
  8,
  3,
  3
),
(
  'comm-prog-017',
  'HIIT Fat Burner Protocol',
  'High intensity interval training designed for maximum fat loss. Short, intense sessions that can be done anywhere.',
  'cardio',
  'YOUR_USER_ID_HERE',
  'Mike Stevens',
  NOW() - INTERVAL '11 days',
  'orig-prog-017',
  '{"id":"orig-prog-017","type":"cardio","weeks":[{"weekNumber":1,"sessions":[{"name":"Tabata Sprints","duration":"20 minutes","intensity":"Very High"}]}]}',
  4,
  3,
  3
),
(
  'comm-prog-018',
  'Half Marathon Training Plan',
  'Complete 12-week half marathon training program. Includes tempo runs, long runs, and recovery days.',
  'cardio',
  'YOUR_USER_ID_HERE',
  'Amanda Pierce',
  NOW() - INTERVAL '16 days',
  'orig-prog-018',
  '{"id":"orig-prog-018","type":"cardio","weeks":[{"weekNumber":1,"sessions":[{"name":"Easy Run","duration":"45 minutes","intensity":"Easy"}]}]}',
  12,
  3,
  3
),
(
  'comm-prog-019',
  'Cycling Base Building',
  'Build your aerobic base for cycling. Focus on time in saddle and steady-state cardio. Great for beginners.',
  'cardio',
  'YOUR_USER_ID_HERE',
  'Tom Bradley',
  NOW() - INTERVAL '5 days',
  'orig-prog-019',
  '{"id":"orig-prog-019","type":"cardio","weeks":[{"weekNumber":1,"sessions":[{"name":"Easy Ride","duration":"60 minutes","intensity":"Easy"}]}]}',
  8,
  3,
  3
),
(
  'comm-prog-020',
  'Rowing Machine Intervals',
  'Full body cardio using a rowing machine. Mix of steady state and interval work. Burns calories and builds muscle.',
  'cardio',
  'YOUR_USER_ID_HERE',
  'Rachel Kim',
  NOW() - INTERVAL '13 days',
  'orig-prog-020',
  '{"id":"orig-prog-020","type":"cardio","weeks":[{"weekNumber":1,"sessions":[{"name":"Steady State Row","duration":"30 minutes","intensity":"Moderate"}]}]}',
  4,
  3,
  3
),
(
  'comm-prog-021',
  'Swimming for Fitness',
  'Low-impact swimming program for overall cardiovascular fitness. Great for joint health and full body conditioning.',
  'cardio',
  'YOUR_USER_ID_HERE',
  'David Chen',
  NOW() - INTERVAL '19 days',
  'orig-prog-021',
  '{"id":"orig-prog-021","type":"cardio","weeks":[{"weekNumber":1,"sessions":[{"name":"Freestyle Endurance","duration":"45 minutes","intensity":"Moderate"}]}]}',
  6,
  3,
  3
),
(
  'comm-prog-022',
  'Jump Rope Cardio Challenge',
  'Jump rope focused cardio program. Improves coordination, footwork, and burns serious calories. Can be done anywhere.',
  'cardio',
  'YOUR_USER_ID_HERE',
  'Lisa Morgan',
  NOW() - INTERVAL '3 days',
  'orig-prog-022',
  '{"id":"orig-prog-022","type":"cardio","weeks":[{"weekNumber":1,"sessions":[{"name":"Basic Jump Intervals","duration":"20 minutes","intensity":"Moderate"}]}]}',
  4,
  3,
  3
),
(
  'comm-prog-023',
  'Stair Climbing Workout',
  'Use stairs for an intense leg and cardio workout. Build power and endurance. No gym needed.',
  'cardio',
  'YOUR_USER_ID_HERE',
  'Kevin Wright',
  NOW() - INTERVAL '21 days',
  'orig-prog-023',
  '{"id":"orig-prog-023","type":"cardio","weeks":[{"weekNumber":1,"sessions":[{"name":"Steady Climb","duration":"30 minutes","intensity":"Moderate"}]}]}',
  4,
  3,
  3
),
(
  'comm-prog-024',
  'Elliptical Interval Training',
  'Low-impact elliptical program with progressive intervals. Perfect for those with joint issues.',
  'cardio',
  'YOUR_USER_ID_HERE',
  'Michelle Torres',
  NOW() - INTERVAL '8 days',
  'orig-prog-024',
  '{"id":"orig-prog-024","type":"cardio","weeks":[{"weekNumber":1,"sessions":[{"name":"Steady State","duration":"35 minutes","intensity":"Moderate"}]}]}',
  6,
  3,
  3
),
(
  'comm-prog-025',
  'Assault Bike Conditioning',
  'Brutal assault bike workouts for serious conditioning. Short, intense sessions that will test your limits.',
  'cardio',
  'YOUR_USER_ID_HERE',
  'Jake Morrison',
  NOW() - INTERVAL '6 days',
  'orig-prog-025',
  '{"id":"orig-prog-025","type":"cardio","weeks":[{"weekNumber":1,"sessions":[{"name":"Tabata Assault","duration":"20 minutes","intensity":"Very High"}]}]}',
  4,
  3,
  3
);

-- Summary
-- 25 total programs
-- 15 strength programs (IDs: 001-015) with proper programData structure
-- 10 cardio programs (IDs: 016-025) with simplified structure
-- All use system exercise definition ID: 00000000-0000-0000-0000-000000000000
-- This UUID should work as a placeholder, or you can replace it with actual exercise definition IDs from your database
