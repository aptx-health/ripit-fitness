import { ProgramSpec, makeSetsRpe } from '../helpers'

export const barbellBasics: ProgramSpec = {
  name: 'Barbell Basics 5x5',
  description:
    'Starting Strength-adjacent program. Three big compound lifts per day at 5x5, plus cable accessories. Trap bar deadlift over conventional for safety. 3x/week alternating A/B. Uses RPE for intensity — start at ~75% of 1RM.',

  workouts: [
    {
      name: 'Barbell Basics A',
      dayNumber: 1,
      exercises: [
        { name: 'Barbell Squat', sets: makeSetsRpe(5, '5', 7) },
        { name: 'Bench Press', sets: makeSetsRpe(5, '5', 7) },
        { name: 'Bent Over Barbell Row', sets: makeSetsRpe(5, '5', 7) },
        { name: 'Standing Biceps Cable Curl', sets: makeSetsRpe(3, '10', 6) },
        { name: 'Face Pull', sets: makeSetsRpe(3, '12', 6) },
      ],
    },
    {
      name: 'Barbell Basics B',
      dayNumber: 2,
      exercises: [
        { name: 'Trap Bar Deadlift', sets: makeSetsRpe(5, '5', 7) },
        { name: 'Standing Dumbbell Press', sets: makeSetsRpe(5, '5', 7) },
        { name: 'Lat Pulldown', sets: makeSetsRpe(5, '5', 7) },
        { name: 'Triceps Pushdown', sets: makeSetsRpe(3, '10', 6) },
        { name: 'One-Arm Side Laterals', sets: makeSetsRpe(3, '12', 6) },
      ],
    },
  ],
}
