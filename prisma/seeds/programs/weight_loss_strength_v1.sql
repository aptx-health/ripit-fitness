-- Weight Loss Strength v1 - 12 Week Upper/Lower Split
-- Designed for fat loss while maintaining muscle mass
-- 4 days/week with arms emphasis
-- Run with: doppler run --config dev_personal -- bash -c 'psql $DATABASE_URL -f prisma/seeds/programs/weight_loss_strength_v1.sql'

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
  'weight-loss-strength-v1',
  'Weight Loss Strength v1',
  'A 12-week upper/lower split designed for fat loss while preserving muscle mass. Features reduced volume with maintained intensity, arms emphasis, and strategic deload weeks. Based on current research showing that maintaining training intensity while moderately reducing volume (80-90%) is optimal for muscle retention during a caloric deficit.',
  'strength',
  'cb8e9963-4f9b-4490-9983-e914646b23b',
  'Ripit Fitness',
  NOW(),
  'orig-weight-loss-strength-v1',
  '{
    "id": "orig-weight-loss-strength-v1",
    "name": "Weight Loss Strength v1",
    "description": "12-week cutting program - Upper/Lower split with arms emphasis",
    "programType": "strength",
    "weeks": [
      {
        "id": "wl-week-1",
        "weekNumber": 1,
        "workouts": [
          {
            "id": "wl-w1-upper1",
            "name": "Upper A - Push Focus",
            "dayNumber": 1,
            "exercises": [
              {
                "id": "wl-w1-u1-ex1",
                "name": "Incline Dumbbell Bench Press",
                "exerciseDefinitionId": "ex_db_001",
                "order": 1,
                "exerciseGroup": null,
                "notes": "Control the negative. 2 sec down, explosive up.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "8", "weight": null, "rpe": 7, "rir": null, "notes": "Warm-up set"},
                  {"setNumber": 2, "reps": "6", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 3, "reps": "6", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-u1-ex2",
                "name": "Dumbbell Shoulder Press",
                "exerciseDefinitionId": "ex_db_006",
                "order": 2,
                "exerciseGroup": null,
                "notes": "Slight rotation on negative, flare elbows on push.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "8", "weight": null, "rpe": 7, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "8", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 3, "reps": "8", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-u1-ex3",
                "name": "Lat Pulldown",
                "exerciseDefinitionId": "ex_cm_005",
                "order": 3,
                "exerciseGroup": null,
                "notes": "Full stretch at top, squeeze lats at bottom.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "10", "weight": null, "rpe": 7, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "10", "weight": null, "rpe": 8, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-u1-ex4",
                "name": "Cable Lateral Raise",
                "exerciseDefinitionId": "ex_cm_011",
                "order": 4,
                "exerciseGroup": null,
                "notes": "Cross body, Y motion. Focus on side delt contraction.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "12", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "12", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-u1-ex5",
                "name": "Cable Tricep Pushdown",
                "exerciseDefinitionId": "ex_cm_018",
                "order": 5,
                "exerciseGroup": null,
                "notes": "Lock elbows at sides. Full extension.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "12", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "12", "weight": null, "rpe": 9, "rir": null, "notes": null},
                  {"setNumber": 3, "reps": "12", "weight": null, "rpe": 10, "rir": null, "notes": "To failure"}
                ]
              },
              {
                "id": "wl-w1-u1-ex6",
                "name": "Cable Bicep Curl",
                "exerciseDefinitionId": "ex_cm_016",
                "order": 6,
                "exerciseGroup": null,
                "notes": "Full stretch at bottom. Squeeze at top.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "12", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "12", "weight": null, "rpe": 9, "rir": null, "notes": null},
                  {"setNumber": 3, "reps": "12", "weight": null, "rpe": 10, "rir": null, "notes": "To failure"}
                ]
              }
            ]
          },
          {
            "id": "wl-w1-lower1",
            "name": "Lower A - Quad Focus",
            "dayNumber": 2,
            "exercises": [
              {
                "id": "wl-w1-l1-ex1",
                "name": "Leg Press",
                "exerciseDefinitionId": "cmiz7vldb000bvr0mw4qzzagc",
                "order": 1,
                "exerciseGroup": null,
                "notes": "Feet lower on platform for quad emphasis. Full depth.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "12", "weight": null, "rpe": 6, "rir": null, "notes": "Warm-up"},
                  {"setNumber": 2, "reps": "10", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 3, "reps": "10", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-l1-ex2",
                "name": "Romanian Deadlift",
                "exerciseDefinitionId": "cmiz7vkdh0005vr0mr5dm18ls",
                "order": 2,
                "exerciseGroup": null,
                "notes": "1 sec pause at bottom. Stop 75% to lockout to keep tension.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "8", "weight": null, "rpe": 7, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "8", "weight": null, "rpe": 8, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-l1-ex3",
                "name": "Leg Extension",
                "exerciseDefinitionId": "cmiz7vlqf000dvr0mm39bhj97",
                "order": 3,
                "exerciseGroup": null,
                "notes": "Long-length partials. Seat back, 2-3 sec negative.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "12", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "12", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-l1-ex4",
                "name": "Leg Curl",
                "exerciseDefinitionId": "cmiz7vljh000cvr0mlk0r5kco",
                "order": 4,
                "exerciseGroup": null,
                "notes": "Long-length partials. Lean forward for max stretch.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "12", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "12", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-l1-ex5",
                "name": "Calf Raise",
                "exerciseDefinitionId": "cmiz7vnam000mvr0mano9z27r",
                "order": 5,
                "exerciseGroup": null,
                "notes": "Full stretch at bottom, pause at top.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "15", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "15", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-l1-ex6",
                "name": "Cable Crunch",
                "exerciseDefinitionId": "ex_cm_025",
                "order": 6,
                "exerciseGroup": null,
                "notes": "Mind-muscle connection. Curl spine, dont pull with arms.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "15", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "15", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              }
            ]
          },
          {
            "id": "wl-w1-upper2",
            "name": "Upper B - Pull Focus",
            "dayNumber": 4,
            "exercises": [
              {
                "id": "wl-w1-u2-ex1",
                "name": "Seated Cable Row",
                "exerciseDefinitionId": "ex_cm_009",
                "order": 1,
                "exerciseGroup": null,
                "notes": "45 degree elbow flare. Squeeze shoulder blades hard.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "10", "weight": null, "rpe": 7, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "10", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 3, "reps": "10", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-u2-ex2",
                "name": "Barbell Bench Press",
                "exerciseDefinitionId": "cmiz7vjju0000vr0m4b1o6bec",
                "order": 2,
                "exerciseGroup": null,
                "notes": "1 sec pause at chest. Drive through.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "6", "weight": null, "rpe": 7, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "6", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 3, "reps": "6", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-u2-ex3",
                "name": "Cable Face Pull",
                "exerciseDefinitionId": "ex_cm_014",
                "order": 3,
                "exerciseGroup": null,
                "notes": "Pause at squeeze. Contract rear delts hard.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "15", "weight": null, "rpe": 7, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "15", "weight": null, "rpe": 8, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-u2-ex4",
                "name": "Cable Chest Fly",
                "exerciseDefinitionId": "ex_cm_001",
                "order": 4,
                "exerciseGroup": null,
                "notes": "Lean forward. Stretch and squeeze the pecs.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "12", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "12", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-u2-ex5",
                "name": "Incline Dumbbell Curl",
                "exerciseDefinitionId": "ex_db_018",
                "order": 5,
                "exerciseGroup": null,
                "notes": "Start with weak arm. Full stretch at bottom.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "10", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "10", "weight": null, "rpe": 9, "rir": null, "notes": null},
                  {"setNumber": 3, "reps": "10", "weight": null, "rpe": 10, "rir": null, "notes": "To failure"}
                ]
              },
              {
                "id": "wl-w1-u2-ex6",
                "name": "Dumbbell Overhead Tricep Extension",
                "exerciseDefinitionId": "ex_db_023",
                "order": 6,
                "exerciseGroup": null,
                "notes": "Full stretch at bottom. Elbows stay tucked.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "10", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "10", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              }
            ]
          },
          {
            "id": "wl-w1-lower2",
            "name": "Lower B - Posterior Focus",
            "dayNumber": 5,
            "exercises": [
              {
                "id": "wl-w1-l2-ex1",
                "name": "Barbell Back Squat",
                "exerciseDefinitionId": "cmiz7vjpo0001vr0msv9of7ib",
                "order": 1,
                "exerciseGroup": null,
                "notes": "Full depth. Brace hard.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "8", "weight": null, "rpe": 6, "rir": null, "notes": "Warm-up"},
                  {"setNumber": 2, "reps": "6", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 3, "reps": "6", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-l2-ex2",
                "name": "Dumbbell Romanian Deadlift",
                "exerciseDefinitionId": "ex_db_014",
                "order": 2,
                "exerciseGroup": null,
                "notes": "1 sec pause at stretch. Dont go too heavy - protect lower back.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "10", "weight": null, "rpe": 7, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "10", "weight": null, "rpe": 8, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-l2-ex3",
                "name": "Dumbbell Bulgarian Split Squat",
                "exerciseDefinitionId": "ex_db_031",
                "order": 3,
                "exerciseGroup": null,
                "notes": "Lean slightly forward for glute emphasis.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "10", "weight": null, "rpe": 8, "rir": null, "notes": "Each leg"},
                  {"setNumber": 2, "reps": "10", "weight": null, "rpe": 9, "rir": null, "notes": "Each leg"}
                ]
              },
              {
                "id": "wl-w1-l2-ex4",
                "name": "Leg Curl",
                "exerciseDefinitionId": "cmiz7vljh000cvr0mlk0r5kco",
                "order": 4,
                "exerciseGroup": null,
                "notes": "Long-length partials.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "12", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "12", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-l2-ex5",
                "name": "Calf Raise",
                "exerciseDefinitionId": "cmiz7vnam000mvr0mano9z27r",
                "order": 5,
                "exerciseGroup": null,
                "notes": "Slow negative. Pause at stretch.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "15", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "15", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              },
              {
                "id": "wl-w1-l2-ex6",
                "name": "Hanging Leg Raise",
                "exerciseDefinitionId": "ex_bw_027",
                "order": 6,
                "exerciseGroup": null,
                "notes": "Control the movement. No swinging.",
                "prescribedSets": [
                  {"setNumber": 1, "reps": "12", "weight": null, "rpe": 8, "rir": null, "notes": null},
                  {"setNumber": 2, "reps": "12", "weight": null, "rpe": 9, "rir": null, "notes": null}
                ]
              }
            ]
          }
        ]
      }
    ]
  }',
  12,
  48,
  288
)
ON CONFLICT (id) DO UPDATE SET
  "programData" = EXCLUDED."programData",
  "weekCount" = EXCLUDED."weekCount",
  "workoutCount" = EXCLUDED."workoutCount",
  "exerciseCount" = EXCLUDED."exerciseCount";
