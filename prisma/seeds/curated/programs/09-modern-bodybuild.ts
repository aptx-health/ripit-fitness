import { makeSets, type ProgramSpec } from '../helpers'

export const modernBodybuild: ProgramSpec = {
  name: 'Modern Bodybuild',
  description:
    'Machine and cable-heavy bodybuilding program. Upper/Lower/Full Body/Full Body split. 4x/week.',

  workouts: [
    {
      name: 'Upper',
      dayNumber: 1,
      exercises: [
        { name: 'Smith Machine Incline Bench Press', sets: makeSets(3, '10', 3) },
        { name: 'Chest Supported Row', sets: makeSets(3, '10', 3) },
        { name: 'Dumbbell Shoulder Press', sets: makeSets(3, '10', 3) },
        { name: 'Pull-Ups', sets: makeSets(4, 'AMRAP', 2) },
        { name: 'Dip Machine', sets: makeSets(4, '10', 3) },
        { name: 'Face Pull', sets: makeSets(3, '12', 3) },
        { name: 'Cable Upright Row', sets: makeSets(3, '12', 3) },
      ],
    },
    {
      name: 'Lower',
      dayNumber: 2,
      exercises: [
        { name: 'Smith Machine Squat', sets: makeSets(3, '10', 3) },
        { name: 'Romanian Deadlift', sets: makeSets(2, '10', 3) },
        { name: 'Leg Press', sets: makeSets(3, '10', 3) },
        { name: 'Leg Extensions', sets: makeSets(3, '12', 3) },
        { name: 'Seated Leg Curl', sets: makeSets(2, '10', 3) },
        { name: 'Thigh Adductor', sets: makeSets(2, '12', 3) },
        { name: 'Thigh Abductor', sets: makeSets(3, '12', 3) },
        { name: 'Standing Calf Raise', sets: makeSets(3, '15', 3) },
      ],
    },
    {
      name: 'Full Body A',
      dayNumber: 3,
      exercises: [
        { name: 'Lat Pull-Around', sets: makeSets(4, '12', 3) },
        { name: 'Incline Dumbbell Press', sets: makeSets(3, '10', 3) },
        { name: 'Seated Leg Curl', sets: makeSets(2, '10', 3) },
        { name: 'One-Arm Side Laterals', sets: makeSets(3, '12', 3) },
        { name: 'Standing Biceps Cable Curl', sets: makeSets(3, '12', 3) },
        { name: 'Triceps Pushdown', sets: makeSets(3, '12', 3) },
        { name: 'Cable Crunch', sets: makeSets(3, '12', 3) },
        { name: 'Dumbbell Reverse Wrist Curl', sets: makeSets(3, '15', 3) },
      ],
    },
    {
      name: 'Full Body B',
      dayNumber: 4,
      exercises: [
        { name: 'Lat Pulldown', sets: makeSets(2, '10', 3) },
        { name: 'Chest Press', sets: makeSets(3, '10', 3) },
        { name: 'Smith Machine Calf Raise', sets: makeSets(3, '15', 3) },
        { name: 'Face Pull', sets: makeSets(3, '12', 3) },
        { name: 'Hammer Curl', sets: makeSets(3, '10', 3) },
        { name: 'Dumbbell Overhead Triceps Extension', sets: makeSets(2, '10', 3) },
        { name: 'Machine Preacher Curls', sets: makeSets(2, '10', 3) },
        { name: 'Roman Chair Leg Lift', sets: makeSets(3, '12', 3) },
        { name: 'One-Arm Side Laterals', sets: makeSets(3, '12', 3) },
      ],
    },
  ],
}
