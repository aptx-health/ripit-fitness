import { ProgramSpec, makeSetsRpe } from '../helpers'

export const heavyUpperLower: ProgramSpec = {
  name: '3-Day Powerbuilder - Strength and Mass',
  description:
    'Intermediate-advanced Powerbuilder program. Heavy compound days for strength, full-body hypertrophy day for size. Smith machine for incline press and calf raises. 3x/week. Uses RPE for intensity.',

  workouts: [
    {
      name: 'Heavy Upper',
      dayNumber: 1,
      exercises: [
        { name: 'Bench Press', sets: makeSetsRpe(4, '5', 7) },
        { name: 'Bent Over Barbell Row', sets: makeSetsRpe(4, '5', 7) },
        { name: 'Standing Dumbbell Press', sets: makeSetsRpe(3, '8', 7) },
        { name: 'Barbell Curl', sets: makeSetsRpe(3, '10', 6) },
        { name: 'Lying Triceps Press', sets: makeSetsRpe(3, '10', 6) },
        { name: 'Face Pull', sets: makeSetsRpe(3, '12', 6) },
      ],
    },
    {
      name: 'Heavy Lower',
      dayNumber: 2,
      exercises: [
        { name: 'Barbell Squat', sets: makeSetsRpe(4, '5', 7) },
        { name: 'Trap Bar Deadlift', sets: makeSetsRpe(3, '5', 7) },
        { name: 'Leg Press', sets: makeSetsRpe(3, '8', 7) },
        { name: 'Seated Leg Curl', sets: makeSetsRpe(3, '10', 6) },
        { name: 'Smith Machine Calf Raise', sets: makeSetsRpe(3, '12', 6) },
        { name: 'Standing Cable Wood Chop', sets: makeSetsRpe(3, '10', 6) },
      ],
    },
    {
      name: 'Full Body Hypertrophy',
      dayNumber: 3,
      exercises: [
        { name: 'Incline Dumbbell Press', sets: makeSetsRpe(3, '10', 7) },
        { name: 'One-Arm Dumbbell Row', sets: makeSetsRpe(3, '10', 7) },
        { name: 'Dumbbell Bulgarian Split Squat', sets: makeSetsRpe(3, '10', 6) },
        { name: 'Side Lateral Raise', sets: makeSetsRpe(3, '12', 6) },
        { name: 'Cable Crossover', sets: makeSetsRpe(3, '12', 6) },
        { name: 'Standing Biceps Cable Curl', sets: makeSetsRpe(3, '12', 6) },
        { name: 'Triceps Pushdown', sets: makeSetsRpe(3, '12', 6) },
      ],
    },
  ],
}
