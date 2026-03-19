import { ProgramSpec, makeSets } from '../helpers'

export const fullBodyStrength: ProgramSpec = {
  name: 'Full Body Strength',
  description:
    'Intermediate A/B full body program. Compound-heavy with machine accessories. 3x/week alternating workouts.',

  workouts: [
    {
      name: 'Full Body Strength A',
      dayNumber: 1,
      exercises: [
        { name: 'Dumbbell Bench Press', sets: makeSets(3, '8', 3) },
        { name: 'Barbell Squat', sets: makeSets(3, '6', 3) },
        { name: 'Chest Supported Row', sets: makeSets(3, '8', 3) },
        { name: 'Dumbbell Shoulder Press', sets: makeSets(3, '8', 3) },
        { name: 'Seated Leg Curl', sets: makeSets(3, '10', 4) },
        { name: 'Face Pull', sets: makeSets(3, '12', 3) },
      ],
    },
    {
      name: 'Full Body Strength B',
      dayNumber: 2,
      exercises: [
        { name: 'Romanian Deadlift', sets: makeSets(3, '8', 4) },
        { name: 'Lat Pulldown', sets: makeSets(3, '8', 3) },
        { name: 'Standing Dumbbell Press', sets: makeSets(3, '8', 3) },
        { name: 'Leg Press', sets: makeSets(3, '8', 4) },
        { name: 'One-Arm Side Laterals', sets: makeSets(3, '12', 3) },
        { name: 'Triceps Pushdown', sets: makeSets(3, '10', 3) },
      ],
    },
  ],
}
