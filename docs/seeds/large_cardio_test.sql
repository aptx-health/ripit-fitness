-- Large cardio test seed: 10-week program with 50 sessions
-- Tests cardio program cloning performance with realistic variety

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
(
  'test-cardio-large-001',
  'Large Cardio Test Program',
  '10-week comprehensive cardio program for testing cloning performance',
  'cardio',
  'cb8e9963-4f9b-4490-9983-e914646b23b',
  'Dustin',
  NOW(),
  'orig-cardio-large-001',
  '{
    "id": "orig-cardio-large-001",
    "name": "Large Cardio Test Program",
    "description": "10-week comprehensive cardio program for testing cloning performance",
    "weeks": [
      {
        "id": "week-1",
        "weekNumber": 1,
        "sessions": [
          {
            "id": "session-1-1",
            "name": "Easy Run",
            "dayNumber": 1,
            "description": "Zone 2 recovery pace",
            "targetDuration": 30,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "120-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Focus on easy conversational pace"
          },
          {
            "id": "session-1-2",
            "name": "Endurance Ride",
            "dayNumber": 2,
            "description": "Long steady cycling",
            "targetDuration": 60,
            "intensityZone": "Zone 2",
            "equipment": "road_bike",
            "targetHRRange": "110-130 bpm",
            "targetPowerRange": "150-180W",
            "intervalStructure": null,
            "notes": "Maintain 85-95 RPM cadence"
          },
          {
            "id": "session-1-3",
            "name": "Interval Run",
            "dayNumber": 3,
            "description": "High intensity intervals",
            "targetDuration": 35,
            "intensityZone": "Zone 4-5",
            "equipment": "treadmill",
            "targetHRRange": "165-180 bpm",
            "targetPowerRange": null,
            "intervalStructure": "6x (3min hard, 2min easy)",
            "notes": "10min warm up, 6 intervals, 5min cool down"
          },
          {
            "id": "session-1-4",
            "name": "Recovery Row",
            "dayNumber": 4,
            "description": "Easy rowing session",
            "targetDuration": 25,
            "intensityZone": "Zone 2",
            "equipment": "rowing_machine",
            "targetHRRange": "115-135 bpm",
            "targetPowerRange": "100-120W",
            "intervalStructure": null,
            "notes": "Focus on technique and steady rhythm"
          },
          {
            "id": "session-1-5",
            "name": "Long Run",
            "dayNumber": 5,
            "description": "Extended endurance run",
            "targetDuration": 50,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "125-145 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Build aerobic base, keep effort easy"
          }
        ]
      },
      {
        "id": "week-2",
        "weekNumber": 2,
        "sessions": [
          {
            "id": "session-2-1",
            "name": "Easy Run",
            "dayNumber": 1,
            "description": "Zone 2 recovery pace",
            "targetDuration": 35,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "120-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Slight duration increase from week 1"
          },
          {
            "id": "session-2-2",
            "name": "Tempo Bike",
            "dayNumber": 2,
            "description": "Sustained threshold effort",
            "targetDuration": 45,
            "intensityZone": "Zone 3-4",
            "equipment": "indoor_bike",
            "targetHRRange": "145-160 bpm",
            "targetPowerRange": "200-230W",
            "intervalStructure": "2x (15min @ threshold, 5min easy)",
            "notes": "10min warm up, 2 tempo blocks, 5min cool down"
          },
          {
            "id": "session-2-3",
            "name": "Hill Intervals",
            "dayNumber": 3,
            "description": "Uphill repeats",
            "targetDuration": 40,
            "intensityZone": "Zone 4-5",
            "equipment": "outdoor_run",
            "targetHRRange": "160-175 bpm",
            "targetPowerRange": null,
            "intervalStructure": "8x (2min uphill, 2min jog down)",
            "notes": "Find a moderate hill, focus on effort not speed"
          },
          {
            "id": "session-2-4",
            "name": "Steady Row",
            "dayNumber": 4,
            "description": "Moderate intensity rowing",
            "targetDuration": 30,
            "intensityZone": "Zone 2",
            "equipment": "rowing_machine",
            "targetHRRange": "120-140 bpm",
            "targetPowerRange": "130-150W",
            "intervalStructure": null,
            "notes": "Maintain consistent stroke rate around 22-24 SPM"
          },
          {
            "id": "session-2-5",
            "name": "Long Run",
            "dayNumber": 5,
            "description": "Extended endurance run",
            "targetDuration": 55,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "125-145 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Continue building aerobic endurance"
          }
        ]
      },
      {
        "id": "week-3",
        "weekNumber": 3,
        "sessions": [
          {
            "id": "session-3-1",
            "name": "Recovery Run",
            "dayNumber": 1,
            "description": "Very easy pace",
            "targetDuration": 30,
            "intensityZone": "Zone 2",
            "equipment": "treadmill",
            "targetHRRange": "115-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Active recovery, keep it easy"
          },
          {
            "id": "session-3-2",
            "name": "Endurance Ride",
            "dayNumber": 2,
            "description": "Long steady cycling",
            "targetDuration": 70,
            "intensityZone": "Zone 2",
            "equipment": "road_bike",
            "targetHRRange": "110-130 bpm",
            "targetPowerRange": "155-185W",
            "intervalStructure": null,
            "notes": "Progressive volume increase"
          },
          {
            "id": "session-3-3",
            "name": "VO2 Max Intervals",
            "dayNumber": 3,
            "description": "High intensity aerobic intervals",
            "targetDuration": 40,
            "intensityZone": "Zone 4-5",
            "equipment": "outdoor_run",
            "targetHRRange": "170-185 bpm",
            "targetPowerRange": null,
            "intervalStructure": "5x (4min hard, 3min easy)",
            "notes": "Push to near max heart rate during intervals"
          },
          {
            "id": "session-3-4",
            "name": "Rowing Intervals",
            "dayNumber": 4,
            "description": "Power intervals on rower",
            "targetDuration": 35,
            "intensityZone": "Zone 4-5",
            "equipment": "rowing_machine",
            "targetHRRange": "155-175 bpm",
            "targetPowerRange": "180-220W",
            "intervalStructure": "8x (500m hard, 90sec rest)",
            "notes": "Focus on powerful strokes, full recovery between intervals"
          },
          {
            "id": "session-3-5",
            "name": "Long Run",
            "dayNumber": 5,
            "description": "Extended endurance run",
            "targetDuration": 60,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "125-145 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Hour-long run, maintain easy effort throughout"
          }
        ]
      },
      {
        "id": "week-4",
        "weekNumber": 4,
        "sessions": [
          {
            "id": "session-4-1",
            "name": "Easy Run",
            "dayNumber": 1,
            "description": "Recovery deload week",
            "targetDuration": 25,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Deload week - reduce volume"
          },
          {
            "id": "session-4-2",
            "name": "Easy Ride",
            "dayNumber": 2,
            "description": "Light cycling session",
            "targetDuration": 45,
            "intensityZone": "Zone 2",
            "equipment": "indoor_bike",
            "targetHRRange": "110-125 bpm",
            "targetPowerRange": "140-170W",
            "intervalStructure": null,
            "notes": "Recovery week - keep it very easy"
          },
          {
            "id": "session-4-3",
            "name": "Tempo Run",
            "dayNumber": 3,
            "description": "Moderate threshold effort",
            "targetDuration": 30,
            "intensityZone": "Zone 3-4",
            "equipment": "treadmill",
            "targetHRRange": "150-165 bpm",
            "targetPowerRange": null,
            "intervalStructure": "15min @ tempo pace",
            "notes": "10min warm up, 15min tempo, 5min cool down"
          },
          {
            "id": "session-4-4",
            "name": "Light Row",
            "dayNumber": 4,
            "description": "Easy recovery rowing",
            "targetDuration": 20,
            "intensityZone": "Zone 2",
            "equipment": "rowing_machine",
            "targetHRRange": "115-130 bpm",
            "targetPowerRange": "90-110W",
            "intervalStructure": null,
            "notes": "Active recovery, focus on form"
          },
          {
            "id": "session-4-5",
            "name": "Easy Long Run",
            "dayNumber": 5,
            "description": "Reduced volume long run",
            "targetDuration": 45,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "125-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Deload long run, keep effort easy"
          }
        ]
      },
      {
        "id": "week-5",
        "weekNumber": 5,
        "sessions": [
          {
            "id": "session-5-1",
            "name": "Easy Run",
            "dayNumber": 1,
            "description": "Zone 2 recovery pace",
            "targetDuration": 40,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "120-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Building back up after deload"
          },
          {
            "id": "session-5-2",
            "name": "Sweet Spot Ride",
            "dayNumber": 2,
            "description": "Upper Zone 3 cycling",
            "targetDuration": 60,
            "intensityZone": "Zone 3-4",
            "equipment": "road_bike",
            "targetHRRange": "140-155 bpm",
            "targetPowerRange": "210-240W",
            "intervalStructure": "3x (12min @ sweet spot, 4min easy)",
            "notes": "Challenging but sustainable pace"
          },
          {
            "id": "session-5-3",
            "name": "Track Intervals",
            "dayNumber": 3,
            "description": "Speed development",
            "targetDuration": 45,
            "intensityZone": "Zone 4-5",
            "equipment": "outdoor_run",
            "targetHRRange": "165-180 bpm",
            "targetPowerRange": null,
            "intervalStructure": "10x (400m fast, 200m jog)",
            "notes": "10min warm up, intervals, 10min cool down"
          },
          {
            "id": "session-5-4",
            "name": "Steady State Row",
            "dayNumber": 4,
            "description": "Sustained rowing effort",
            "targetDuration": 35,
            "intensityZone": "Zone 3-4",
            "equipment": "rowing_machine",
            "targetHRRange": "140-155 bpm",
            "targetPowerRange": "160-185W",
            "intervalStructure": "3x (8min @ steady, 3min easy)",
            "notes": "Maintain consistent split times"
          },
          {
            "id": "session-5-5",
            "name": "Long Run",
            "dayNumber": 5,
            "description": "Extended endurance run",
            "targetDuration": 65,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "125-145 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Longest run so far, keep pace comfortable"
          }
        ]
      },
      {
        "id": "week-6",
        "weekNumber": 6,
        "sessions": [
          {
            "id": "session-6-1",
            "name": "Easy Run",
            "dayNumber": 1,
            "description": "Zone 2 recovery pace",
            "targetDuration": 40,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "120-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Easy day after long run"
          },
          {
            "id": "session-6-2",
            "name": "Endurance Ride",
            "dayNumber": 2,
            "description": "Long steady cycling",
            "targetDuration": 75,
            "intensityZone": "Zone 2",
            "equipment": "road_bike",
            "targetHRRange": "110-130 bpm",
            "targetPowerRange": "160-190W",
            "intervalStructure": null,
            "notes": "Building cycling endurance"
          },
          {
            "id": "session-6-3",
            "name": "Threshold Intervals",
            "dayNumber": 3,
            "description": "Lactate threshold work",
            "targetDuration": 50,
            "intensityZone": "Zone 4-5",
            "equipment": "treadmill",
            "targetHRRange": "160-175 bpm",
            "targetPowerRange": null,
            "intervalStructure": "4x (6min @ threshold, 3min jog)",
            "notes": "10min warm up, intervals, 10min cool down"
          },
          {
            "id": "session-6-4",
            "name": "Rowing Pyramid",
            "dayNumber": 4,
            "description": "Pyramid interval structure",
            "targetDuration": 40,
            "intensityZone": "Zone 3-4",
            "equipment": "rowing_machine",
            "targetHRRange": "145-165 bpm",
            "targetPowerRange": "170-200W",
            "intervalStructure": "3min, 5min, 7min, 5min, 3min (2min rest between)",
            "notes": "Increase then decrease interval length"
          },
          {
            "id": "session-6-5",
            "name": "Long Run",
            "dayNumber": 5,
            "description": "Extended endurance run",
            "targetDuration": 70,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "125-145 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Progressive long run volume"
          }
        ]
      },
      {
        "id": "week-7",
        "weekNumber": 7,
        "sessions": [
          {
            "id": "session-7-1",
            "name": "Recovery Run",
            "dayNumber": 1,
            "description": "Very easy pace",
            "targetDuration": 35,
            "intensityZone": "Zone 2",
            "equipment": "treadmill",
            "targetHRRange": "115-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Active recovery session"
          },
          {
            "id": "session-7-2",
            "name": "Hill Repeats Bike",
            "dayNumber": 2,
            "description": "Climbing intervals",
            "targetDuration": 55,
            "intensityZone": "Zone 4-5",
            "equipment": "road_bike",
            "targetHRRange": "155-175 bpm",
            "targetPowerRange": "230-270W",
            "intervalStructure": "6x (5min climb, 3min easy spin)",
            "notes": "Find a sustained climb or use indoor bike resistance"
          },
          {
            "id": "session-7-3",
            "name": "Fartlek Run",
            "dayNumber": 3,
            "description": "Unstructured speed play",
            "targetDuration": 45,
            "intensityZone": "Zone 3-4",
            "equipment": "outdoor_run",
            "targetHRRange": "145-170 bpm",
            "targetPowerRange": null,
            "intervalStructure": "Variable efforts throughout run",
            "notes": "Mix of easy running with spontaneous surges"
          },
          {
            "id": "session-7-4",
            "name": "Steady Row",
            "dayNumber": 4,
            "description": "Continuous rowing effort",
            "targetDuration": 40,
            "intensityZone": "Zone 2",
            "equipment": "rowing_machine",
            "targetHRRange": "125-145 bpm",
            "targetPowerRange": "140-165W",
            "intervalStructure": null,
            "notes": "Steady continuous effort, focus on consistency"
          },
          {
            "id": "session-7-5",
            "name": "Long Run",
            "dayNumber": 5,
            "description": "Extended endurance run",
            "targetDuration": 75,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "125-145 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Building towards 90min long run"
          }
        ]
      },
      {
        "id": "week-8",
        "weekNumber": 8,
        "sessions": [
          {
            "id": "session-8-1",
            "name": "Easy Run",
            "dayNumber": 1,
            "description": "Recovery deload week",
            "targetDuration": 30,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Second deload week"
          },
          {
            "id": "session-8-2",
            "name": "Easy Ride",
            "dayNumber": 2,
            "description": "Light cycling session",
            "targetDuration": 50,
            "intensityZone": "Zone 2",
            "equipment": "indoor_bike",
            "targetHRRange": "110-125 bpm",
            "targetPowerRange": "145-175W",
            "intervalStructure": null,
            "notes": "Easy spin, allow body to recover"
          },
          {
            "id": "session-8-3",
            "name": "Tempo Run",
            "dayNumber": 3,
            "description": "Moderate threshold effort",
            "targetDuration": 35,
            "intensityZone": "Zone 3-4",
            "equipment": "treadmill",
            "targetHRRange": "150-165 bpm",
            "targetPowerRange": null,
            "intervalStructure": "20min @ tempo pace",
            "notes": "10min warm up, 20min tempo, 5min cool down"
          },
          {
            "id": "session-8-4",
            "name": "Light Row",
            "dayNumber": 4,
            "description": "Easy recovery rowing",
            "targetDuration": 25,
            "intensityZone": "Zone 2",
            "equipment": "rowing_machine",
            "targetHRRange": "115-130 bpm",
            "targetPowerRange": "95-115W",
            "intervalStructure": null,
            "notes": "Deload rowing session"
          },
          {
            "id": "session-8-5",
            "name": "Easy Long Run",
            "dayNumber": 5,
            "description": "Reduced volume long run",
            "targetDuration": 55,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "125-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Deload long run, recovery week"
          }
        ]
      },
      {
        "id": "week-9",
        "weekNumber": 9,
        "sessions": [
          {
            "id": "session-9-1",
            "name": "Easy Run",
            "dayNumber": 1,
            "description": "Zone 2 recovery pace",
            "targetDuration": 45,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "120-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Peak block begins"
          },
          {
            "id": "session-9-2",
            "name": "Endurance Ride",
            "dayNumber": 2,
            "description": "Long steady cycling",
            "targetDuration": 80,
            "intensityZone": "Zone 2",
            "equipment": "road_bike",
            "targetHRRange": "110-130 bpm",
            "targetPowerRange": "165-195W",
            "intervalStructure": null,
            "notes": "Longest ride of the program"
          },
          {
            "id": "session-9-3",
            "name": "VO2 Max Intervals",
            "dayNumber": 3,
            "description": "High intensity aerobic intervals",
            "targetDuration": 50,
            "intensityZone": "Zone 4-5",
            "equipment": "outdoor_run",
            "targetHRRange": "170-185 bpm",
            "targetPowerRange": null,
            "intervalStructure": "6x (5min hard, 3min easy)",
            "notes": "10min warm up, intervals, 10min cool down"
          },
          {
            "id": "session-9-4",
            "name": "Power Intervals Row",
            "dayNumber": 4,
            "description": "Max power rowing",
            "targetDuration": 40,
            "intensityZone": "Zone 4-5",
            "equipment": "rowing_machine",
            "targetHRRange": "160-180 bpm",
            "targetPowerRange": "200-250W",
            "intervalStructure": "10x (250m sprint, 2min rest)",
            "notes": "All-out effort on intervals, full recovery"
          },
          {
            "id": "session-9-5",
            "name": "Long Run",
            "dayNumber": 5,
            "description": "Peak long run",
            "targetDuration": 85,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "125-145 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Near-peak volume, maintain easy effort"
          }
        ]
      },
      {
        "id": "week-10",
        "weekNumber": 10,
        "sessions": [
          {
            "id": "session-10-1",
            "name": "Easy Run",
            "dayNumber": 1,
            "description": "Zone 2 recovery pace",
            "targetDuration": 45,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "120-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Final week peak volume"
          },
          {
            "id": "session-10-2",
            "name": "Tempo Ride",
            "dayNumber": 2,
            "description": "Sustained threshold cycling",
            "targetDuration": 65,
            "intensityZone": "Zone 3-4",
            "equipment": "indoor_bike",
            "targetHRRange": "145-160 bpm",
            "targetPowerRange": "215-245W",
            "intervalStructure": "3x (15min @ threshold, 5min easy)",
            "notes": "Final hard cycling session"
          },
          {
            "id": "session-10-3",
            "name": "Mixed Intervals",
            "dayNumber": 3,
            "description": "Varied pace intervals",
            "targetDuration": 50,
            "intensityZone": "Zone 4-5",
            "equipment": "treadmill",
            "targetHRRange": "165-180 bpm",
            "targetPowerRange": null,
            "intervalStructure": "2x (1min sprint, 2min jog, 3min tempo, 3min jog)",
            "notes": "Mix of speeds to challenge all systems"
          },
          {
            "id": "session-10-4",
            "name": "Steady State Row",
            "dayNumber": 4,
            "description": "Final rowing session",
            "targetDuration": 45,
            "intensityZone": "Zone 3-4",
            "equipment": "rowing_machine",
            "targetHRRange": "140-160 bpm",
            "targetPowerRange": "165-190W",
            "intervalStructure": "2x (15min @ steady, 5min easy)",
            "notes": "Finish strong with consistent effort"
          },
          {
            "id": "session-10-5",
            "name": "Peak Long Run",
            "dayNumber": 5,
            "description": "Final long run",
            "targetDuration": 90,
            "intensityZone": "Zone 2",
            "equipment": "outdoor_run",
            "targetHRRange": "125-145 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Peak long run - 90 minutes at easy pace"
          }
        ]
      }
    ]
  }',
  10,  -- weekCount
  50,  -- workoutCount (sessions)
  0    -- exerciseCount (cardio has no exercises)
);
