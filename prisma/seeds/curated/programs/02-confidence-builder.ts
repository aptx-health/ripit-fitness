import { makeSets, type ProgramSpec } from '../helpers'

export const confidenceBuilder: ProgramSpec = {
  name: 'Confidence Builder',
  description:
    'Beginner-intermediate program introducing dumbbells and cables alongside machines. Three-day rotation: Upper, Lower, and Foundation Strength (bone density focus). 3-4x/week.',

  workouts: [
    {
      name: 'Upper Body - Machines & Cables',
      dayNumber: 1,
      exercises: [
        { name: 'Chest Press', sets: makeSets(3, '10', 4) },
        { name: 'Chest Supported Row', sets: makeSets(3, '10', 4) },
        { name: 'Shoulder Press', sets: makeSets(2, '10', 4) },
        { name: 'Lat Pulldown', sets: makeSets(2, '10', 4) },
        { name: 'Standing Biceps Cable Curl', sets: makeSets(2, '12', 4) },
        { name: 'Triceps Pushdown', sets: makeSets(2, '12', 4) },
      ],
    },
    {
      name: 'Lower Body - Machines & Light DBs',
      dayNumber: 2,
      exercises: [
        { name: 'Leg Press', sets: makeSets(3, '10', 3) },
        { name: 'Leg Extensions', sets: makeSets(2, '12', 4) },
        { name: 'Seated Leg Curl', sets: makeSets(2, '12', 3) },
        { name: 'Goblet Squat', sets: makeSets(2, '8', 4) },
        { name: 'Romanian Deadlift', sets: makeSets(2, '8', 4) },
        { name: 'Thigh Adductor', sets: makeSets(2, '12', 4) },
      ],
    },
    {
      name: 'Foundation Strength',
      dayNumber: 3,
      exercises: [
        { name: 'Leg Press', sets: makeSets(3, '10', 3) },
        { name: 'Chest Press', sets: makeSets(2, '10', 4) },
        { name: 'Lat Pulldown', sets: makeSets(2, '10', 4) },
        { name: "Farmer's Walk", sets: makeSets(2, '40yd', 3) },
        { name: 'Dumbbell Step Ups', sets: makeSets(2, '10/leg', 4) },
        { name: 'Back Extension', sets: makeSets(2, '10', 3) },
      ],
    },
  ],
}
