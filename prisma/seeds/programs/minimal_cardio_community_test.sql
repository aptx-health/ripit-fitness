-- Minimal cardio test seed: 2 cardio programs
-- Tests cardio program publishing and cloning functionality

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
-- CARDIO PROGRAM 1: Running Program
(
  'test-cardio-001',
  'Test Running Program',
  'Simple 2-week progressive running program',
  'cardio',
  'cb8e9963-4f9b-4490-9983-e914646b23b',
  'Dustin',
  NOW() - INTERVAL '1 day',
  'orig-cardio-001',
  '{
    "id": "orig-cardio-001",
    "name": "Test Running Program",
    "description": "Simple 2-week progressive running program",
    "weeks": [
      {
        "id": "week-1",
        "weekNumber": 1,
        "sessions": [
          {
            "id": "session-1",
            "name": "Easy Run",
            "dayNumber": 1,
            "description": "Zone 2 easy pace",
            "targetDuration": 30,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "120-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Focus on keeping heart rate low and comfortable"
          },
          {
            "id": "session-2",
            "name": "Interval Training",
            "dayNumber": 3,
            "description": "High intensity intervals",
            "targetDuration": 25,
            "intensityZone": "Zone 4-5",
            "equipment": "outdoor_run",
            "targetHRRange": "160-180 bpm",
            "targetPowerRange": null,
            "intervalStructure": "5x (3min hard, 2min easy)",
            "notes": "Warm up 5min, cool down 5min"
          }
        ]
      },
      {
        "id": "week-2",
        "weekNumber": 2,
        "sessions": [
          {
            "id": "session-3",
            "name": "Easy Run",
            "dayNumber": 1,
            "description": "Zone 2 easy pace",
            "targetDuration": 35,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "120-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Increase duration by 5 minutes from week 1"
          },
          {
            "id": "session-4",
            "name": "Tempo Run",
            "dayNumber": 3,
            "description": "Sustained threshold effort",
            "targetDuration": 30,
            "intensityZone": "Zone 3-4",
            "equipment": "outdoor_run",
            "targetHRRange": "150-170 bpm",
            "targetPowerRange": null,
            "intervalStructure": "20min @ tempo pace",
            "notes": "Warm up 5min, tempo 20min, cool down 5min"
          }
        ]
      }
    ]
  }',
  2,  -- weekCount
  4,  -- workoutCount (sessions)
  0   -- exerciseCount (cardio has no exercises)
),
-- CARDIO PROGRAM 2: Cycling Program
(
  'test-cardio-002',
  'Test Cycling Program',
  'Base building cycling program',
  'cardio',
  'cb8e9963-4f9b-4490-9983-e914646b23b',
  'Dustin',
  NOW(),
  'orig-cardio-002',
  '{
    "id": "orig-cardio-002",
    "name": "Test Cycling Program",
    "description": "Base building cycling program",
    "weeks": [
      {
        "id": "week-1",
        "weekNumber": 1,
        "sessions": [
          {
            "id": "session-1",
            "name": "Endurance Ride",
            "dayNumber": 1,
            "description": "Long steady ride",
            "targetDuration": 60,
            "intensityZone": "Zone 2",
            "equipment": "road_bike",
            "targetHRRange": "110-130 bpm",
            "targetPowerRange": "150-180W",
            "intervalStructure": null,
            "notes": "Keep cadence 85-95 RPM"
          }
        ]
      },
      {
        "id": "week-2",
        "weekNumber": 2,
        "sessions": [
          {
            "id": "session-2",
            "name": "Endurance Ride",
            "dayNumber": 1,
            "description": "Long steady ride",
            "targetDuration": 70,
            "intensityZone": "Zone 2",
            "equipment": "road_bike",
            "targetHRRange": "110-130 bpm",
            "targetPowerRange": "150-180W",
            "intervalStructure": null,
            "notes": "Increase duration, maintain same intensity"
          }
        ]
      }
    ]
  }',
  2,  -- weekCount
  2,  -- workoutCount (sessions)
  0   -- exerciseCount (cardio has no exercises)
);
