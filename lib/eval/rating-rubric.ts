/**
 * Scoring rubric for Suggest Workout suggestions.
 *
 * Design choices, deliberate:
 *
 * - 4-point anchored scales, not 1-10. Cheap judge models are unstable
 *   on wide scales; forced-choice between four concretely-described
 *   levels is far more repeatable. No middle point — the judge must
 *   commit to "acceptable" vs "flawed".
 * - Every level has anchor text describing observable behavior, not
 *   adjectives. The judge quotes evidence before scoring (see judge.ts).
 * - Anything a program can verify is NOT a judged dimension — it is a
 *   deterministic gate in hard-checks.ts (ID validity, duplicates,
 *   count-vs-time, banned exercises, scenario hard rules). Judged
 *   dimensions are reserved for genuine judgment calls.
 * - Weights encode product priorities: getting the training state right
 *   and staying safe matter more than prose quality.
 *
 * Both the LLM judge and the human rating CLI render from this file, so
 * the two rating streams are calibratable against each other.
 */

export interface RubricLevel {
  score: 1 | 2 | 3 | 4
  anchor: string
}

export interface RubricDimension {
  key: string
  label: string
  /** Single letter for the human CLI flag keys. Must be unique. */
  flagKey: string
  weight: number
  /** What the judge should look at. */
  focus: string
  levels: RubricLevel[]
  /** True when the dimension is scored once across all three options. */
  crossOption?: boolean
}

export const RUBRIC_VERSION = 'rubric-v1'

export const RUBRIC_DIMENSIONS: RubricDimension[] = [
  {
    key: 'state_grounding',
    label: 'Training-state grounding',
    flagKey: 'g',
    weight: 0.25,
    focus:
      'Does the option respond to what training_state actually says — deficits, recency, unsatisfied weekly intents, goal trends? Data Driven especially must target the largest real deficits, not plausible-sounding ones.',
    levels: [
      { score: 1, anchor: 'Contradicts the state (hammers an over-trained FAU, ignores a glaring deficit it claims to address, cites numbers that are not in the payload).' },
      { score: 2, anchor: 'Generic template that would fit any user; state is referenced but does not change the picks.' },
      { score: 3, anchor: 'Picks clearly track the state; one or two misses (a secondary deficit ignored, mild recency conflict).' },
      { score: 4, anchor: 'Picks and emphasis follow directly from the state; largest deficits and recency conflicts are all handled or explicitly acknowledged.' },
    ],
  },
  {
    key: 'constraint_respect',
    label: 'Ephemeral constraint respect',
    flagKey: 'c',
    weight: 0.2,
    focus:
      'Are the soft ephemeral inputs honored — prioritize/deprioritize free text (including slang), intensity_vibe, the spirit of the time budget? Hard violations (IDs, counts) are gated elsewhere; score interpretation quality here.',
    levels: [
      { score: 1, anchor: 'Free text ignored or misread (user said keep legs fresh, option leads with heavy squats); vibe contradicted.' },
      { score: 2, anchor: 'Partially honored — the request shapes some picks but violations remain without acknowledgment.' },
      { score: 3, anchor: 'Honored with at most one minor, acknowledged tension.' },
      { score: 4, anchor: 'Fully honored, including correct interpretation of slang or ambiguity; tensions surfaced in description or warnings.' },
    ],
  },
  {
    key: 'safety_recovery',
    label: 'Safety and recovery awareness',
    flagKey: 's',
    weight: 0.2,
    focus:
      'Injuries in goal_sentences, deload/layoff context, last_heavy_days_ago of 0-2 on the same FAU, conservative re-entry after breaks. The option should accommodate, and say that it is accommodating.',
    levels: [
      { score: 1, anchor: 'Loads an injured/flagged area heavily, or programs a max-effort session into a deload/layoff.' },
      { score: 2, anchor: 'No direct harm but tone-deaf: ignores fresh heavy work on a FAU, or gives a returning user their old full workload silently.' },
      { score: 3, anchor: 'Accommodations made; acknowledgment thin or implicit.' },
      { score: 4, anchor: 'Accommodations made and explicitly explained (joint-friendly variants chosen, re-entry volume reduced, conflicts in warnings).' },
    ],
  },
  {
    key: 'option_identity',
    label: 'Option distinctness and identity',
    flagKey: 'i',
    weight: 0.15,
    crossOption: true,
    focus:
      'Scored once across all three options: is user_preference actually preference-led, data_driven actually deficit-led, wild_card actually novel? Are they meaningfully different sessions?',
    levels: [
      { score: 1, anchor: 'Options are near-duplicates (over half the exercises shared) or identities are swapped/meaningless.' },
      { score: 2, anchor: 'Some differentiation but at least one option does not follow its stated philosophy.' },
      { score: 3, anchor: 'Three distinct sessions, each roughly faithful to its identity; wild_card only mildly novel.' },
      { score: 4, anchor: 'Three clearly distinct, identity-faithful sessions; a user would genuinely deliberate between them.' },
    ],
  },
  {
    key: 'rationale_quality',
    label: 'Rationale quality',
    flagKey: 'r',
    weight: 0.1,
    focus:
      'Per-exercise rationales cite specific payload facts (deficit numbers, days-ago, stated goals, preference scores). No fabricated history, no filler.',
    levels: [
      { score: 1, anchor: 'Rationales fabricate history or are pure filler ("great compound movement").' },
      { score: 2, anchor: 'Mostly generic; a few payload-grounded lines.' },
      { score: 3, anchor: 'Mostly grounded in payload facts; occasional filler.' },
      { score: 4, anchor: 'Every rationale traces to a verifiable payload fact and would help the user trust the pick.' },
    ],
  },
  {
    key: 'session_coherence',
    label: 'Session structure coherence',
    flagKey: 'o',
    weight: 0.1,
    focus:
      'Does the option read like a workout a coach would write? Compounds before isolation, no redundant back-to-back near-duplicates, sensible FAU flow, count appropriate to the stated summary.',
    levels: [
      { score: 1, anchor: 'Incoherent: isolation-first before a heavy compound of the same muscle, redundant duplicates (two curl variants back to back in a 4-exercise session), random ordering.' },
      { score: 2, anchor: 'Trainable but sloppy ordering or one redundant slot.' },
      { score: 3, anchor: 'Solid structure with a minor quibble.' },
      { score: 4, anchor: 'Clean, coach-quality structure and flow.' },
    ],
  },
]

const weightSum = RUBRIC_DIMENSIONS.reduce((a, d) => a + d.weight, 0)
if (Math.abs(weightSum - 1) > 1e-9) {
  throw new Error(`Rubric weights must sum to 1 (got ${weightSum})`)
}

export const DIMENSION_KEYS = RUBRIC_DIMENSIONS.map((d) => d.key)

export function getDimension(key: string): RubricDimension | undefined {
  return RUBRIC_DIMENSIONS.find((d) => d.key === key)
}

export function dimensionByFlagKey(flag: string): RubricDimension | undefined {
  return RUBRIC_DIMENSIONS.find((d) => d.flagKey === flag)
}

/**
 * Weighted composite over per-dimension scores in [1,4]. Missing
 * dimensions are skipped and the weights renormalized, so a partial
 * judge response still yields a comparable number.
 */
export function compositeScore(scores: Record<string, number>): number | null {
  let total = 0
  let weight = 0
  for (const dim of RUBRIC_DIMENSIONS) {
    const s = scores[dim.key]
    if (typeof s === 'number' && s >= 1 && s <= 4) {
      total += s * dim.weight
      weight += dim.weight
    }
  }
  if (weight === 0) return null
  return Math.round((total / weight) * 100) / 100
}

/**
 * Render the rubric as text for the judge prompt / human CLI help.
 * `crossOption: false` renders per-option dimensions only; `true`
 * renders the cross-option ones; omitted renders all.
 */
export function renderRubric(options: { crossOption?: boolean } = {}): string {
  const dims = RUBRIC_DIMENSIONS.filter((d) =>
    options.crossOption === undefined
      ? true
      : options.crossOption
        ? d.crossOption === true
        : d.crossOption !== true,
  )
  return dims
    .map((d) => {
      const levels = d.levels
        .map((l) => `  ${l.score} = ${l.anchor}`)
        .join('\n')
      return `### ${d.key} (weight ${d.weight})\n${d.focus}\n${levels}`
    })
    .join('\n\n')
}
