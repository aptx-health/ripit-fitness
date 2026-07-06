import { describe, expect, it } from 'vitest'
import { getDefaultMuscleBalanceTargets } from '@/lib/muscle-balance'
import {
  SIGNUP_INTENT_SENTENCES,
  synthesizeGoalSentences,
} from '@/lib/suggest/goal-sentences'
import type { UserTrainingProfileDTO } from '@/lib/user-training-profile'

function makeProfile(o: Partial<UserTrainingProfileDTO> = {}): UserTrainingProfileDTO {
  return {
    goalSentences: [],
    weeklyIntent: [],
    equipmentAvailable: [],
    bannedExerciseIds: [],
    ratioTargets: getDefaultMuscleBalanceTargets(),
    defaultIntensityPreference: null,
    birthYear: null,
    biologicalSex: null,
    heightCm: null,
    weightKg: null,
    injuryAreas: [],
    goalCategories: [],
    otherActivities: [],
    fauImportance: {},
    fauImportancePreset: null,
    targetSessionsPerWeek: null,
    targetMinutesPerSession: null,
    patternPreference: null,
    preferredDays: [],
    ...o,
  }
}

describe('synthesizeGoalSentences', () => {
  it('renders every wizard field in order, sorted by importance desc', () => {
    const profile = makeProfile({
      goalCategories: [
        { category: 'build_muscle', importance: 3 },
        { category: 'get_stronger', importance: 5 },
      ],
      otherActivities: [{ activity: 'cycling', importance: 4, cadence: '3x/week' }],
      targetSessionsPerWeek: 4,
      targetMinutesPerSession: 60,
      patternPreference: 'upper_lower',
      injuryAreas: [
        { area: 'knee', severity: 'avoid_loading' },
        { area: 'shoulder', severity: 'caution' },
        { area: 'wrist', severity: 'recovered' }, // historical → skipped
      ],
    })

    expect(synthesizeGoalSentences(profile, 'returning_to_training')).toEqual([
      'Get stronger (top priority).',
      'Build muscle (medium priority).',
      'Also does cycling 3x/week (high priority) — factor recovery.',
      'Aims for 4 sessions/week, ~60 min each.',
      'Prefers a upper/lower split.',
      'Active injury: knee.',
      'Mindful of injury: shoulder.',
      SIGNUP_INTENT_SENTENCES.returning_to_training,
    ])
  })

  it('reconciles injury severity vocabulary (avoid_loading vs caution)', () => {
    const profile = makeProfile({
      injuryAreas: [
        { area: 'lower_back', severity: 'avoid_loading' },
        { area: 'elbow', severity: 'caution' },
      ],
    })
    expect(synthesizeGoalSentences(profile, null)).toEqual([
      'Active injury: lower back.',
      'Mindful of injury: elbow.',
    ])
  })

  it('omits the sessions minutes clause when only cadence is set', () => {
    const profile = makeProfile({ targetSessionsPerWeek: 3 })
    expect(synthesizeGoalSentences(profile, null)).toEqual([
      'Aims for 3 sessions/week.',
    ])
  })

  it('drops no_preference pattern and unknown signup intents', () => {
    const profile = makeProfile({
      goalCategories: [{ category: 'lose_fat', importance: 2 }],
      patternPreference: 'no_preference',
    })
    // An unrecognized signupIntent (free-form column) is skipped, not mismapped.
    expect(synthesizeGoalSentences(profile, 'some_legacy_value')).toEqual([
      'Lose fat (low priority).',
    ])
  })

  it('keeps original order for equal-importance goals (stable sort)', () => {
    const profile = makeProfile({
      goalCategories: [
        { category: 'sport_performance', importance: 4 },
        { category: 'build_muscle', importance: 4 },
      ],
    })
    expect(synthesizeGoalSentences(profile, null)).toEqual([
      'Sport performance (high priority).',
      'Build muscle (high priority).',
    ])
  })

  it('falls back to a generic sentence when nothing is stated (spec rule 16)', () => {
    expect(synthesizeGoalSentences(makeProfile(), null)).toEqual([
      'General fitness; no specific goals stated yet.',
    ])
  })
})
