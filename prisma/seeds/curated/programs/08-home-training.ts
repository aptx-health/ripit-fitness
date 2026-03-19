import { ProgramSpec, makeSets } from '../helpers'

export const homeTraining: ProgramSpec = {
  name: 'Home Training',
  description:
    'Equipment-free bodyweight program. All you need is a pull-up bar and a step or chair for elevated split squats. High volume to compensate for low load. 3x/week.',

  workouts: [
    {
      name: 'Push + Legs',
      dayNumber: 1,
      exercises: [
        { name: 'Pushups', sets: makeSets(4, '15-20', 2) },
        { name: 'Pike Pushups', sets: makeSets(3, '10-12', 2) },
        { name: 'Bodyweight Squat', sets: makeSets(4, '20', 2) },
        { name: 'Bodyweight Lunges', sets: makeSets(3, '12/leg', 2) },
        { name: 'Glute Bridge', sets: makeSets(3, '20', 2) },
      ],
    },
    {
      name: 'Pull + Legs',
      dayNumber: 2,
      exercises: [
        { name: 'Pull-Ups', sets: makeSets(4, 'AMRAP', 2) },
        { name: 'Inverted Row', sets: makeSets(3, '10-12', 2) },
        { name: 'Bodyweight Bulgarian Split Squat', sets: makeSets(4, '10/leg', 2) },
        { name: 'Bodyweight Step-Ups', sets: makeSets(3, '12/leg', 2) },
        { name: 'Glute Bridge', sets: makeSets(3, '20', 2) },
      ],
    },
    {
      name: 'Full Body',
      dayNumber: 3,
      exercises: [
        { name: 'Pull-Ups', sets: makeSets(3, 'AMRAP', 2) },
        { name: 'Pushups', sets: makeSets(4, '20', 2) },
        { name: 'Bodyweight Squat', sets: makeSets(4, '20', 2) },
        { name: 'Bodyweight Bulgarian Split Squat', sets: makeSets(3, '10/leg', 2) },
        { name: 'Pike Pushups', sets: makeSets(3, '12', 2) },
      ],
    },
  ],
}
