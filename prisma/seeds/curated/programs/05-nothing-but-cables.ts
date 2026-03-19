import { ProgramSpec, makeSets } from '../helpers'

export const nothingButCables: ProgramSpec = {
  name: 'Nothing But Cables',
  description:
    'Three-day cable-focused program with some dumbbell and machine work on lower body days. Joint-friendly, great pump. Works standalone 3x/week or as a complement to any other program.',

  workouts: [
    {
      name: 'Upper',
      dayNumber: 1,
      exercises: [
        { name: 'Cable Chest Press', sets: makeSets(3, '12', 3) },
        { name: 'Lat Pull-Around', sets: makeSets(3, '12', 3) },
        { name: 'One-Arm Side Laterals', sets: makeSets(3, '12', 3) },
        { name: 'Face Pull', sets: makeSets(3, '12', 3) },
        { name: 'Standing Biceps Cable Curl', sets: makeSets(3, '12', 3) },
        { name: 'Triceps Pushdown', sets: makeSets(3, '12', 3) },
      ],
    },
    {
      name: 'Lower & Core',
      dayNumber: 2,
      exercises: [
        { name: 'Dumbbell Bulgarian Split Squat', sets: makeSets(3, '10', 4) },
        { name: 'Goblet Squat', sets: makeSets(3, '10', 3) },
        { name: 'Pull Through', sets: makeSets(3, '12', 4) },
        { name: 'Standing Cable Wood Chop', sets: makeSets(3, '10', 3) },
        { name: 'Cable Crunch', sets: makeSets(3, '12', 3) },
        { name: 'Standing Calf Raise', sets: makeSets(3, '12', 3) },
      ],
    },
    {
      name: 'Full Body',
      dayNumber: 3,
      exercises: [
        { name: 'Dumbbell Lunges', sets: makeSets(3, '10', 3) },
        { name: 'Leg Extensions', sets: makeSets(3, '12', 3) },
        { name: 'Cable Chest Press', sets: makeSets(3, '12', 3) },
        { name: 'Seated Cable Rows', sets: makeSets(3, '12', 3) },
        { name: 'Face Pull', sets: makeSets(3, '12', 3) },
        { name: 'Standing Biceps Cable Curl', sets: makeSets(3, '12', 3) },
        { name: 'Triceps Pushdown', sets: makeSets(3, '12', 3) },
        { name: 'Pull Through', sets: makeSets(3, '12', 4) },
      ],
    },
  ],
}
