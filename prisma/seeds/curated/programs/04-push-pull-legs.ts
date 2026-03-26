import { ProgramSpec, makeSets } from '../helpers'

export const pushPullLegs: ProgramSpec = {
  name: 'Push / Pull / Legs',
  description:
    'Classic PPL split for intermediate lifters. Each day focuses on one movement pattern. 3-6x/week.',

  workouts: [
    {
      name: 'Push',
      dayNumber: 1,
      exercises: [
        { name: 'Dumbbell Bench Press', sets: makeSets(3, '8', 3) },
        { name: 'Incline Dumbbell Press', sets: makeSets(3, '8', 3) },
        { name: 'Cable Crossover', sets: makeSets(3, '12', 3) },
        { name: 'Side Lateral Raise', sets: makeSets(3, '12', 3) },
        { name: 'Triceps Pushdown', sets: makeSets(3, '10', 3) },
        { name: 'Dip Machine', sets: makeSets(3, '10', 3) },
      ],
    },
    {
      name: 'Pull',
      dayNumber: 2,
      exercises: [
        { name: 'Lat Pulldown', sets: makeSets(3, '8', 3) },
        { name: 'Chest Supported Row', sets: makeSets(3, '8', 3) },
        { name: 'One-Arm Dumbbell Row', sets: makeSets(3, '8', 3) },
        { name: 'Face Pull', sets: makeSets(3, '12', 3) },
        { name: 'Standing Biceps Cable Curl', sets: makeSets(3, '10', 3) },
        { name: 'Machine Preacher Curls', sets: makeSets(3, '10', 3) },
      ],
    },
    {
      name: 'Legs & Core',
      dayNumber: 3,
      exercises: [
        { name: 'Barbell Squat', sets: makeSets(3, '6', 4) },
        { name: 'Leg Press', sets: makeSets(3, '8', 4) },
        { name: 'Romanian Deadlift', sets: makeSets(3, '8', 4) },
        { name: 'Leg Extensions', sets: makeSets(3, '12', 3) },
        { name: 'Seated Leg Curl', sets: makeSets(3, '12', 4) },
        { name: 'Standing Cable Wood Chop', sets: makeSets(3, '10', 3) },
      ],
    },
  ],
}
