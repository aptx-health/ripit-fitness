import { ProgramSpec, makeSets } from '../helpers'

export const modernBodybuildFemale: ProgramSpec = {
  name: 'Modern Bodybuild -- Female Physique',
  description:
    'Modern Bodybuild -- Female Physique. 4x/week Upper/Lower/Full Body split emphasizing glutes, hamstrings, and shoulders. Machine and cable-heavy for controlled progressive overload. Skip a full-body day for 3x/week.',

  workouts: [
    {
      name: 'Upper',
      dayNumber: 1,
      exercises: [
        { name: 'Smith Machine Incline Bench Press', sets: makeSets(3, '10', 3) },
        { name: 'Chest Supported Row', sets: makeSets(3, '10', 3) },
        { name: 'Assisted Pull-up', sets: makeSets(4, 'AMRAP', 2) },
        { name: 'Dumbbell Shoulder Press', sets: makeSets(3, '10', 3) },
        { name: 'Face Pull', sets: makeSets(3, '12', 3) },
        { name: 'Cable Lateral Raise', sets: makeSets(3, '12', 3) },
      ],
    },
    {
      name: 'Lower',
      dayNumber: 2,
      exercises: [
        { name: 'Smith Machine Squat', sets: makeSets(3, '10', 3) },
        { name: 'Romanian Deadlift', sets: makeSets(3, '10', 3) },
        { name: 'Hip Thrust', sets: makeSets(3, '10', 3) },
        { name: 'Seated Leg Curl', sets: makeSets(3, '10', 3) },
        { name: 'Thigh Abductor', sets: makeSets(3, '12', 3) },
        { name: 'Thigh Adductor', sets: makeSets(2, '12', 3) },
        { name: 'Standing Calf Raise', sets: makeSets(3, '15', 3) },
      ],
    },
    {
      name: 'Full Body A',
      dayNumber: 3,
      exercises: [
        { name: 'Leg Press', sets: makeSets(3, '10', 3) },
        { name: 'Incline Dumbbell Press', sets: makeSets(3, '10', 3) },
        { name: 'Lat Pull-Around', sets: makeSets(4, '12', 3) },
        { name: 'Cable Kickback', sets: makeSets(3, '12', 3) },
        { name: 'Cable Lateral Raise', sets: makeSets(3, '12', 3) },
        { name: 'Standing Biceps Cable Curl', sets: makeSets(3, '12', 3) },
        { name: 'Cable Crunch', sets: makeSets(3, '12', 3) },
      ],
    },
    {
      name: 'Full Body B',
      dayNumber: 4,
      exercises: [
        { name: 'Lat Pulldown', sets: makeSets(3, '10', 3) },
        { name: 'Chest Press', sets: makeSets(3, '10', 3) },
        { name: 'Glute Bridge', sets: makeSets(3, '15', 3) },
        { name: 'Leg Extensions', sets: makeSets(3, '12', 3) },
        { name: 'Face Pull', sets: makeSets(3, '12', 3) },
        { name: 'Triceps Pushdown', sets: makeSets(3, '12', 3) },
        { name: 'Roman Chair Leg Lift', sets: makeSets(3, '12', 3) },
      ],
    },
  ],
}
