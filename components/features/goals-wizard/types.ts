import type { UserTrainingProfileDTO } from '@/lib/user-training-profile'

/**
 * The slice of the training profile the Goals Wizard captures. Excludes
 * interview-owned and separately-owned fields (equipment #927, ratios #928).
 * Kept structurally identical to the DTO so values round-trip through the
 * `/api/profile/training` accessor without translation.
 */
export type WizardAnswers = Pick<
  UserTrainingProfileDTO,
  | 'goalCategories'
  | 'otherActivities'
  | 'defaultIntensityPreference'
  | 'targetSessionsPerWeek'
  | 'targetMinutesPerSession'
  | 'patternPreference'
  | 'preferredDays'
  | 'injuryAreas'
  | 'birthYear'
  | 'biologicalSex'
  | 'heightCm'
  | 'weightKg'
>

export const WIZARD_STEP_IDS = [
  'goals',
  'rhythm',
  'injuries',
  'demographics',
] as const

export type WizardStepId = (typeof WIZARD_STEP_IDS)[number]

export const WIZARD_STEPS: { id: WizardStepId; title: string; blurb: string }[] =
  [
    {
      id: 'goals',
      title: 'What are you here for?',
      blurb: 'Pick what matters, you can choose more than one.',
    },
    {
      id: 'rhythm',
      title: 'How do you want to train?',
      blurb: 'A rough idea is plenty. Change it anytime.',
    },
    {
      id: 'injuries',
      title: 'Anything we should work around?',
      blurb: 'Flag sore spots so we can keep you safe. Skip if none.',
    },
    {
      id: 'demographics',
      title: 'A little about you',
      blurb: 'All optional — it helps tailor suggestions.',
    },
  ]

/** Empty answer set — every field null/empty so skipped steps stay unset. */
export function emptyAnswers(): WizardAnswers {
  return {
    goalCategories: [],
    otherActivities: [],
    defaultIntensityPreference: null,
    targetSessionsPerWeek: null,
    targetMinutesPerSession: null,
    patternPreference: null,
    preferredDays: [],
    injuryAreas: [],
    birthYear: null,
    biologicalSex: null,
    heightCm: null,
    weightKg: null,
  }
}

/** Which answer fields each step owns — used to PATCH only that step's slice. */
export const STEP_FIELDS: Record<WizardStepId, (keyof WizardAnswers)[]> = {
  goals: ['goalCategories', 'otherActivities', 'defaultIntensityPreference'],
  rhythm: [
    'targetSessionsPerWeek',
    'targetMinutesPerSession',
    'patternPreference',
    'preferredDays',
  ],
  injuries: ['injuryAreas'],
  demographics: ['birthYear', 'biologicalSex', 'heightCm', 'weightKg'],
}
