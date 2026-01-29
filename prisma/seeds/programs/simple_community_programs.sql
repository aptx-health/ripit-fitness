-- Simple Community Program Seeds
-- 2 programs: 1 strength, 1 cardio
-- Uses actual exercise IDs from local database
-- Run with: doppler run --config dev_personal -- bash -c 'psql $DATABASE_URL -f prisma/seeds/programs/simple_community_programs.sql'

INSERT INTO "CommunityProgram" (
  id,
  name,
  description,
  "programType",
  "authorUserId",
  "displayName",
  "publishedAt",
  "originalProgramId",
  "programData",
  "weekCount",
  "workoutCount",
  "exerciseCount"
) VALUES
-- STRENGTH PROGRAM
(
  'simple-strength-001',
  'Simple Full Body Program',
  'A simple 2-week full body strength program for testing clone functionality',
  'strength',
  'cb8e9963-4f9b-4490-9983-e914646b23b',
  'Test User',
  NOW() - INTERVAL '1 day',
  'orig-simple-001',
  '{
    "id": "orig-simple-001",
    "name": "Simple Full Body Program",
    "description": "A simple 2-week full body strength program",
    "programType": "strength",
    "weeks": [
      {
        "id": "week-1",
        "weekNumber": 1,
        "workouts": [
          {
            "id": "workout-1",
            "name": "Full Body A",
            "dayNumber": 1,
            "exercises": [
              {
                "id": "exercise-1",
                "name": "Dumbbell Deadlift",
                "exerciseDefinitionId": "ex_db_013",
                "order": 1,
                "exerciseGroup": null,
                "notes": "Keep back straight, hinge at hips",
                "prescribedSets": [
                  {
                    "setNumber": 1,
                    "reps": "8",
                    "weight": "40lbs",
                    "rpe": 7,
                    "rir": null,
                    "notes": null
                  },
                  {
                    "setNumber": 2,
                    "reps": "8",
                    "weight": "40lbs",
                    "rpe": 7,
                    "rir": null,
                    "notes": null
                  },
                  {
                    "setNumber": 3,
                    "reps": "8",
                    "weight": "40lbs",
                    "rpe": 8,
                    "rir": null,
                    "notes": null
                  }
                ]
              },
              {
                "id": "exercise-2",
                "name": "Arnold Press",
                "exerciseDefinitionId": "ex_db_007",
                "order": 2,
                "exerciseGroup": null,
                "notes": "Full rotation on each rep",
                "prescribedSets": [
                  {
                    "setNumber": 1,
                    "reps": "10",
                    "weight": "25lbs",
                    "rpe": 7,
                    "rir": null,
                    "notes": null
                  },
                  {
                    "setNumber": 2,
                    "reps": "10",
                    "weight": "25lbs",
                    "rpe": 8,
                    "rir": null,
                    "notes": null
                  }
                ]
              },
              {
                "id": "exercise-3",
                "name": "Cable Row",
                "exerciseDefinitionId": "cmiz7vmmg000ivr0mojncaj84",
                "order": 3,
                "exerciseGroup": null,
                "notes": "Pull to sternum, squeeze shoulder blades",
                "prescribedSets": [
                  {
                    "setNumber": 1,
                    "reps": "12",
                    "weight": "100lbs",
                    "rpe": 7,
                    "rir": null,
                    "notes": null
                  },
                  {
                    "setNumber": 2,
                    "reps": "12",
                    "weight": "100lbs",
                    "rpe": 8,
                    "rir": null,
                    "notes": null
                  }
                ]
              }
            ]
          },
          {
            "id": "workout-2",
            "name": "Full Body B",
            "dayNumber": 3,
            "exercises": [
              {
                "id": "exercise-4",
                "name": "Crunch",
                "exerciseDefinitionId": "ex_bw_023",
                "order": 1,
                "exerciseGroup": null,
                "notes": "Lower back stays on floor",
                "prescribedSets": [
                  {
                    "setNumber": 1,
                    "reps": "15",
                    "weight": null,
                    "rpe": 6,
                    "rir": null,
                    "notes": null
                  },
                  {
                    "setNumber": 2,
                    "reps": "15",
                    "weight": null,
                    "rpe": 7,
                    "rir": null,
                    "notes": null
                  }
                ]
              },
              {
                "id": "exercise-5",
                "name": "Plank",
                "exerciseDefinitionId": "cmiz7vnjj000nvr0mgfa1vmx1",
                "order": 2,
                "exerciseGroup": null,
                "notes": "Hold for 30-60 seconds",
                "prescribedSets": [
                  {
                    "setNumber": 1,
                    "reps": "1",
                    "weight": null,
                    "rpe": 7,
                    "rir": null,
                    "notes": "30 seconds"
                  },
                  {
                    "setNumber": 2,
                    "reps": "1",
                    "weight": null,
                    "rpe": 8,
                    "rir": null,
                    "notes": "45 seconds"
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "week-2",
        "weekNumber": 2,
        "workouts": [
          {
            "id": "workout-3",
            "name": "Full Body A",
            "dayNumber": 1,
            "exercises": [
              {
                "id": "exercise-6",
                "name": "Dumbbell Deadlift",
                "exerciseDefinitionId": "ex_db_013",
                "order": 1,
                "exerciseGroup": null,
                "notes": "Increase weight from week 1",
                "prescribedSets": [
                  {
                    "setNumber": 1,
                    "reps": "8",
                    "weight": "45lbs",
                    "rpe": 7,
                    "rir": null,
                    "notes": null
                  },
                  {
                    "setNumber": 2,
                    "reps": "8",
                    "weight": "45lbs",
                    "rpe": 8,
                    "rir": null,
                    "notes": null
                  },
                  {
                    "setNumber": 3,
                    "reps": "8",
                    "weight": "45lbs",
                    "rpe": 8,
                    "rir": null,
                    "notes": null
                  }
                ]
              },
              {
                "id": "exercise-7",
                "name": "Arnold Press",
                "exerciseDefinitionId": "ex_db_007",
                "order": 2,
                "exerciseGroup": null,
                "notes": "Increase weight if week 1 felt easy",
                "prescribedSets": [
                  {
                    "setNumber": 1,
                    "reps": "10",
                    "weight": "30lbs",
                    "rpe": 7,
                    "rir": null,
                    "notes": null
                  },
                  {
                    "setNumber": 2,
                    "reps": "10",
                    "weight": "30lbs",
                    "rpe": 8,
                    "rir": null,
                    "notes": null
                  }
                ]
              },
              {
                "id": "exercise-8",
                "name": "Cable Row",
                "exerciseDefinitionId": "cmiz7vmmg000ivr0mojncaj84",
                "order": 3,
                "exerciseGroup": null,
                "notes": "Focus on slow eccentric",
                "prescribedSets": [
                  {
                    "setNumber": 1,
                    "reps": "12",
                    "weight": "110lbs",
                    "rpe": 7,
                    "rir": null,
                    "notes": null
                  },
                  {
                    "setNumber": 2,
                    "reps": "12",
                    "weight": "110lbs",
                    "rpe": 8,
                    "rir": null,
                    "notes": null
                  }
                ]
              }
            ]
          },
          {
            "id": "workout-4",
            "name": "Full Body B",
            "dayNumber": 3,
            "exercises": [
              {
                "id": "exercise-9",
                "name": "Crunch",
                "exerciseDefinitionId": "ex_bw_023",
                "order": 1,
                "exerciseGroup": null,
                "notes": "Add 2 second pause at top",
                "prescribedSets": [
                  {
                    "setNumber": 1,
                    "reps": "20",
                    "weight": null,
                    "rpe": 7,
                    "rir": null,
                    "notes": null
                  },
                  {
                    "setNumber": 2,
                    "reps": "20",
                    "weight": null,
                    "rpe": 8,
                    "rir": null,
                    "notes": null
                  }
                ]
              },
              {
                "id": "exercise-10",
                "name": "Plank",
                "exerciseDefinitionId": "cmiz7vnjj000nvr0mgfa1vmx1",
                "order": 2,
                "exerciseGroup": null,
                "notes": "Increase hold time",
                "prescribedSets": [
                  {
                    "setNumber": 1,
                    "reps": "1",
                    "weight": null,
                    "rpe": 7,
                    "rir": null,
                    "notes": "45 seconds"
                  },
                  {
                    "setNumber": 2,
                    "reps": "1",
                    "weight": null,
                    "rpe": 8,
                    "rir": null,
                    "notes": "60 seconds"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }',
  2,  -- weekCount
  4,  -- workoutCount (2 workouts per week x 2 weeks)
  10  -- exerciseCount (5 exercises per week x 2 weeks)
),
-- CARDIO PROGRAM
(
  'simple-cardio-001',
  'Simple Running Program',
  'A simple 2-week running program for testing cardio cloning',
  'cardio',
  'cb8e9963-4f9b-4490-9983-e914646b23b',
  'Test User',
  NOW(),
  'orig-simple-cardio-001',
  '{
    "id": "orig-simple-cardio-001",
    "name": "Simple Running Program",
    "description": "A simple 2-week running program",
    "programType": "cardio",
    "weeks": [
      {
        "id": "week-1",
        "weekNumber": 1,
        "sessions": [
          {
            "dayNumber": 1,
            "name": "Easy Run",
            "description": "Recovery pace run",
            "targetDuration": 30,
            "intensityZone": "Zone 2",
            "equipment": "None",
            "targetHRRange": "120-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Keep effort conversational"
          },
          {
            "dayNumber": 3,
            "name": "Tempo Run",
            "description": "Sustained moderate effort",
            "targetDuration": 40,
            "intensityZone": "Zone 3-4",
            "equipment": "None",
            "targetHRRange": "150-165 bpm",
            "targetPowerRange": null,
            "intervalStructure": "10min warmup + 20min tempo + 10min cooldown",
            "notes": "Comfortably hard pace"
          },
          {
            "dayNumber": 6,
            "name": "Long Run",
            "description": "Aerobic endurance builder",
            "targetDuration": 60,
            "intensityZone": "Zone 2",
            "equipment": "None",
            "targetHRRange": "125-145 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Stay in easy zone throughout"
          }
        ]
      },
      {
        "id": "week-2",
        "weekNumber": 2,
        "sessions": [
          {
            "dayNumber": 1,
            "name": "Easy Run",
            "description": "Recovery pace run",
            "targetDuration": 35,
            "intensityZone": "Zone 2",
            "equipment": "None",
            "targetHRRange": "120-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "5 minute increase from week 1"
          },
          {
            "dayNumber": 3,
            "name": "Interval Run",
            "description": "High intensity intervals",
            "targetDuration": 45,
            "intensityZone": "Zone 4-5",
            "equipment": "None",
            "targetHRRange": "165-180 bpm",
            "targetPowerRange": null,
            "intervalStructure": "10min warmup + 6x(3min hard, 2min easy) + 5min cooldown",
            "notes": "Hard efforts should be 85-90% max effort"
          },
          {
            "dayNumber": 6,
            "name": "Long Run",
            "description": "Aerobic endurance builder",
            "targetDuration": 70,
            "intensityZone": "Zone 2",
            "equipment": "None",
            "targetHRRange": "125-145 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "10 minute increase from week 1"
          }
        ]
      }
    ]
  }',
  2,  -- weekCount
  6,  -- workoutCount (3 sessions per week x 2 weeks)
  0   -- exerciseCount (cardio has no exercises)
)
ON CONFLICT (id) DO NOTHING;
