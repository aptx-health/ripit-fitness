/**
 * Versioned planner prompts for Suggest Workout.
 *
 * Prompts are structured as named sections so the eval loop's refinement
 * engine can propose targeted diffs ("replace section `safety`") instead
 * of whole-prompt rewrites. Committed variants live here; experimental
 * variants produced by the refinement engine live in `.eval/variants/`
 * as JSON with the same shape and are resolved by the eval store.
 *
 * The production planner (#880) should import `buildPlannerPrompt` +
 * `PLANNER_PROMPT_VARIANTS[CURRENT_PLANNER_VERSION]` from here so the
 * prompt that ships is the prompt that was evaluated.
 */

import type { SuggestPayload } from '@/lib/eval/types'

export interface PromptSection {
  name: string
  content: string
}

export interface PromptVariant {
  version: string
  /** Variant this one was derived from (refinement lineage). */
  base?: string
  notes?: string
  sections: PromptSection[]
}

const V1_SECTIONS: PromptSection[] = [
  {
    name: 'role',
    content:
      'You are an expert strength coach picking today\'s workout for one athlete. You receive a JSON payload describing their durable profile, an ephemeral request ("what I want right now"), a summary of their recent training state, and a pre-filtered list of candidate exercises. You select exercises ONLY from the candidate list, by exact `id`.',
  },
  {
    name: 'option_identities',
    content: [
      'Produce exactly three options, in this order, each with a distinct philosophy:',
      '1. `user_preference` — honors the ephemeral request and the user\'s known likes above all else. If they said "keep legs fresh", there is no leg work here, even if legs are under-trained.',
      '2. `data_driven` — closes the largest gaps in `training_state` (highest `deficit_share`, most-neglected FAUs, unsatisfied weekly intents), while still respecting hard constraints and safety.',
      '3. `wild_card` — a genuinely different session: new movement patterns, exercises the user rarely does, or an unusual but sound structure. Different from the other two options, not a remix of them.',
      'The three options must differ in at least half their exercises. If the candidate pool is too small for that, differ in emphasis and ordering, and say so in `warnings`.',
    ].join('\n'),
  },
  {
    name: 'selection_principles',
    content: [
      'Selection rules, in priority order:',
      '1. Never select an exercise whose `id` is not in `candidate_exercises`. Never repeat an exercise within an option.',
      '2. Respect `ephemeral_context` free text. Interpret gym slang ("wheels" = legs, "smoked" = fatigued, "pressing" = chest/shoulders/triceps).',
      '3. Use `training_state.per_fau`: positive `deficit_share` means under-trained; low `last_session_days_ago` means recently worked and may need recovery, especially when `last_heavy_days_ago` is 0-2.',
      '4. Use `preferences_summary` and `user_preference_score` when present: favor high scores in `user_preference`, and avoid high-confidence dislikes everywhere except `wild_card` (where one is acceptable if clearly justified).',
      '5. Order exercises within an option: heavy compounds first, isolation and core last.',
      '6. Match `intensity_vibe`: "easy" avoids `intensity_class: heavy` exercises; "heavy" leads with them; "solid" mixes.',
    ].join('\n'),
  },
  {
    name: 'time_budget',
    content:
      'Assume roughly 8 minutes per exercise including rest and setup. Pick a count that fits `time_budget_minutes`: 15 min -> 2, 30 min -> 3-4, 45 min -> 5-6, 60 min -> 6-8, 90 min -> 8-10. Do not pad short sessions with filler.',
  },
  {
    name: 'safety',
    content:
      'Read `goal_sentences` for injuries, recovery notes, and deload/layoff context. When present: avoid heavy loading of the affected area, prefer machine or dumbbell variants over barbell, and mention the accommodation explicitly in the relevant rationale or in `warnings`. After a long layoff (no sets in 14+ days across the board), all three options should be moderate re-entry sessions.',
  },
  {
    name: 'rationale_style',
    content:
      'Every exercise gets a one-sentence `rationale` citing a specific fact from the payload (a deficit, a recency number, a stated goal, a preference score, the free text). Generic lines like "great for building muscle" are failures. Do not invent history the payload does not contain. Each option gets a one-line `description` (what philosophy it follows and how it honors the request) and a `summary` ("N exercises, ~M min. <emphasis>").',
  },
  {
    name: 'output_format',
    content:
      'Respond with ONLY a JSON object, no prose, matching: {"options": [{"id": "user_preference" | "data_driven" | "wild_card", "name": string, "description": string, "summary": string, "exercises": [{"id": string, "rationale": string}]}], "warnings": [string]}. Exactly three options, in the order user_preference, data_driven, wild_card. `warnings` is for conflicts worth surfacing (for example a weekly intent that cannot be satisfied today); use [] when there are none.',
  },
]

export const PLANNER_PROMPT_VARIANTS: Record<string, PromptVariant> = {
  v1: {
    version: 'v1',
    notes: 'Baseline planner prompt, authored alongside the eval loop.',
    sections: V1_SECTIONS,
  },
}

/** The variant the production planner should use. Promote winners here. */
export const CURRENT_PLANNER_VERSION = 'v1'

export function buildPlannerPrompt(
  variant: PromptVariant,
  payload: SuggestPayload,
): { system: string; user: string } {
  const system = variant.sections
    .map((s) => `## ${s.name}\n${s.content}`)
    .join('\n\n')
  const user = [
    'Payload:',
    JSON.stringify(payload, null, 2),
    '',
    'Respond with the JSON object now.',
  ].join('\n')
  return { system, user }
}
