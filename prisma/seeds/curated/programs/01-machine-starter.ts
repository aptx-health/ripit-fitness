import { makeSets, type ProgramSpec } from '../helpers'

export const machineStarter: ProgramSpec = {
  name: 'Machine Starter',
  description:
    'Day-one program for true beginners and older adults. All machines, fixed movement paths, low cognitive load. Two rotating full body workouts, 2-3x/week.',

  workouts: [
    {
      name: 'Your First Workout',
      dayNumber: 1,
      exercises: [
        { name: 'Chest Press', sets: makeSets(2, '12', 5) },
        { name: 'Shoulder Press', sets: makeSets(2, '12', 5) },
        { name: 'Lat Pulldown', sets: makeSets(2, '12', 4) },
        { name: 'Leg Press', sets: makeSets(2, '12', 3) },
        { name: 'Leg Extensions', sets: makeSets(2, '12', 4) },
        { name: 'Seated Leg Curl', sets: makeSets(2, '12', 3) },
        { name: 'Back Extension', sets: makeSets(2, '10', 4) },
      ],
    },
    {
      name: 'Getting Comfortable',
      dayNumber: 2,
      exercises: [
        { name: 'Chest Supported Row', sets: makeSets(2, '12', 5) },
        { name: 'Dip Machine', sets: makeSets(2, '12', 5) },
        { name: 'Leg Press', sets: makeSets(2, '12', 3) },
        { name: 'Thigh Adductor', sets: makeSets(2, '12', 4) },
        { name: 'Thigh Abductor', sets: makeSets(2, '12', 4) },
        { name: 'Ab Crunch Machine', sets: makeSets(2, '12', 4) },
        { name: 'Back Extension', sets: makeSets(2, '10', 4) },
      ],
    },
  ],
}
