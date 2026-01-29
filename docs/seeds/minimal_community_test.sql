-- Minimal test seed: 2 STRENGTH programs only
-- Tests basic cloning functionality with 2-week programs and exercise notes
-- NOTE: Cardio programs are NOT supported by community programs feature yet

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
-- STRENGTH PROGRAM 1
(
  'test-strength-001',
  'Test Push Program',
  'Minimal strength program for testing cloning',
  'strength',
  'cb8e9963-4f9b-4490-9983-e914646b23b',
  'Dustin',
  NOW() - INTERVAL '1 day',
  'orig-strength-001',
  '{
    "id": "orig-strength-001",
    "name": "Test Push Program",
    "description": "Minimal strength program for testing cloning",
    "programType": "strength",
    "weeks": [
      {
        "id": "week-1",
        "weekNumber": 1,
        "workouts": [
          {
            "id": "workout-1",
            "name": "Push Day",
            "dayNumber": 1,
            "exercises": [
              {
                "id": "exercise-1",
                "name": "Arnold Press",
                "exerciseDefinitionId": "exdef_shoulders_004",
                "order": 1,
                "exerciseGroup": null,
                "notes": "Focus on controlled tempo, 2 sec up, 2 sec down",
                "prescribedSets": [
                  {
                    "setNumber": 1,
                    "reps": "8",
                    "weight": "35lbs",
                    "rpe": null,
                    "rir": 2,
                    "notes": null
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
            "id": "workout-2",
            "name": "Push Day",
            "dayNumber": 1,
            "exercises": [
              {
                "id": "exercise-2",
                "name": "Arnold Press",
                "exerciseDefinitionId": "exdef_shoulders_004",
                "order": 1,
                "exerciseGroup": null,
                "notes": "Increase weight by 5lbs if week 1 felt easy",
                "prescribedSets": [
                  {
                    "setNumber": 1,
                    "reps": "8",
                    "weight": "40lbs",
                    "rpe": null,
                    "rir": 2,
                    "notes": null
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
  2,  -- workoutCount
  2   -- exerciseCount
),
-- STRENGTH PROGRAM 2
(
  'test-strength-002',
  'Test Core Program',
  'Another minimal strength program for testing pagination',
  'strength',
  'cb8e9963-4f9b-4490-9983-e914646b23b',
  'Dustin',
  NOW(),
  'orig-strength-002',
  '{
    "id": "orig-strength-002",
    "name": "Test Core Program",
    "description": "Another minimal strength program for testing pagination",
    "programType": "strength",
    "weeks": [
      {
        "id": "week-1",
        "weekNumber": 1,
        "workouts": [
          {
            "id": "workout-1",
            "name": "Core Day",
            "dayNumber": 1,
            "exercises": [
              {
                "id": "exercise-1",
                "name": "Crunch",
                "exerciseDefinitionId": "ex_bw_023",
                "order": 1,
                "exerciseGroup": null,
                "notes": "Keep lower back pressed to floor, no jerking motion",
                "prescribedSets": [
                  {
                    "setNumber": 1,
                    "reps": "15",
                    "weight": null,
                    "rpe": 7,
                    "rir": null,
                    "notes": null
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
            "id": "workout-2",
            "name": "Core Day",
            "dayNumber": 1,
            "exercises": [
              {
                "id": "exercise-2",
                "name": "Crunch",
                "exerciseDefinitionId": "ex_bw_023",
                "order": 1,
                "exerciseGroup": null,
                "notes": "Add 2-3 second pause at top of movement",
                "prescribedSets": [
                  {
                    "setNumber": 1,
                    "reps": "20",
                    "weight": null,
                    "rpe": 7,
                    "rir": null,
                    "notes": null
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
  2,  -- workoutCount
  2   -- exerciseCount
);
