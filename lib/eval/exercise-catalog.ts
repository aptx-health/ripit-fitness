/**
 * Static exercise catalog for eval scenarios.
 *
 * The eval loop must run without a database, so candidate lists are
 * drawn from this fixed catalog instead of ExerciseDefinition rows.
 * IDs are stable slugs — human ratings and judge evidence reference
 * them across runs. FAU keys follow the repo canon (lib/fau-volume
 * ALL_FAUS, kebab-case); movement patterns and intensity classes
 * follow lib/exercises/auto-tag.
 *
 * This is deliberately a curated ~70-exercise subset, not the full
 * 873-exercise library: big enough that the planner has real choices
 * per FAU, small enough to audit by eye.
 */

import type { CandidateExercise } from './types'

export const EQUIPMENT_KEYS = [
  'barbell',
  'dumbbells',
  'cable',
  'machines',
  'bands',
  'bodyweight',
  'kettlebell',
] as const

export type EquipmentKey = (typeof EQUIPMENT_KEYS)[number]

type CatalogEntry = Omit<
  CandidateExercise,
  'user_preference_score' | 'user_preference_confidence'
>

function ex(
  id: string,
  name: string,
  primary: CandidateExercise['primary_faus'],
  secondary: CandidateExercise['secondary_faus'],
  equipment: EquipmentKey,
  movement: CandidateExercise['movement_pattern'],
  intensity: CandidateExercise['intensity_class'],
): CatalogEntry {
  return {
    id,
    name,
    primary_faus: primary,
    secondary_faus: secondary,
    equipment,
    movement_pattern: movement,
    intensity_class: intensity,
  }
}

export const EXERCISE_CATALOG: readonly CatalogEntry[] = [
  // Chest / horizontal push
  ex('barbell-bench-press', 'Barbell Bench Press', ['chest'], ['front-delts', 'triceps'], 'barbell', 'horizontal_push', 'heavy'),
  ex('dumbbell-bench-press', 'Dumbbell Bench Press', ['chest'], ['front-delts', 'triceps'], 'dumbbells', 'horizontal_push', 'heavy'),
  ex('incline-dumbbell-press', 'Incline Dumbbell Press', ['chest', 'front-delts'], ['triceps'], 'dumbbells', 'horizontal_push', 'moderate'),
  ex('machine-chest-press', 'Machine Chest Press', ['chest'], ['triceps'], 'machines', 'horizontal_push', 'moderate'),
  ex('cable-fly', 'Cable Fly', ['chest'], [], 'cable', 'isolation', 'light'),
  ex('pec-deck', 'Pec Deck', ['chest'], [], 'machines', 'isolation', 'light'),
  ex('push-up', 'Push-Up', ['chest'], ['front-delts', 'triceps'], 'bodyweight', 'horizontal_push', 'light'),
  ex('dip', 'Dip', ['chest', 'triceps'], ['front-delts'], 'bodyweight', 'vertical_push', 'moderate'),

  // Back / pulls
  ex('deadlift', 'Deadlift', ['lower-back', 'glutes', 'hamstrings'], ['traps', 'lats', 'forearms'], 'barbell', 'hinge', 'heavy'),
  ex('barbell-row', 'Barbell Row', ['mid-back', 'lats'], ['biceps', 'lower-back'], 'barbell', 'horizontal_pull', 'heavy'),
  ex('dumbbell-row', 'One-Arm Dumbbell Row', ['mid-back', 'lats'], ['biceps'], 'dumbbells', 'horizontal_pull', 'moderate'),
  ex('seated-cable-row', 'Seated Cable Row', ['mid-back'], ['lats', 'biceps'], 'cable', 'horizontal_pull', 'moderate'),
  ex('chest-supported-row', 'Chest Supported Row', ['mid-back'], ['lats', 'rear-delts'], 'machines', 'horizontal_pull', 'moderate'),
  ex('pull-up', 'Pull-Up', ['lats'], ['biceps', 'mid-back'], 'bodyweight', 'vertical_pull', 'moderate'),
  ex('lat-pulldown', 'Lat Pulldown', ['lats'], ['biceps'], 'cable', 'vertical_pull', 'moderate'),
  ex('band-pull-apart', 'Band Pull-Apart', ['rear-delts'], ['mid-back'], 'bands', 'isolation', 'light'),
  ex('straight-arm-pulldown', 'Straight-Arm Pulldown', ['lats'], [], 'cable', 'isolation', 'light'),
  ex('back-extension', 'Back Extension', ['lower-back'], ['glutes', 'hamstrings'], 'bodyweight', 'hinge', 'light'),

  // Shoulders / vertical push
  ex('overhead-press', 'Barbell Overhead Press', ['front-delts'], ['triceps', 'side-delts'], 'barbell', 'vertical_push', 'heavy'),
  ex('seated-dumbbell-press', 'Seated Dumbbell Shoulder Press', ['front-delts', 'side-delts'], ['triceps'], 'dumbbells', 'vertical_push', 'moderate'),
  ex('machine-shoulder-press', 'Machine Shoulder Press', ['front-delts'], ['triceps'], 'machines', 'vertical_push', 'moderate'),
  ex('lateral-raise', 'Dumbbell Lateral Raise', ['side-delts'], [], 'dumbbells', 'isolation', 'light'),
  ex('cable-lateral-raise', 'Cable Lateral Raise', ['side-delts'], [], 'cable', 'isolation', 'light'),
  ex('rear-delt-fly', 'Rear Delt Fly', ['rear-delts'], ['mid-back'], 'dumbbells', 'isolation', 'light'),
  ex('face-pull', 'Face Pull', ['rear-delts'], ['traps'], 'cable', 'isolation', 'light'),
  ex('dumbbell-shrug', 'Dumbbell Shrug', ['traps'], ['forearms'], 'dumbbells', 'isolation', 'light'),

  // Arms
  ex('barbell-curl', 'Barbell Curl', ['biceps'], ['forearms'], 'barbell', 'isolation', 'light'),
  ex('dumbbell-curl', 'Dumbbell Curl', ['biceps'], ['forearms'], 'dumbbells', 'isolation', 'light'),
  ex('hammer-curl', 'Hammer Curl', ['biceps', 'forearms'], [], 'dumbbells', 'isolation', 'light'),
  ex('cable-curl', 'Cable Curl', ['biceps'], [], 'cable', 'isolation', 'light'),
  ex('skull-crusher', 'Skull Crusher', ['triceps'], [], 'barbell', 'isolation', 'light'),
  ex('cable-pushdown', 'Cable Triceps Pushdown', ['triceps'], [], 'cable', 'isolation', 'light'),
  ex('overhead-triceps-extension', 'Overhead Dumbbell Triceps Extension', ['triceps'], [], 'dumbbells', 'isolation', 'light'),
  ex('close-grip-bench-press', 'Close-Grip Bench Press', ['triceps', 'chest'], ['front-delts'], 'barbell', 'horizontal_push', 'moderate'),
  ex('wrist-curl', 'Wrist Curl', ['forearms'], [], 'dumbbells', 'isolation', 'light'),

  // Quads / squat + lunge
  ex('barbell-back-squat', 'Barbell Back Squat', ['quads', 'glutes'], ['hamstrings', 'lower-back'], 'barbell', 'squat', 'heavy'),
  ex('front-squat', 'Front Squat', ['quads'], ['glutes', 'abs'], 'barbell', 'squat', 'heavy'),
  ex('goblet-squat', 'Goblet Squat', ['quads', 'glutes'], ['abs'], 'dumbbells', 'squat', 'moderate'),
  ex('leg-press', 'Leg Press', ['quads', 'glutes'], ['hamstrings'], 'machines', 'squat', 'moderate'),
  ex('hack-squat', 'Hack Squat', ['quads'], ['glutes'], 'machines', 'squat', 'heavy'),
  ex('leg-extension', 'Leg Extension', ['quads'], [], 'machines', 'isolation', 'light'),
  ex('walking-lunge', 'Walking Lunge', ['quads', 'glutes'], ['hamstrings'], 'dumbbells', 'lunge', 'moderate'),
  ex('bulgarian-split-squat', 'Bulgarian Split Squat', ['quads', 'glutes'], ['hamstrings'], 'dumbbells', 'lunge', 'moderate'),
  ex('step-up', 'Dumbbell Step-Up', ['quads', 'glutes'], [], 'dumbbells', 'lunge', 'moderate'),
  ex('bodyweight-squat', 'Bodyweight Squat', ['quads', 'glutes'], [], 'bodyweight', 'squat', 'light'),

  // Hamstrings / glutes / hinge
  ex('romanian-deadlift', 'Romanian Deadlift', ['hamstrings', 'glutes'], ['lower-back'], 'barbell', 'hinge', 'heavy'),
  ex('dumbbell-rdl', 'Dumbbell Romanian Deadlift', ['hamstrings', 'glutes'], ['lower-back'], 'dumbbells', 'hinge', 'moderate'),
  ex('lying-leg-curl', 'Lying Leg Curl', ['hamstrings'], [], 'machines', 'isolation', 'light'),
  ex('seated-leg-curl', 'Seated Leg Curl', ['hamstrings'], [], 'machines', 'isolation', 'light'),
  ex('hip-thrust', 'Barbell Hip Thrust', ['glutes'], ['hamstrings'], 'barbell', 'hinge', 'moderate'),
  ex('glute-bridge', 'Glute Bridge', ['glutes'], ['hamstrings'], 'bodyweight', 'hinge', 'light'),
  ex('cable-pull-through', 'Cable Pull-Through', ['glutes', 'hamstrings'], [], 'cable', 'hinge', 'light'),
  ex('kettlebell-swing', 'Kettlebell Swing', ['glutes', 'hamstrings'], ['lower-back'], 'kettlebell', 'hinge', 'moderate'),
  ex('good-morning', 'Good Morning', ['hamstrings', 'lower-back'], ['glutes'], 'barbell', 'hinge', 'heavy'),

  // Adductors / calves
  ex('adductor-machine', 'Hip Adduction Machine', ['adductors'], [], 'machines', 'isolation', 'light'),
  ex('standing-calf-raise', 'Standing Calf Raise', ['calves'], [], 'machines', 'isolation', 'light'),
  ex('seated-calf-raise', 'Seated Calf Raise', ['calves'], [], 'machines', 'isolation', 'light'),
  ex('single-leg-calf-raise', 'Single-Leg Calf Raise', ['calves'], [], 'bodyweight', 'isolation', 'light'),

  // Core
  ex('plank', 'Plank', ['abs'], ['obliques'], 'bodyweight', 'accessory', 'light'),
  ex('hanging-leg-raise', 'Hanging Leg Raise', ['abs'], ['obliques'], 'bodyweight', 'accessory', 'light'),
  ex('cable-crunch', 'Cable Crunch', ['abs'], [], 'cable', 'isolation', 'light'),
  ex('ab-wheel-rollout', 'Ab Wheel Rollout', ['abs'], ['obliques'], 'bodyweight', 'accessory', 'moderate'),
  ex('pallof-press', 'Pallof Press', ['obliques', 'abs'], [], 'cable', 'accessory', 'light'),
  ex('russian-twist', 'Russian Twist', ['obliques'], ['abs'], 'bodyweight', 'accessory', 'light'),
  ex('side-plank', 'Side Plank', ['obliques'], ['abs'], 'bodyweight', 'accessory', 'light'),

  // Carries / kettlebell
  ex('farmers-carry', "Farmer's Carry", ['forearms', 'traps'], ['abs'], 'dumbbells', 'carry', 'moderate'),
  ex('suitcase-carry', 'Suitcase Carry', ['obliques', 'forearms'], ['traps'], 'kettlebell', 'carry', 'moderate'),
  ex('kettlebell-goblet-squat', 'Kettlebell Goblet Squat', ['quads', 'glutes'], ['abs'], 'kettlebell', 'squat', 'moderate'),
  ex('kettlebell-press', 'Kettlebell Overhead Press', ['front-delts'], ['triceps', 'abs'], 'kettlebell', 'vertical_push', 'moderate'),
]

const byId = new Map(EXERCISE_CATALOG.map((e) => [e.id, e]))

export function getCatalogExercise(id: string): CatalogEntry | undefined {
  return byId.get(id)
}

export function exerciseName(id: string): string {
  return byId.get(id)?.name ?? id
}
