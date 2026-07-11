/**
 * Synthetic scenario generator for the Suggest Workout eval loop.
 *
 * Diversity strategy: scenarios are NOT free-form LLM generations (those
 * converge to samey median cases). Instead we take the stratified product
 * of base archetypes (#886) × edge-case modifiers, then apply seeded
 * jitter to the numbers. Coverage is structural, randomness only adds
 * texture. Same seed → identical scenarios, byte for byte.
 *
 * Each scenario carries `expectations`: scenario-specific things a good
 * suggestion must do. `hard` expectations become deterministic gates
 * (hard-checks.ts); `judge` expectations are injected into the judge
 * prompt so scoring reflects scenario intent, not judge taste.
 */

import { ALL_FAUS, type FAUKey } from '@/lib/fau-volume'
import type { MovementPattern } from '@/lib/exercises/auto-tag'

import { EXERCISE_CATALOG, type EquipmentKey } from './exercise-catalog'
import { createRng, type Rng } from './rng'
import type {
  ArchetypeKey,
  CandidateExercise,
  EphemeralContext,
  EvalScenario,
  ModifierKey,
  PerFAUState,
  ScenarioExpectation,
  SuggestPayload,
  TrainingState,
} from './types'

// ---------------------------------------------------------------------------
// Archetypes (mirrors #886 seeder archetypes)
// ---------------------------------------------------------------------------

type Emphasis = 'high' | 'med' | 'low' | 'none'

interface ArchetypeSpec {
  goals: string[]
  weeklyIntents: string[]
  equipment: EquipmentKey[]
  intensityPreference: 'hypertrophy' | 'strength' | 'balanced' | null
  /** FAUs not listed default to 'med'. */
  emphasis: Partial<Record<FAUKey, Emphasis>>
  /** Ratio targets; unlisted FAUs default to 1.0. */
  ratioTargets: Partial<Record<FAUKey, number>>
  /** Base top-set weight per movement pattern (lbs). */
  movementBases: Partial<Record<MovementPattern, number>>
  typicalRepRange: string
  typicalRpe: number
  totalSets14d: number
  likes: string[]
  dislikes: string[]
  suggestionsLast30d: number
  swapRate: number
}

const FULL_GYM: EquipmentKey[] = [
  'barbell',
  'dumbbells',
  'cable',
  'machines',
  'bands',
  'bodyweight',
]

export const ARCHETYPES: Record<ArchetypeKey, ArchetypeSpec> = {
  cyclist: {
    goals: [
      'Upper-body hypertrophy focus',
      'Spare legs for biking',
      'Improve bench press',
    ],
    weeklyIntents: [
      'Tilt toward upper body volume',
      'At most 1 leg day per week, never before a long ride',
    ],
    equipment: FULL_GYM,
    intensityPreference: 'hypertrophy',
    emphasis: {
      chest: 'high',
      lats: 'high',
      'mid-back': 'high',
      'side-delts': 'med',
      biceps: 'med',
      triceps: 'med',
      quads: 'low',
      hamstrings: 'low',
      glutes: 'low',
      calves: 'none',
      adductors: 'none',
    },
    ratioTargets: { chest: 1.3, lats: 1.2, 'mid-back': 1.2, quads: 0.6, hamstrings: 0.6, calves: 0.3 },
    movementBases: {
      horizontal_push: 185,
      vertical_push: 105,
      horizontal_pull: 155,
      vertical_pull: 160,
      squat: 165,
      hinge: 185,
    },
    typicalRepRange: '6-10',
    typicalRpe: 8,
    totalSets14d: 60,
    likes: ['incline-dumbbell-press', 'cable-fly', 'lat-pulldown'],
    dislikes: ['barbell-back-squat'],
    suggestionsLast30d: 6,
    swapRate: 0.22,
  },
  bodybuilder: {
    goals: ['Balanced hypertrophy everywhere', 'Bring up rear delts and hamstrings'],
    weeklyIntents: ['Train 4-5x per week', 'Every FAU at least once per week'],
    equipment: FULL_GYM,
    intensityPreference: 'hypertrophy',
    emphasis: {
      chest: 'high',
      lats: 'high',
      quads: 'high',
      hamstrings: 'med',
      glutes: 'med',
      'rear-delts': 'low',
      calves: 'low',
    },
    ratioTargets: { 'rear-delts': 1.2, hamstrings: 1.2 },
    movementBases: {
      horizontal_push: 205,
      vertical_push: 115,
      horizontal_pull: 165,
      vertical_pull: 180,
      squat: 225,
      hinge: 275,
      lunge: 90,
    },
    typicalRepRange: '8-12',
    typicalRpe: 8,
    totalSets14d: 95,
    likes: ['hack-squat', 'seated-cable-row', 'lateral-raise'],
    dislikes: ['good-morning'],
    suggestionsLast30d: 8,
    swapRate: 0.15,
  },
  powerlifter: {
    goals: ['Add 50 lbs to my squat this year', 'Keep bench moving'],
    weeklyIntents: ['Squat, bench or deadlift every session', 'Accessories only after main lifts'],
    equipment: FULL_GYM,
    intensityPreference: 'strength',
    emphasis: {
      quads: 'high',
      'lower-back': 'high',
      glutes: 'high',
      chest: 'high',
      hamstrings: 'med',
      'mid-back': 'med',
      'side-delts': 'low',
      biceps: 'low',
      calves: 'none',
      abs: 'low',
    },
    ratioTargets: { quads: 1.4, 'lower-back': 1.3, chest: 1.3, 'side-delts': 0.5, biceps: 0.5 },
    movementBases: {
      squat: 315,
      hinge: 405,
      horizontal_push: 245,
      vertical_push: 135,
      horizontal_pull: 185,
    },
    typicalRepRange: '1-5',
    typicalRpe: 9,
    totalSets14d: 45,
    likes: ['barbell-back-squat', 'deadlift', 'barbell-bench-press'],
    dislikes: ['leg-extension', 'cable-fly'],
    suggestionsLast30d: 3,
    swapRate: 0.35,
  },
  beginner: {
    goals: ['Get stronger and feel better', 'Learn the basic lifts safely'],
    weeklyIntents: ['Train 2-3x per week, full body'],
    equipment: ['dumbbells', 'machines', 'bodyweight'],
    intensityPreference: null,
    emphasis: {
      chest: 'med',
      quads: 'med',
      lats: 'low',
      'mid-back': 'low',
      hamstrings: 'low',
      glutes: 'med',
      'lower-back': 'none',
      traps: 'none',
      forearms: 'none',
      obliques: 'none',
    },
    ratioTargets: {},
    movementBases: {
      horizontal_push: 95,
      squat: 115,
    },
    typicalRepRange: '8-12',
    typicalRpe: 7,
    totalSets14d: 30,
    likes: [],
    dislikes: [],
    suggestionsLast30d: 0,
    swapRate: 0,
  },
  inconsistent: {
    goals: ['Get back into a routine', 'Stop losing the strength I build'],
    weeklyIntents: ['Something is better than nothing'],
    equipment: FULL_GYM,
    intensityPreference: 'balanced',
    emphasis: {
      chest: 'med',
      quads: 'low',
      lats: 'med',
      hamstrings: 'low',
      glutes: 'low',
      'rear-delts': 'none',
      calves: 'none',
      adductors: 'none',
    },
    ratioTargets: {},
    movementBases: {
      horizontal_push: 155,
      squat: 185,
      hinge: 225,
      horizontal_pull: 135,
    },
    typicalRepRange: '5-8',
    typicalRpe: 8,
    totalSets14d: 35,
    likes: ['dumbbell-bench-press'],
    dislikes: [],
    suggestionsLast30d: 2,
    swapRate: 0.4,
  },
}

// ---------------------------------------------------------------------------
// Modifiers (edge cases)
// ---------------------------------------------------------------------------

interface ScenarioDraft {
  archetype: ArchetypeKey
  spec: ArchetypeSpec
  goals: string[]
  weeklyIntents: string[]
  equipment: EquipmentKey[]
  bannedExerciseIds: string[]
  ephemeral: EphemeralContext
  expectations: ScenarioExpectation[]
  descriptionParts: string[]
  /** Post-hoc mutations applied to the built training state. */
  stateMutators: Array<(state: TrainingState, rng: Rng) => void>
  /** Prune/adjust the candidate list after building. */
  sparseCalibration: boolean
}

type ModifierSpec = (draft: ScenarioDraft, rng: Rng) => void

const INJURIES: Array<{
  site: string
  goal: string
  bans: string[]
  heavyFau: FAUKey
}> = [
  {
    site: 'lower back',
    goal: 'Recovering from a lower-back tweak (2 weeks ago) — no heavy spinal loading',
    bans: ['deadlift', 'good-morning', 'barbell-row'],
    heavyFau: 'lower-back',
  },
  {
    site: 'knee',
    goal: 'Right knee is cranky — avoiding heavy knee flexion under load',
    bans: ['barbell-back-squat', 'front-squat', 'hack-squat'],
    heavyFau: 'quads',
  },
  {
    site: 'shoulder',
    goal: 'Rehabbing a shoulder impingement — nothing heavy overhead',
    bans: ['overhead-press', 'barbell-bench-press'],
    heavyFau: 'front-delts',
  },
]

export const MODIFIERS: Record<ModifierKey, ModifierSpec> = {
  'injury-recovery': (draft, rng) => {
    const injury = rng.pick(INJURIES)
    draft.goals.push(injury.goal)
    draft.bannedExerciseIds.push(...injury.bans)
    draft.descriptionParts.push(`recovering ${injury.site}`)
    draft.expectations.push(
      {
        description: `No heavy-intensity exercise loading the ${injury.site} (primary FAU ${injury.heavyFau})`,
        kind: 'hard',
        rule: { type: 'exclude_heavy_fau', fau: injury.heavyFau },
      },
      {
        description: `Suggestion should acknowledge the ${injury.site} issue in rationale or warnings, and prefer joint-friendly variants`,
        kind: 'judge',
      },
    )
  },
  deload: (draft) => {
    draft.goals.push('This is a planned deload week — reduce load and volume')
    draft.ephemeral.intensity_vibe = 'easy'
    draft.descriptionParts.push('deload week')
    draft.stateMutators.push((state) => {
      for (const f of state.per_fau) {
        f.rolling_7d_sets = Math.round(f.rolling_7d_sets * 1.4)
        f.rolling_14d_sets = Math.round(f.rolling_14d_sets * 1.3)
      }
    })
    draft.expectations.push({
      description:
        'All options should be light/moderate intensity with modest exercise counts; a heavy-compound-centric option contradicts the stated deload',
      kind: 'judge',
    })
  },
  'sparse-data': (draft) => {
    draft.sparseCalibration = true
    draft.descriptionParts.push('sparse history')
    draft.stateMutators.push((state) => {
      state.per_movement_calibration = state.per_movement_calibration.slice(0, 1)
      state.preferences_summary = {
        high_confidence_likes: [],
        high_confidence_dislikes: [],
        low_confidence_note: 'Most exercises <3 observations — defer to candidate list',
      }
      state.goal_progress = state.goal_progress.map((g) => ({
        ...g,
        trend: 'new',
        weeks_observed: 1,
        recent_top_sets_lbs: g.recent_top_sets_lbs.slice(-1),
      }))
      state.recent_feedback = {
        suggestions_last_30d: 0,
        swap_rate: 0,
        common_swaps: [],
        common_additions_fau: [],
        common_deletions_fau: [],
      }
    })
    draft.expectations.push({
      description:
        'Rationales must not claim knowledge of trends/preferences that the sparse data cannot support (no "you have been progressing on X" with one observation)',
      kind: 'judge',
    })
  },
  'competing-goals': (draft) => {
    draft.goals.push(
      'Training for a half marathon in 8 weeks',
      'Also want to add 30 lbs to my bench by fall',
    )
    draft.weeklyIntents.push('Run 3x per week (Tue/Thu/Sat)')
    draft.descriptionParts.push('competing goals')
    draft.expectations.push({
      description:
        'Goals conflict (running volume vs pressing strength). Options should resolve the tension differently and say how; ignoring one goal silently is a miss',
      kind: 'judge',
    })
  },
  'activity-overlap': (draft, rng) => {
    draft.ephemeral.deprioritize_freetext = 'long bike ride tomorrow, keep legs fresh'
    draft.descriptionParts.push('legs needed tomorrow but legs neglected')
    draft.stateMutators.push((state) => {
      for (const f of state.per_fau) {
        if (f.fau === 'quads' || f.fau === 'hamstrings' || f.fau === 'glutes') {
          f.last_session_days_ago = rng.int(9, 14)
          f.rolling_7d_sets = 0
          f.rolling_14d_sets = rng.int(0, 3)
          f.actual_14d_share = 0.01
          f.deficit_share = Math.max(0.06, f.target_share - 0.01)
          f.status = 'neglected'
        }
      }
    })
    draft.expectations.push(
      {
        description:
          'User Preference option must respect "keep legs fresh" (no heavy lower-body work) even though legs show the largest deficit',
        kind: 'judge',
      },
      {
        description:
          'If Data Driven addresses the leg deficit anyway, it must explicitly surface the conflict with tomorrow\'s ride (rationale or warnings)',
        kind: 'judge',
      },
    )
  },
  'time-crunch': (draft) => {
    draft.ephemeral.time_budget_minutes = 15
    draft.descriptionParts.push('15-minute window')
    draft.expectations.push(
      {
        description: '15-minute budget allows at most 3 exercises',
        kind: 'hard',
        rule: { type: 'max_exercise_count', max: 3 },
      },
      {
        description:
          'With 15 minutes, exercises should be the highest-leverage picks (compounds or biggest-deficit FAUs), not a filler circuit',
        kind: 'judge',
      },
    )
  },
  'equipment-limited': (draft) => {
    draft.ephemeral.equipment_override = ['dumbbells', 'bodyweight']
    draft.descriptionParts.push('hotel gym (dumbbells + bodyweight)')
    draft.expectations.push({
      description:
        'Candidate pool is small; the three options must still be genuinely distinct rather than the same 5 exercises reshuffled',
      kind: 'judge',
    })
  },
  'return-from-break': (draft, rng) => {
    draft.goals.push('First session back after 4 weeks off (work travel)')
    draft.descriptionParts.push('first session after 4 weeks off')
    draft.stateMutators.push((state) => {
      for (const f of state.per_fau) {
        if (f.last_session_days_ago !== null) {
          f.last_session_days_ago = rng.int(26, 34)
        }
        f.last_heavy_days_ago = f.last_heavy_days_ago === null ? null : rng.int(26, 34)
        f.rolling_7d_sets = 0
        f.rolling_14d_sets = 0
        f.status = f.target_share > 0.02 ? 'neglected' : f.status
      }
      state.recent_feedback.suggestions_last_30d = 0
    })
    draft.expectations.push({
      description:
        'Conservative re-entry: moderate volume, no max-effort heavy singles energy; rationale should acknowledge the layoff rather than resume as if nothing happened',
      kind: 'judge',
    })
  },
  'all-satisfied': (draft, rng) => {
    draft.descriptionParts.push('no deficits anywhere')
    draft.stateMutators.push((state) => {
      for (const f of state.per_fau) {
        f.actual_14d_share = f.target_share
        f.deficit_share = 0
        f.status = 'balanced'
        if (f.last_session_days_ago !== null) {
          f.last_session_days_ago = rng.int(1, 4)
        }
      }
      state.weekly_intent_status = state.weekly_intent_status.map((w) => ({
        intent_summary: w.intent_summary,
        satisfied_this_week: true,
        evidence: 'All weekly targets met as of today',
      }))
    })
    draft.expectations.push({
      description:
        'With no deficit to chase, Data Driven should lean on recency/rotation logic and Wild Card should offer genuine novelty — three near-identical options is the failure mode here',
      kind: 'judge',
    })
  },
  'ambiguous-freetext': (draft, rng) => {
    draft.ephemeral.deprioritize_freetext = rng.pick([
      'wheels are smoked',
      'dead after yesterday, go easy on the pushing stuff',
      'skip anything spicy for my back',
    ])
    draft.descriptionParts.push(`slang free-text: "${draft.ephemeral.deprioritize_freetext}"`)
    draft.expectations.push({
      description: `Free-text "${draft.ephemeral.deprioritize_freetext}" must be interpreted correctly (wheels=legs, pushing=chest/shoulders/triceps, spicy back=spinal loading) and honored in User Preference`,
      kind: 'judge',
    })
  },
}

export const ARCHETYPE_KEYS = Object.keys(ARCHETYPES) as ArchetypeKey[]
export const MODIFIER_KEYS = Object.keys(MODIFIERS) as ModifierKey[]

// ---------------------------------------------------------------------------
// Matrix
// ---------------------------------------------------------------------------

export interface ScenarioCombo {
  archetype: ArchetypeKey
  modifiers: ModifierKey[]
}

/**
 * Deterministic combo order: 5 plain archetypes first, then modifiers
 * round-robin with rotating archetypes — positions 5..14 cover all 10
 * modifiers once, so even a 15-scenario run sees every edge case.
 * 55 combos total before repeating.
 */
export function buildScenarioMatrix(): ScenarioCombo[] {
  const combos: ScenarioCombo[] = ARCHETYPE_KEYS.map((a) => ({
    archetype: a,
    modifiers: [],
  }))
  for (let round = 0; round < ARCHETYPE_KEYS.length; round++) {
    for (let m = 0; m < MODIFIER_KEYS.length; m++) {
      combos.push({
        archetype: ARCHETYPE_KEYS[(m + round) % ARCHETYPE_KEYS.length],
        modifiers: [MODIFIER_KEYS[m]],
      })
    }
  }
  return combos
}

// ---------------------------------------------------------------------------
// Training-state synthesis
// ---------------------------------------------------------------------------

const EMPHASIS_MULTIPLIER: Record<Emphasis, number> = {
  high: 1.6,
  med: 1.0,
  low: 0.4,
  none: 0.03,
}

/** Fixed "now" so payloads are stable across wall-clock time. */
const EVAL_NOW = '2026-06-29T18:00:00Z'
const EVAL_DOW = 'monday'

function buildPerFAU(spec: ArchetypeSpec, rng: Rng): PerFAUState[] {
  const weights = ALL_FAUS.map((fau) => spec.ratioTargets[fau] ?? 1.0)
  const weightSum = weights.reduce((a, b) => a + b, 0)

  const rawActuals = ALL_FAUS.map((fau) => {
    const emphasis = spec.emphasis[fau] ?? 'med'
    const jitter = 0.8 + rng.next() * 0.4
    return EMPHASIS_MULTIPLIER[emphasis] * jitter
  })
  const actualSum = rawActuals.reduce((a, b) => a + b, 0)

  return ALL_FAUS.map((fau, i) => {
    const emphasis = spec.emphasis[fau] ?? 'med'
    const targetShare = round4(weights[i] / weightSum)
    const actualShare = round4(rawActuals[i] / actualSum)
    const deficit = round4(targetShare - actualShare)
    const sets14 = Math.round(actualShare * spec.totalSets14d)
    const sets7 = Math.min(sets14, Math.round(sets14 * (0.35 + rng.next() * 0.3)))

    let lastSession: number | null
    if (emphasis === 'high') lastSession = rng.int(1, 3)
    else if (emphasis === 'med') lastSession = rng.int(2, 6)
    else if (emphasis === 'low') lastSession = rng.int(6, 14)
    else lastSession = rng.chance(0.5) ? rng.int(21, 45) : null

    const trainedHeavy = emphasis === 'high' || (emphasis === 'med' && rng.chance(0.6))
    const lastHeavy =
      lastSession === null || !trainedHeavy ? null : lastSession + rng.int(0, 3)

    const status: PerFAUState['status'] =
      deficit > 0.03 ? 'neglected' : deficit < -0.03 ? 'over' : 'balanced'

    return {
      fau,
      last_session_days_ago: lastSession,
      last_heavy_days_ago: lastHeavy,
      rolling_7d_sets: sets7,
      rolling_14d_sets: sets14,
      target_share: targetShare,
      actual_14d_share: actualShare,
      deficit_share: deficit,
      status,
    }
  })
}

function buildTrainingState(spec: ArchetypeSpec, goals: string[], intents: string[], rng: Rng): TrainingState {
  const perFau = buildPerFAU(spec, rng.fork('fau'))

  const calibRng = rng.fork('calibration')
  const perMovement = Object.entries(spec.movementBases).map(([pattern, base]) => {
    const step = Math.max(2.5, Math.round(base * 0.015))
    const trendUp = calibRng.chance(0.7)
    const observations: number[] = []
    let w = base - (trendUp ? step * 4 : 0)
    for (let i = 0; i < 5; i++) {
      observations.push(Math.round(w / 5) * 5)
      if (trendUp) w += calibRng.chance(0.7) ? step : 0
      else w += calibRng.chance(0.3) ? step : -(calibRng.chance(0.3) ? step : 0)
    }
    return {
      movement_pattern: pattern as MovementPattern,
      current_ewma_top_weight_lbs: Math.round((observations.at(-1) ?? base) * 0.98),
      recent_observations: observations,
      typical_rep_range: spec.typicalRepRange,
      typical_rpe: spec.typicalRpe,
      last_session_days_ago: calibRng.int(2, 7),
    }
  })

  const intentRng = rng.fork('intents')
  const weeklyIntentStatus = intents.map((intent) => {
    const satisfied = intentRng.chance(0.55)
    return satisfied
      ? {
          intent_summary: intent,
          satisfied_this_week: true,
          evidence: 'Met based on last 7d logged sets',
        }
      : {
          intent_summary: intent,
          satisfied_this_week: false,
          last_satisfied_days_ago: intentRng.int(7, 16),
        }
  })

  const goalRng = rng.fork('goals')
  const goalProgress = goals.slice(0, 2).map((goal) => {
    const trend = goalRng.pick(['progressing', 'stalled', 'progressing', 'new'] as const)
    const calib = perMovement[0]
    return {
      goal,
      interpretation: calib
        ? `${calib.movement_pattern} EWMA + top-set trend`
        : 'volume trend',
      recent_top_sets_lbs: calib ? calib.recent_observations : [],
      trend,
      weeks_observed: trend === 'new' ? 1 : goalRng.int(3, 8),
    }
  })

  return {
    now: EVAL_NOW,
    today_dow: EVAL_DOW,
    per_fau: perFau,
    per_movement_calibration: perMovement,
    weekly_intent_status: weeklyIntentStatus,
    goal_progress: goalProgress,
    recent_feedback: {
      suggestions_last_30d: spec.suggestionsLast30d,
      swap_rate: spec.swapRate,
      common_swaps:
        spec.suggestionsLast30d > 2
          ? [{ from: 'barbell-bench-press', to: 'dumbbell-bench-press', count: 2 }]
          : [],
      common_additions_fau: spec.suggestionsLast30d > 2 ? ['biceps', 'side-delts'] : [],
      common_deletions_fau: spec.suggestionsLast30d > 2 ? ['quads'] : [],
    },
    preferences_summary: {
      high_confidence_likes: spec.likes,
      high_confidence_dislikes: spec.dislikes,
      low_confidence_note:
        spec.likes.length + spec.dislikes.length === 0
          ? 'No high-confidence preferences yet — defer to candidate list'
          : null,
    },
  }
}

// ---------------------------------------------------------------------------
// Ephemeral context
// ---------------------------------------------------------------------------

const PRIORITIZE_POOL = [
  null,
  null,
  'want to hit chest hard',
  'feeling strong today',
  'back day if possible',
]
const DEPRIORITIZE_POOL = [null, null, null, 'legs a bit sore', 'shoulder feels off']

function buildEphemeral(rng: Rng): EphemeralContext {
  return {
    time_budget_minutes: rng.pick([30, 45, 45, 60, 60, 90]),
    intensity_vibe: rng.pick(['easy', 'solid', 'solid', 'heavy'] as const),
    deprioritize_freetext: rng.pick(DEPRIORITIZE_POOL),
    prioritize_freetext: rng.pick(PRIORITIZE_POOL),
    equipment_override: null,
  }
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

function buildCandidates(
  equipment: string[],
  banned: string[],
  likes: string[],
  dislikes: string[],
  rng: Rng,
): CandidateExercise[] {
  const equipmentSet = new Set(equipment)
  const bannedSet = new Set(banned)
  return EXERCISE_CATALOG.filter(
    (e) => equipmentSet.has(e.equipment) && !bannedSet.has(e.id),
  ).map((e) => {
    if (likes.includes(e.id)) {
      return {
        ...e,
        user_preference_score: round2(0.75 + rng.next() * 0.15),
        user_preference_confidence: 'high' as const,
      }
    }
    if (dislikes.includes(e.id)) {
      return {
        ...e,
        user_preference_score: round2(0.1 + rng.next() * 0.15),
        user_preference_confidence: 'high' as const,
      }
    }
    return { ...e }
  })
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export interface GenerateOptions {
  count: number
  seed: string
}

export function generateScenarios(options: GenerateOptions): EvalScenario[] {
  const matrix = buildScenarioMatrix()
  const scenarios: EvalScenario[] = []

  for (let i = 0; i < options.count; i++) {
    const combo = matrix[i % matrix.length]
    const scenarioSeed = `${options.seed}#${i}`
    scenarios.push(buildScenario(combo, scenarioSeed, i))
  }
  return scenarios
}

function buildScenario(combo: ScenarioCombo, seed: string, index: number): EvalScenario {
  const rng = createRng(seed)
  const spec = ARCHETYPES[combo.archetype]

  const draft: ScenarioDraft = {
    archetype: combo.archetype,
    spec,
    goals: [...spec.goals],
    weeklyIntents: [...spec.weeklyIntents],
    equipment: [...spec.equipment],
    bannedExerciseIds: [],
    ephemeral: buildEphemeral(rng.fork('ephemeral')),
    expectations: [],
    descriptionParts: [combo.archetype],
    stateMutators: [],
    sparseCalibration: false,
  }

  const modifierRng = rng.fork('modifiers')
  for (const modifier of combo.modifiers) {
    MODIFIERS[modifier](draft, modifierRng)
  }

  const trainingState = buildTrainingState(spec, draft.goals, draft.weeklyIntents, rng.fork('state'))
  const mutatorRng = rng.fork('mutators')
  for (const mutate of draft.stateMutators) mutate(trainingState, mutatorRng)

  const effectiveEquipment = draft.ephemeral.equipment_override ?? draft.equipment
  const candidates = buildCandidates(
    effectiveEquipment,
    draft.bannedExerciseIds,
    draft.sparseCalibration ? [] : spec.likes,
    draft.sparseCalibration ? [] : spec.dislikes,
    rng.fork('candidates'),
  )

  const payload: SuggestPayload = {
    durable_profile: {
      goal_sentences: draft.goals,
      weekly_intent: draft.weeklyIntents,
      equipment_available: draft.equipment,
      banned_exercise_ids: draft.bannedExerciseIds,
      default_intensity_preference: spec.intensityPreference,
      ratio_targets: spec.ratioTargets,
    },
    ephemeral_context: draft.ephemeral,
    training_state: trainingState,
    candidate_exercises: candidates,
  }

  const modifierSlug = combo.modifiers.length > 0 ? `+${combo.modifiers.join('+')}` : ''
  return {
    id: `${String(index).padStart(3, '0')}-${combo.archetype}${modifierSlug}`,
    seed,
    archetype: combo.archetype,
    modifiers: combo.modifiers,
    description: `${draft.descriptionParts.join(', ')} — ${draft.ephemeral.time_budget_minutes}min, ${draft.ephemeral.intensity_vibe}`,
    payload,
    expectations: draft.expectations,
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
