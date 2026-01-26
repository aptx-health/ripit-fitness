-- Seed data for CommunityProgram table
-- 25 programs: 15 strength, 10 cardio
-- Run this in Supabase SQL Editor

-- Note: Replace 'YOUR_USER_ID_HERE' with an actual user ID from your auth.users table
-- Or use multiple different user IDs to simulate different authors

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
  '{"weeks": [{"workouts": [{"name": "Push Day", "exercises": ["Bench Press", "Overhead Press", "Tricep Dips"]}, {"name": "Pull Day", "exercises": ["Deadlift", "Pull-ups", "Barbell Rows"]}, {"name": "Leg Day", "exercises": ["Squat", "Leg Press", "Leg Curls"]}]}]}',
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
  '{"weeks": [{"workouts": [{"name": "Workout A", "exercises": ["Squat", "Bench Press", "Deadlift"]}, {"name": "Workout B", "exercises": ["Squat", "Overhead Press", "Power Clean"]}]}]}',
  12,
  2,
  6
),
(
  'comm-prog-003',
  'Upper Lower 4 Day Split',
  'Efficient 4-day split hitting each muscle group twice per week. Great for intermediate lifters wanting to increase training frequency.',
  'strength',
  'YOUR_USER_ID_HERE',
  'Alex Chen',
  NOW() - INTERVAL '8 days',
  'orig-prog-003',
  '{"weeks": [{"workouts": [{"name": "Upper Power", "exercises": ["Bench Press", "Bent Over Row", "Overhead Press", "Chin-ups"]}, {"name": "Lower Power", "exercises": ["Squat", "Romanian Deadlift", "Leg Press", "Calf Raises"]}, {"name": "Upper Hypertrophy", "exercises": ["Incline Dumbbell Press", "Cable Row", "Lateral Raises", "Bicep Curls"]}, {"name": "Lower Hypertrophy", "exercises": ["Front Squat", "Leg Curl", "Bulgarian Split Squat", "Leg Extensions"]}]}]}',
  1,
  4,
  16
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
  '{"weeks": [{"workouts": [{"name": "Squat Day", "exercises": ["Competition Squat", "Pause Squat", "Front Squat"]}, {"name": "Bench Day", "exercises": ["Competition Bench", "Close Grip Bench", "Incline Press"]}, {"name": "Deadlift Day", "exercises": ["Competition Deadlift", "Deficit Deadlift", "Block Pulls"]}]}]}',
  8,
  3,
  9
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
  '{"weeks": [{"workouts": [{"name": "Upper Body Push", "exercises": ["Push-ups", "Pike Push-ups", "Diamond Push-ups"]}, {"name": "Upper Body Pull", "exercises": ["Pull-ups", "Inverted Rows", "Chin-ups"]}, {"name": "Lower Body", "exercises": ["Pistol Squats", "Bulgarian Split Squats", "Jump Squats"]}]}]}',
  1,
  3,
  9
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
  '{"weeks": [{"workouts": [{"name": "Snatch Day", "exercises": ["Power Snatch", "Overhead Squat", "Snatch Pull"]}, {"name": "Clean Day", "exercises": ["Power Clean", "Front Squat", "Clean Pull"]}, {"name": "Jerk Day", "exercises": ["Push Jerk", "Split Jerk", "Overhead Press"]}]}]}',
  4,
  3,
  9
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
  '{"weeks": [{"workouts": [{"name": "Workout A", "exercises": ["Squat", "Bench Press", "Barbell Row", "Face Pulls"]}, {"name": "Workout B", "exercises": ["Squat", "Overhead Press", "Deadlift", "Lat Pulldown"]}]}]}',
  1,
  2,
  8
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
  '{"weeks": [{"workouts": [{"name": "Arm Day 1", "exercises": ["Barbell Curl", "Skull Crushers", "Hammer Curl", "Cable Pushdowns"]}, {"name": "Arm Day 2", "exercises": ["Preacher Curl", "Overhead Extension", "Concentration Curl", "Close Grip Bench"]}]}]}',
  4,
  2,
  8
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
  '{"weeks": [{"workouts": [{"name": "Monday WOD", "exercises": ["Squat Clean", "Muscle-ups", "Box Jumps"]}, {"name": "Wednesday WOD", "exercises": ["Deadlift", "Handstand Push-ups", "Kettlebell Swings"]}, {"name": "Friday WOD", "exercises": ["Front Squat", "Pull-ups", "Wall Balls"]}]}]}',
  1,
  3,
  9
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
  '{"weeks": [{"workouts": [{"name": "Back Width", "exercises": ["Lat Pulldown", "Wide Grip Rows", "Straight Arm Pushdown", "Cable Curl"]}, {"name": "Back Thickness", "exercises": ["Deadlift", "T-Bar Row", "Shrugs", "Barbell Curl"]}]}]}',
  1,
  2,
  8
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
  '{"weeks": [{"workouts": [{"name": "Chest Focus", "exercises": ["Barbell Bench Press", "Incline Dumbbell Press", "Cable Flys", "Push-ups"]}, {"name": "Shoulder Focus", "exercises": ["Overhead Press", "Lateral Raises", "Face Pulls", "Arnold Press"]}]}]}',
  1,
  2,
  8
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
  '{"weeks": [{"workouts": [{"name": "Quad Focus", "exercises": ["Back Squat", "Leg Press", "Leg Extension", "Walking Lunges"]}, {"name": "Hamstring Focus", "exercises": ["Romanian Deadlift", "Leg Curl", "Glute Ham Raise", "Hip Thrust"]}]}]}',
  1,
  2,
  8
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
  '{"weeks": [{"workouts": [{"name": "Workout A", "exercises": ["Squat", "Bench Press", "Pull-ups", "Plank"]}, {"name": "Workout B", "exercises": ["Deadlift", "Overhead Press", "Barbell Row", "Hanging Leg Raise"]}, {"name": "Workout C", "exercises": ["Front Squat", "Dumbbell Bench", "Lat Pulldown", "Ab Wheel"]}]}]}',
  1,
  3,
  12
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
  '{"weeks": [{"workouts": [{"name": "Lower Power", "exercises": ["Squat", "Romanian Deadlift", "Leg Press"]}, {"name": "Upper Power", "exercises": ["Bench Press", "Barbell Row", "Overhead Press"]}, {"name": "Lower Hypertrophy", "exercises": ["Leg Extensions", "Leg Curls", "Bulgarian Split Squat"]}, {"name": "Upper Hypertrophy", "exercises": ["Incline Press", "Cable Row", "Lateral Raises"]}]}]}',
  1,
  4,
  12
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
  '{"weeks": [{"workouts": [{"name": "Upper Body", "exercises": ["Push-ups", "Pull-ups", "Dumbbell Press", "Inverted Rows", "Dips"]}, {"name": "Lower Body", "exercises": ["Goblet Squat", "Step-ups", "Lunges", "Calf Raises", "Glute Bridges"]}]}]}',
  1,
  2,
  10
);

-- CARDIO PROGRAMS (10)

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
  '{"weeks": [{"sessions": [{"name": "Walk/Run Intervals", "duration": "30 minutes", "intensity": "Easy"}, {"name": "Walk/Run Intervals", "duration": "30 minutes", "intensity": "Easy"}, {"name": "Walk/Run Intervals", "duration": "35 minutes", "intensity": "Easy"}]}]}',
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
  '{"weeks": [{"sessions": [{"name": "Tabata Sprints", "duration": "20 minutes", "intensity": "Very High"}, {"name": "Burpee Intervals", "duration": "15 minutes", "intensity": "Very High"}, {"name": "Mountain Climber HIIT", "duration": "20 minutes", "intensity": "High"}]}]}',
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
  '{"weeks": [{"sessions": [{"name": "Easy Run", "duration": "45 minutes", "intensity": "Easy"}, {"name": "Tempo Run", "duration": "60 minutes", "intensity": "Moderate"}, {"name": "Long Run", "duration": "90 minutes", "intensity": "Easy"}]}]}',
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
  '{"weeks": [{"sessions": [{"name": "Easy Ride", "duration": "60 minutes", "intensity": "Easy"}, {"name": "Moderate Ride", "duration": "75 minutes", "intensity": "Moderate"}, {"name": "Long Ride", "duration": "120 minutes", "intensity": "Easy"}]}]}',
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
  '{"weeks": [{"sessions": [{"name": "Steady State Row", "duration": "30 minutes", "intensity": "Moderate"}, {"name": "500m Intervals", "duration": "25 minutes", "intensity": "High"}, {"name": "Pyramid Intervals", "duration": "35 minutes", "intensity": "Varied"}]}]}',
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
  '{"weeks": [{"sessions": [{"name": "Freestyle Endurance", "duration": "45 minutes", "intensity": "Moderate"}, {"name": "Mixed Stroke Intervals", "duration": "40 minutes", "intensity": "High"}, {"name": "Easy Recovery Swim", "duration": "30 minutes", "intensity": "Easy"}]}]}',
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
  '{"weeks": [{"sessions": [{"name": "Basic Jump Intervals", "duration": "20 minutes", "intensity": "Moderate"}, {"name": "Double Under Practice", "duration": "15 minutes", "intensity": "High"}, {"name": "Endurance Jumping", "duration": "25 minutes", "intensity": "Moderate"}]}]}',
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
  '{"weeks": [{"sessions": [{"name": "Steady Climb", "duration": "30 minutes", "intensity": "Moderate"}, {"name": "Sprint Intervals", "duration": "20 minutes", "intensity": "Very High"}, {"name": "Long Climb", "duration": "45 minutes", "intensity": "Easy"}]}]}',
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
  '{"weeks": [{"sessions": [{"name": "Steady State", "duration": "35 minutes", "intensity": "Moderate"}, {"name": "Hill Intervals", "duration": "30 minutes", "intensity": "High"}, {"name": "Recovery Session", "duration": "25 minutes", "intensity": "Easy"}]}]}',
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
  '{"weeks": [{"sessions": [{"name": "Tabata Assault", "duration": "20 minutes", "intensity": "Very High"}, {"name": "EMOM Sprints", "duration": "15 minutes", "intensity": "Very High"}, {"name": "Steady State Recovery", "duration": "30 minutes", "intensity": "Easy"}]}]}',
  4,
  3,
  3
);

-- Summary
-- 25 total programs
-- 15 strength programs (IDs: 001-015)
-- 10 cardio programs (IDs: 016-025)
-- Published dates spread across last 22 days
-- Various authors (display names)
-- All have descriptions
-- Simple but varied week/workout/exercise counts
