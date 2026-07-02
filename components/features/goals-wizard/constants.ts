import type {
  BiologicalSex,
  GoalCategory,
  InjuryArea,
  InjurySeverity,
  OtherActivity,
  PatternPreference,
  PreferredDay,
} from '@/lib/user-training-profile'

/**
 * Human-readable, plain-language labels for the Goals Wizard. Wording targets
 * the beta cohort of complete beginners (the "mom test"): no jargon, sensible
 * framing. Keys mirror the canonical vocabularies in
 * `lib/user-training-profile.ts` exactly.
 */

export const GOAL_CATEGORY_LABELS: Record<
  GoalCategory,
  { label: string; description: string }
> = {
  build_muscle: {
    label: 'Build muscle',
    description: 'Get bigger, add size',
  },
  get_stronger: {
    label: 'Get stronger',
    description: 'Lift heavier over time',
  },
  lose_fat: {
    label: 'Lose fat',
    description: 'Lean out, drop weight',
  },
  general_fitness: {
    label: 'General fitness',
    description: 'Feel good, stay healthy',
  },
  sport_performance: {
    label: 'Sport performance',
    description: 'Train for a sport or activity',
  },
  rehabilitation: {
    label: 'Return from injury',
    description: 'Rebuild carefully after a setback',
  },
  aesthetic_specific: {
    label: 'Look a certain way',
    description: 'Target specific areas',
  },
  other: {
    label: 'Something else',
    description: 'A goal not listed here',
  },
}

export const OTHER_ACTIVITY_LABELS: Record<OtherActivity, string> = {
  cycling: 'Cycling',
  running: 'Running',
  hiking: 'Hiking',
  climbing: 'Climbing',
  yoga: 'Yoga',
  team_sports: 'Team sports',
  manual_labor: 'Physical job',
  other: 'Other activity',
}

export const PATTERN_PREFERENCE_LABELS: Record<
  PatternPreference,
  { label: string; description: string }
> = {
  no_preference: {
    label: 'No preference',
    description: "Let the app decide — a good default",
  },
  full_body: {
    label: 'Full body',
    description: 'Train everything each session',
  },
  upper_lower: {
    label: 'Upper / lower',
    description: 'Alternate upper- and lower-body days',
  },
  push_pull_legs: {
    label: 'Push / pull / legs',
    description: 'Three rotating focus days',
  },
  body_part_split: {
    label: 'Body-part split',
    description: 'One or two muscle groups per day',
  },
  custom: {
    label: 'Something custom',
    description: 'My own split',
  },
}

export const INJURY_AREA_LABELS: Record<InjuryArea, string> = {
  neck: 'Neck',
  shoulder: 'Shoulder',
  elbow: 'Elbow',
  wrist: 'Wrist',
  upper_back: 'Upper back',
  lower_back: 'Lower back',
  hip: 'Hip',
  knee: 'Knee',
  ankle: 'Ankle',
}

export const INJURY_SEVERITY_LABELS: Record<
  InjurySeverity,
  { label: string; description: string }
> = {
  avoid_loading: {
    label: "Avoid it",
    description: "Don't load this area at all right now",
  },
  caution: {
    label: 'Be careful',
    description: 'Okay to train, but ease into it',
  },
  recovered: {
    label: 'All healed',
    description: 'Just so the app knows the history',
  },
}

export const BIOLOGICAL_SEX_LABELS: Record<BiologicalSex, string> = {
  female: 'Female',
  male: 'Male',
  prefer_not_to_say: 'Prefer not to say',
}

export const PREFERRED_DAY_LABELS: Record<PreferredDay, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

/** Importance scale (1-5) surfaced as friendly words, not raw numbers. */
export const IMPORTANCE_LABELS: Record<number, string> = {
  1: 'Nice to have',
  2: 'Minor',
  3: 'Matters',
  4: 'Important',
  5: 'Top priority',
}
