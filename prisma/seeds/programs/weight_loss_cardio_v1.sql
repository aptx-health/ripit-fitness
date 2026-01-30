-- Weight Loss Cardio v1 - 12 Week Progressive Cardio Program
-- Designed to complement strength training during a cut
-- Progresses from Zone 2 foundation to HIIT + endurance
-- Run with: doppler run --config dev_personal -- bash -c 'psql $DATABASE_URL -f prisma/seeds/programs/weight_loss_cardio_v1.sql'

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
  'weight-loss-cardio-v1',
  'Weight Loss Cardio v1',
  'A 12-week progressive cardio program designed to complement strength training during a caloric deficit. Starts with Zone 2 incline walking and progresses to include HIIT cycling. Based on research showing cycling causes less interference with strength gains than running, and Zone 2 cardio minimizes the interference effect.',
  'cardio',
  'cb8e9963-4f9b-4490-9983-e914646b23b',
  'Ripit Fitness',
  NOW(),
  'orig-weight-loss-cardio-v1',
  '{
    "id": "orig-weight-loss-cardio-v1",
    "name": "Weight Loss Cardio v1",
    "description": "12-week progressive cardio - Zone 2 to HIIT progression",
    "programType": "cardio",
    "weeks": [
      {
        "id": "wlc-week-1",
        "weekNumber": 1,
        "sessions": [
          {
            "dayNumber": 3,
            "name": "Incline Walk 1",
            "description": "Steep treadmill walk - foundation building",
            "targetDuration": 25,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "10-12% incline, 3.0-3.5 mph. Should be able to hold conversation. Focus on posture."
          },
          {
            "dayNumber": 6,
            "name": "Incline Walk 2",
            "description": "Steep treadmill walk - endurance",
            "targetDuration": 30,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "10-12% incline, 3.0-3.5 mph. Stay in Zone 2 - back off if heart rate climbs."
          }
        ]
      },
      {
        "id": "wlc-week-2",
        "weekNumber": 2,
        "sessions": [
          {
            "dayNumber": 3,
            "name": "Incline Walk 1",
            "description": "Steep treadmill walk",
            "targetDuration": 30,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "10-12% incline. Increase to 30 min this week."
          },
          {
            "dayNumber": 6,
            "name": "Incline Walk 2",
            "description": "Steep treadmill walk",
            "targetDuration": 30,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "10-12% incline, 3.0-3.5 mph."
          },
          {
            "dayNumber": 7,
            "name": "Optional Walk 3",
            "description": "Additional Zone 2 if recovery allows",
            "targetDuration": 20,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill or Outdoors",
            "targetHRRange": "115-130 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Only if energy is good. Skip if fatigued from lifting."
          }
        ]
      },
      {
        "id": "wlc-week-3",
        "weekNumber": 3,
        "sessions": [
          {
            "dayNumber": 3,
            "name": "Incline Walk 1",
            "description": "Steep treadmill walk",
            "targetDuration": 35,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Increase to 35 min. Try 12-15% incline if 10-12% feels easy."
          },
          {
            "dayNumber": 6,
            "name": "Incline Walk 2",
            "description": "Steep treadmill walk",
            "targetDuration": 35,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Stay consistent with Zone 2. Building aerobic base."
          },
          {
            "dayNumber": 7,
            "name": "Optional Walk 3",
            "description": "Easy recovery cardio",
            "targetDuration": 25,
            "intensityZone": "Zone 1-2",
            "equipment": "Treadmill or Outdoors",
            "targetHRRange": "110-125 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Very easy. Active recovery only."
          }
        ]
      },
      {
        "id": "wlc-week-4",
        "weekNumber": 4,
        "sessions": [
          {
            "dayNumber": 3,
            "name": "Incline Walk",
            "description": "Deload week - reduced volume",
            "targetDuration": 25,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill",
            "targetHRRange": "115-130 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "DELOAD WEEK: Reduced duration. Focus on recovery."
          },
          {
            "dayNumber": 6,
            "name": "Easy Walk",
            "description": "Deload - light cardio only",
            "targetDuration": 20,
            "intensityZone": "Zone 1-2",
            "equipment": "Treadmill or Outdoors",
            "targetHRRange": "110-125 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "DELOAD: Keep it very easy. Recovery is the priority."
          }
        ]
      },
      {
        "id": "wlc-week-5",
        "weekNumber": 5,
        "sessions": [
          {
            "dayNumber": 3,
            "name": "Zone 2 Cycling",
            "description": "Introducing cycling - less interference than walking",
            "targetDuration": 30,
            "intensityZone": "Zone 2",
            "equipment": "Stationary Bike",
            "targetHRRange": "120-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "First cycling session. Keep resistance moderate. Focus on smooth pedaling."
          },
          {
            "dayNumber": 5,
            "name": "Incline Walk",
            "description": "Steep treadmill walk",
            "targetDuration": 35,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Back to building after deload."
          },
          {
            "dayNumber": 7,
            "name": "Zone 2 Walk or Cycle",
            "description": "Choice of modality",
            "targetDuration": 30,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill or Bike",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Choose based on how legs feel. Bike if quads are sore."
          }
        ]
      },
      {
        "id": "wlc-week-6",
        "weekNumber": 6,
        "sessions": [
          {
            "dayNumber": 3,
            "name": "Zone 2 Cycling",
            "description": "Building cycling endurance",
            "targetDuration": 35,
            "intensityZone": "Zone 2",
            "equipment": "Stationary Bike",
            "targetHRRange": "125-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Increase duration. Maintain steady cadence 75-90 RPM."
          },
          {
            "dayNumber": 5,
            "name": "Incline Walk",
            "description": "Steep treadmill walk",
            "targetDuration": 40,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Push duration to 40 min."
          },
          {
            "dayNumber": 7,
            "name": "Zone 2 Session",
            "description": "Choice of modality",
            "targetDuration": 30,
            "intensityZone": "Zone 2",
            "equipment": "Bike or Treadmill",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Consistent Zone 2 work."
          }
        ]
      },
      {
        "id": "wlc-week-7",
        "weekNumber": 7,
        "sessions": [
          {
            "dayNumber": 3,
            "name": "Tempo Cycling",
            "description": "Introducing Zone 3 - building towards HIIT",
            "targetDuration": 35,
            "intensityZone": "Zone 3",
            "equipment": "Stationary Bike",
            "targetHRRange": "140-155 bpm",
            "targetPowerRange": null,
            "intervalStructure": "5 min warmup + 20 min tempo + 10 min cooldown",
            "notes": "First tempo session. Comfortably hard - can speak in short sentences."
          },
          {
            "dayNumber": 5,
            "name": "Incline Walk",
            "description": "Zone 2 recovery",
            "targetDuration": 40,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Easy day after tempo. Stay Zone 2."
          },
          {
            "dayNumber": 7,
            "name": "Zone 2 Cycling",
            "description": "Active recovery",
            "targetDuration": 30,
            "intensityZone": "Zone 2",
            "equipment": "Stationary Bike",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Easy spinning. Flush the legs."
          }
        ]
      },
      {
        "id": "wlc-week-8",
        "weekNumber": 8,
        "sessions": [
          {
            "dayNumber": 3,
            "name": "Easy Cycling",
            "description": "Deload week",
            "targetDuration": 25,
            "intensityZone": "Zone 2",
            "equipment": "Stationary Bike",
            "targetHRRange": "115-130 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "DELOAD WEEK: Reduced intensity and volume."
          },
          {
            "dayNumber": 6,
            "name": "Easy Walk",
            "description": "Deload - recovery focus",
            "targetDuration": 20,
            "intensityZone": "Zone 1-2",
            "equipment": "Treadmill or Outdoors",
            "targetHRRange": "110-120 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "DELOAD: Very easy. Let body recover for final push."
          }
        ]
      },
      {
        "id": "wlc-week-9",
        "weekNumber": 9,
        "sessions": [
          {
            "dayNumber": 3,
            "name": "HIIT Cycling",
            "description": "First HIIT session - short intervals",
            "targetDuration": 25,
            "intensityZone": "Zone 4-5",
            "equipment": "Airbike or Stationary Bike",
            "targetHRRange": "160-180 bpm",
            "targetPowerRange": null,
            "intervalStructure": "5 min warmup + 6x(30 sec hard, 90 sec easy) + 5 min cooldown",
            "notes": "First HIIT! Start conservative. 85-90% effort on hard intervals."
          },
          {
            "dayNumber": 5,
            "name": "Zone 2 Walk",
            "description": "Recovery after HIIT",
            "targetDuration": 35,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Easy recovery. Incline walk at conversational pace."
          },
          {
            "dayNumber": 7,
            "name": "Zone 2 Cycling",
            "description": "Endurance base",
            "targetDuration": 40,
            "intensityZone": "Zone 2",
            "equipment": "Stationary Bike",
            "targetHRRange": "125-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Steady state. Building aerobic capacity."
          }
        ]
      },
      {
        "id": "wlc-week-10",
        "weekNumber": 10,
        "sessions": [
          {
            "dayNumber": 3,
            "name": "HIIT Cycling",
            "description": "Progressing HIIT intervals",
            "targetDuration": 28,
            "intensityZone": "Zone 4-5",
            "equipment": "Airbike or Stationary Bike",
            "targetHRRange": "165-180 bpm",
            "targetPowerRange": null,
            "intervalStructure": "5 min warmup + 8x(30 sec hard, 90 sec easy) + 5 min cooldown",
            "notes": "Adding 2 intervals. Maintain intensity on each one."
          },
          {
            "dayNumber": 5,
            "name": "Zone 2 Walk",
            "description": "Active recovery",
            "targetDuration": 40,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Longer duration, easy intensity."
          },
          {
            "dayNumber": 7,
            "name": "Zone 2 Cycling",
            "description": "Endurance session",
            "targetDuration": 45,
            "intensityZone": "Zone 2",
            "equipment": "Stationary Bike",
            "targetHRRange": "125-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Long steady ride. 45 min target."
          }
        ]
      },
      {
        "id": "wlc-week-11",
        "weekNumber": 11,
        "sessions": [
          {
            "dayNumber": 3,
            "name": "HIIT Cycling",
            "description": "Peak HIIT week",
            "targetDuration": 30,
            "intensityZone": "Zone 4-5",
            "equipment": "Airbike or Stationary Bike",
            "targetHRRange": "165-180 bpm",
            "targetPowerRange": null,
            "intervalStructure": "5 min warmup + 5x(45 sec hard, 75 sec easy) + 5 min cooldown",
            "notes": "Longer work intervals. Push the intensity!"
          },
          {
            "dayNumber": 5,
            "name": "Zone 2 Walk",
            "description": "Recovery",
            "targetDuration": 40,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Standard incline walk."
          },
          {
            "dayNumber": 6,
            "name": "Zone 2 Cycling",
            "description": "Endurance",
            "targetDuration": 45,
            "intensityZone": "Zone 2",
            "equipment": "Stationary Bike",
            "targetHRRange": "125-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Building endurance for maintenance phase."
          },
          {
            "dayNumber": 7,
            "name": "Optional Easy Session",
            "description": "If energy allows",
            "targetDuration": 25,
            "intensityZone": "Zone 1-2",
            "equipment": "Any",
            "targetHRRange": "110-125 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Only if recovery is good. Skip if fatigued."
          }
        ]
      },
      {
        "id": "wlc-week-12",
        "weekNumber": 12,
        "sessions": [
          {
            "dayNumber": 3,
            "name": "HIIT Cycling",
            "description": "Final HIIT - test your progress",
            "targetDuration": 30,
            "intensityZone": "Zone 4-5",
            "equipment": "Airbike or Stationary Bike",
            "targetHRRange": "165-180 bpm",
            "targetPowerRange": null,
            "intervalStructure": "5 min warmup + 6x(45 sec hard, 60 sec easy) + 5 min cooldown",
            "notes": "Final HIIT test! Shorter rest, same work. See how far you have come."
          },
          {
            "dayNumber": 5,
            "name": "Zone 2 Walk",
            "description": "Standard session",
            "targetDuration": 35,
            "intensityZone": "Zone 2",
            "equipment": "Treadmill",
            "targetHRRange": "120-135 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Moderate volume as you wrap up the program."
          },
          {
            "dayNumber": 7,
            "name": "Zone 2 Cycling",
            "description": "Final endurance session",
            "targetDuration": 45,
            "intensityZone": "Zone 2",
            "equipment": "Stationary Bike",
            "targetHRRange": "125-140 bpm",
            "targetPowerRange": null,
            "intervalStructure": null,
            "notes": "Celebrate your progress! 12 weeks of consistent cardio."
          }
        ]
      }
    ]
  }',
  12,
  34,
  0
)
ON CONFLICT (id) DO UPDATE SET
  "programData" = EXCLUDED."programData",
  "weekCount" = EXCLUDED."weekCount",
  "workoutCount" = EXCLUDED."workoutCount",
  "exerciseCount" = EXCLUDED."exerciseCount";
