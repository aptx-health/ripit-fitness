/**
 * Deterministic candidate pre-filter + preference scoring for the Suggest
 * payload (issue #920, docs/SUGGEST_PAYLOAD_SPEC.md § candidate_exercises &
 * preferences_summary).
 *
 * Pure functions over already-fetched data (catalog rows + decayed preference
 * evidence) so they are unit-testable without a DB. The builder does the I/O.
 *
 * The filter is intentionally coarse — equipment match, FAU relevance, not
 * banned. The LLM ranks the survivors (spec rule 10); this stage only removes
 * exercises the user physically cannot do or has been told to avoid.
 */

import {
  type BetaParams,
  betaMean,
  betaVariance,
  decayBeta,
} from '@/lib/learning/math'
import type { CandidateExercise } from '@/lib/llm/prompts/suggest-workout/schemas'

/** Minimal ExerciseDefinition shape the candidate stage needs. */
export interface CatalogExercise {
  id: string
  name: string
  equipment: string[]
  primaryFAUs: string[]
  secondaryFAUs: string[]
  movementPattern: string | null
  intensityClass: string | null
}

/**
 * Beta variance below this counts a preference as high-confidence (spec rule 7,
 * the "0.05?" placeholder made concrete). The uniform Beta(1,1) prior has
 * variance 1/12 ≈ 0.083, so the prior alone never qualifies.
 */
export const HIGH_CONFIDENCE_MAX_VARIANCE = 0.05

/** Preference posterior after decay-to-now, per exercise definition. */
export interface DecayedPreference {
  mean: number
  variance: number
  confident: boolean
}

/**
 * Equipment token aliases: the profile / Goals Wizard vocabulary (plurals like
 * `dumbbells`, `machines`, `bands`) reconciled to the singular canonical keys
 * `ExerciseDefinition.equipment` stores (lib/constants/program-metadata
 * EQUIPMENT_LABELS). Anything not listed falls back to a whitespace/hyphen →
 * underscore normalization.
 */
const EQUIPMENT_ALIASES: Record<string, string> = {
  dumbbells: 'dumbbell',
  machines: 'machine',
  weights: 'weight',
  band: 'bands',
  resistance_band: 'bands',
  'resistance band': 'bands',
  'resistance-band': 'bands',
  bodyweights: 'bodyweight',
  'body weight': 'bodyweight',
  'body only': 'bodyweight',
}

/**
 * Accessory equipment that never gates availability: benches, bars and small
 * tools are assumed present whenever the user has any primary equipment, so a
 * "dumbbell + bench" exercise isn't excluded just because the profile lists
 * only `dumbbells`.
 */
const AMBIENT_EQUIPMENT = new Set<string>([
  'bench',
  'incline_bench',
  'decline_bench',
  'preacher_bench',
  'pull_up_bar',
  'dip_bars',
  'parallel_bars',
  'ez_bar',
  'ab_wheel',
  'foam_roller',
  'roman_chair',
  'weight_belt',
])

function normalizeEquipmentToken(token: string): string {
  const lower = token.toLowerCase().trim()
  return EQUIPMENT_ALIASES[lower] ?? lower.replace(/[\s-]/g, '_')
}

/**
 * Build the set of available equipment tokens. `equipment_override` (from the
 * request) wins over the durable profile list. An EMPTY list is treated as "no
 * constraint" (assume full access) rather than "nothing available" — the latter
 * would strand a user who never filled in equipment with a bodyweight-only
 * (possibly empty) candidate list.
 */
export function resolveAvailableEquipment(equipment: readonly string[]): {
  available: Set<string>
  unconstrained: boolean
} {
  const normalized = equipment.map(normalizeEquipmentToken).filter(Boolean)
  const available = new Set(normalized)
  available.add('bodyweight')
  return { available, unconstrained: normalized.length === 0 }
}

/** Does the user have the equipment this exercise requires? */
export function isEquipmentAvailable(
  exercise: CatalogExercise,
  available: Set<string>,
  unconstrained: boolean,
): boolean {
  if (unconstrained) return true
  const required = exercise.equipment
    .map(normalizeEquipmentToken)
    .filter((token) => !AMBIENT_EQUIPMENT.has(token))
  return required.every((token) => available.has(token))
}

const INTENSITY_CLASSES = new Set(['heavy', 'moderate', 'light'])

function toIntensityClass(value: string | null): CandidateExercise['intensity_class'] {
  return value && INTENSITY_CLASSES.has(value)
    ? (value as CandidateExercise['intensity_class'])
    : 'moderate' // untagged → moderate (spec candidate_exercises table)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Filter the catalog to eligible candidates and attach high-confidence
 * preference scores. Order is by exercise id for a stable, reproducible list
 * (spec rule 10: candidates are sent unordered — any consistent order is fine).
 */
export function buildCandidateExercises(
  catalog: readonly CatalogExercise[],
  params: {
    available: Set<string>
    unconstrained: boolean
    bannedIds: ReadonlySet<string>
    preferences: ReadonlyMap<string, DecayedPreference>
  },
): CandidateExercise[] {
  return catalog
    .filter((ex) => ex.primaryFAUs.length > 0) // FAU relevance: trains something
    .filter((ex) => !params.bannedIds.has(ex.id)) // hard bans
    .filter((ex) => isEquipmentAvailable(ex, params.available, params.unconstrained))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((ex) => {
      const candidate: CandidateExercise = {
        id: ex.id,
        name: ex.name,
        primary_faus: ex.primaryFAUs,
        secondary_faus: ex.secondaryFAUs,
        equipment: ex.equipment[0] ?? 'bodyweight',
        movement_pattern: ex.movementPattern,
        intensity_class: toIntensityClass(ex.intensityClass),
      }
      const pref = params.preferences.get(ex.id)
      if (pref?.confident) {
        // Spec rule 8: score is OMITTED (not null) when low-confidence.
        candidate.user_preference_score = round2(pref.mean)
        candidate.user_preference_confidence = 'high'
      }
      return candidate
    })
}

/**
 * Decay each stored preference to `now` and classify confidence. Keyed by
 * exercise definition id.
 */
export function decayPreferences(
  rows: readonly { exerciseDefinitionId: string; alpha: number; beta: number; lastUpdatedAt: Date }[],
  now: Date,
  weeklyDecayFactor?: number,
): Map<string, DecayedPreference> {
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
  const out = new Map<string, DecayedPreference>()
  for (const row of rows) {
    const weeks = Math.max(0, (now.getTime() - row.lastUpdatedAt.getTime()) / MS_PER_WEEK)
    const base: BetaParams = { alpha: row.alpha, beta: row.beta }
    const decayed = weeklyDecayFactor
      ? decayBeta(base, weeks, weeklyDecayFactor)
      : decayBeta(base, weeks)
    const variance = betaVariance(decayed)
    out.set(row.exerciseDefinitionId, {
      mean: betaMean(decayed),
      variance,
      confident: variance < HIGH_CONFIDENCE_MAX_VARIANCE,
    })
  }
  return out
}

export interface PreferencesSummary {
  high_confidence_likes: string[]
  high_confidence_dislikes: string[]
  low_confidence_note?: string
}

/**
 * Aggregate all decayed preferences into the payload's `preferences_summary`.
 * Likes/dislikes are labeled by exercise NAME (human/LLM-legible); the
 * per-candidate score carries the machine-joinable id. The low-confidence note
 * is emitted only when NO high-confidence preference exists (spec § cold-start).
 */
export function buildPreferencesSummary(
  preferences: ReadonlyMap<string, DecayedPreference>,
  nameById: ReadonlyMap<string, string>,
): PreferencesSummary {
  const likes: { label: string; mean: number }[] = []
  const dislikes: { label: string; mean: number }[] = []

  for (const [id, pref] of preferences) {
    if (!pref.confident) continue
    const label = nameById.get(id) ?? id
    if (pref.mean > 0.5) likes.push({ label, mean: pref.mean })
    else if (pref.mean < 0.5) dislikes.push({ label, mean: pref.mean })
  }

  // Strongest signal first, name as a stable tie-break.
  likes.sort((a, b) => b.mean - a.mean || (a.label < b.label ? -1 : 1))
  dislikes.sort((a, b) => a.mean - b.mean || (a.label < b.label ? -1 : 1))

  const summary: PreferencesSummary = {
    high_confidence_likes: likes.map((l) => l.label),
    high_confidence_dislikes: dislikes.map((d) => d.label),
  }
  if (likes.length === 0 && dislikes.length === 0) {
    summary.low_confidence_note =
      'Most exercises have too little preference data — defer to the candidate list.'
  }
  return summary
}
