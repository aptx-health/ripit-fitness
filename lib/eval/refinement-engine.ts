/**
 * Refinement engine: turns a batch of scored suggestions into small,
 * targeted prompt-diff proposals.
 *
 * Division of labor, deliberately:
 * - CODE clusters failures (by gate name, by low-scoring dimension) and
 *   picks exemplars. Clustering is counting; an LLM adds nothing.
 * - The LLM writes the diff for the top clusters only. It sees the
 *   current prompt (named sections), the failure cluster, and exemplar
 *   evidence from the judge — and is constrained to edit at most one
 *   section per diff.
 *
 * Overfitting guards baked in:
 * - Diffs must state a GENERAL coaching/prompting principle. Proposals
 *   that mention scenario ids or synthetic archetype names are rejected
 *   (hard) or flagged (soft) before they reach a variant file.
 * - Each accepted diff is materialized as a `.eval/variants/` JSON
 *   variant with lineage (`base`), so re-running the SAME seed against
 *   base and candidate gives a paired comparison. Winners get promoted
 *   to lib/suggest/prompts/registry.ts by a human, in a commit.
 */

import { z } from 'zod'

import type { LLMClient } from '@/lib/llm/client'
import type { PromptVariant } from '@/lib/suggest/prompts/registry'

import { getDimension } from './rating-rubric'
import type { LoadedRun } from './store'
import type { ScenarioResult } from './types'

// ---------------------------------------------------------------------------
// Failure clustering (pure code)
// ---------------------------------------------------------------------------

export interface FailureExemplar {
  scenarioId: string
  optionId?: string
  /** Gate detail or judge evidence text. */
  evidence: string
}

export interface FailureCluster {
  kind: 'gate' | 'dimension'
  key: string
  count: number
  exemplars: FailureExemplar[]
  /** Human-readable framing for the LLM. */
  framing: string
}

const LOW_DIMENSION_THRESHOLD = 2.5
const MAX_EXEMPLARS = 3

export function clusterFailures(run: LoadedRun): FailureCluster[] {
  const clusters: FailureCluster[] = []

  // Gate clusters
  const gateGroups = new Map<string, FailureExemplar[]>()
  for (const result of run.results) {
    for (const check of result.hardChecks) {
      if (check.passed) continue
      const list = gateGroups.get(check.name) ?? []
      list.push({
        scenarioId: result.scenarioId,
        optionId: check.optionId,
        evidence: check.detail ?? check.name,
      })
      gateGroups.set(check.name, list)
    }
  }
  for (const [name, exemplars] of gateGroups) {
    clusters.push({
      kind: 'gate',
      key: name,
      count: exemplars.length,
      exemplars: exemplars.slice(0, MAX_EXEMPLARS),
      framing: `Deterministic gate "${name}" failed ${exemplars.length} time(s). These are hard violations the prompt must prevent outright.`,
    })
  }

  // Dimension clusters
  const dimGroups = new Map<string, FailureExemplar[]>()
  for (const result of run.results) {
    for (const [dim, score] of Object.entries(result.dimensionMedians)) {
      if (score > LOW_DIMENSION_THRESHOLD) continue
      const list = dimGroups.get(dim) ?? []
      list.push({
        scenarioId: result.scenarioId,
        evidence: extractJudgeEvidence(result, dim),
      })
      dimGroups.set(dim, list)
    }
  }
  for (const [dim, exemplars] of dimGroups) {
    const rubricDim = getDimension(dim)
    clusters.push({
      kind: 'dimension',
      key: dim,
      count: exemplars.length,
      exemplars: exemplars.slice(0, MAX_EXEMPLARS),
      framing: `Judged dimension "${dim}" (${rubricDim?.label ?? dim}) scored <= ${LOW_DIMENSION_THRESHOLD} on ${exemplars.length} scenario(s). Focus: ${rubricDim?.focus ?? 'n/a'}`,
    })
  }

  return clusters.sort((a, b) => b.count - a.count)
}

function extractJudgeEvidence(result: ScenarioResult, dimension: string): string {
  const run = result.judgeRuns[0]
  if (!run) return '(no judge output)'
  if (dimension === 'option_identity') {
    return run.option_identity.evidence
  }
  const pieces: string[] = []
  for (const option of run.per_option) {
    for (const ds of option.dimension_scores) {
      if (ds.dimension === dimension && ds.score <= 2) {
        pieces.push(`[${option.option_id}] ${ds.evidence}`)
      }
    }
  }
  return pieces.slice(0, 2).join(' | ') || '(low median without per-option evidence)'
}

// ---------------------------------------------------------------------------
// Diff proposal (LLM)
// ---------------------------------------------------------------------------

const diffSchema = z.object({
  diffs: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/, 'kebab-case id'),
        target_section: z.string(),
        operation: z.enum(['replace', 'append']),
        proposed_content: z.string().min(1),
        motivation: z.string().min(1),
        addresses: z.string(),
        risk: z.string(),
      }),
    )
    .min(1)
    .max(3),
})

export type PromptDiff = z.infer<typeof diffSchema>['diffs'][number]

export interface DiffValidation {
  diff: PromptDiff
  accepted: boolean
  warnings: string[]
  rejectionReason?: string
}

const ARCHETYPE_NAME_PATTERN =
  /\b(cyclist|bodybuilder|powerlifter|beginner|inconsistent)\b/i
const SCENARIO_ID_PATTERN = /\b\d{3}-[a-z-]+\b/

export async function proposeDiffs(
  client: LLMClient,
  variant: PromptVariant,
  clusters: FailureCluster[],
  options: { model?: string; maxClusters?: number } = {},
): Promise<{ validations: DiffValidation[]; clustersUsed: FailureCluster[] }> {
  const clustersUsed = clusters.slice(0, options.maxClusters ?? 3)
  if (clustersUsed.length === 0) {
    return { validations: [], clustersUsed }
  }

  const sectionBlock = variant.sections
    .map((s) => `### section: ${s.name}\n${s.content}`)
    .join('\n\n')

  const clusterBlock = clustersUsed
    .map((c, i) => {
      const exemplars = c.exemplars
        .map((e) => `  - scenario ${e.scenarioId}${e.optionId ? ` (${e.optionId})` : ''}: ${e.evidence}`)
        .join('\n')
      return `## Failure cluster ${i + 1}: ${c.key} (${c.count} occurrences)\n${c.framing}\nExemplars:\n${exemplars}`
    })
    .join('\n\n')

  const system = [
    'You improve a system prompt for a workout-suggestion LLM. You receive the current prompt (as named sections) and clustered failures from an evaluation run.',
    '',
    'Produce 1-3 SMALL prompt diffs. Rules:',
    '- Each diff edits exactly one existing section: either `replace` its full content or `append` 1-3 sentences to it. Pick the section whose job it is to prevent the failure.',
    '- State general principles, never specifics of the test data. Do NOT reference scenario ids, synthetic user archetypes, or exact numbers from exemplars. A diff that says "when the user mentions soreness in a muscle group, exclude heavy work for it" is good; "avoid squats for cyclists" is overfitting and forbidden.',
    '- Keep each change under ~80 words of new text. Do not rewrite unrelated parts of a section when replacing it.',
    '- `motivation`: why this wording change prevents the failure mode. `addresses`: the cluster key. `risk`: what this change could plausibly make worse (there is always something).',
    '',
    'Respond with ONLY JSON: {"diffs": [{"id": "kebab-case-slug", "target_section": string, "operation": "replace" | "append", "proposed_content": string, "motivation": string, "addresses": string, "risk": string}]}',
  ].join('\n')

  const user = [
    '# Current prompt sections',
    sectionBlock,
    '',
    '# Failure clusters',
    clusterBlock,
  ].join('\n')

  const { data } = await client.callWithStructuredOutput(user, diffSchema, {
    system,
    model: options.model,
    temperature: 0.3,
    schemaName: 'prompt_diffs',
  })

  const sectionNames = new Set(variant.sections.map((s) => s.name))
  const validations: DiffValidation[] = data.diffs.map((diff) => {
    const warnings: string[] = []
    if (!sectionNames.has(diff.target_section)) {
      return {
        diff,
        accepted: false,
        warnings,
        rejectionReason: `target_section "${diff.target_section}" does not exist (sections: ${[...sectionNames].join(', ')})`,
      }
    }
    if (SCENARIO_ID_PATTERN.test(diff.proposed_content)) {
      return {
        diff,
        accepted: false,
        warnings,
        rejectionReason: 'proposed content references a scenario id — overfit to the test set',
      }
    }
    if (ARCHETYPE_NAME_PATTERN.test(diff.proposed_content)) {
      warnings.push(
        'proposed content mentions an archetype-like word — review for overfitting before running',
      )
    }
    if (diff.proposed_content.split(/\s+/).length > 160) {
      warnings.push('diff is large for a "targeted" change — consider trimming')
    }
    return { diff, accepted: true, warnings }
  })

  return { validations, clustersUsed }
}

// ---------------------------------------------------------------------------
// Applying diffs → experimental variants
// ---------------------------------------------------------------------------

export function applyDiff(
  base: PromptVariant,
  diff: PromptDiff,
  newVersion: string,
): PromptVariant {
  const sections = base.sections.map((s) => {
    if (s.name !== diff.target_section) return s
    return {
      name: s.name,
      content:
        diff.operation === 'replace'
          ? diff.proposed_content
          : `${s.content}\n${diff.proposed_content}`,
    }
  })
  return {
    version: newVersion,
    base: base.version,
    notes: `${diff.addresses}: ${diff.motivation}`,
    sections,
  }
}

export function renderProposalMarkdown(
  runId: string,
  baseVariant: PromptVariant,
  clustersUsed: FailureCluster[],
  validations: DiffValidation[],
  savedVariants: Array<{ version: string; file: string }>,
): string {
  const lines: string[] = [
    `# Prompt refinement proposal — run ${runId} (base: ${baseVariant.version})`,
    '',
    '## Failure clusters targeted',
    ...clustersUsed.map((c) => `- [${c.kind}] ${c.key}: ${c.count} occurrences`),
    '',
  ]
  for (const v of validations) {
    lines.push(
      `## Diff \`${v.diff.id}\` → section \`${v.diff.target_section}\` (${v.diff.operation}) — ${v.accepted ? 'ACCEPTED' : `REJECTED: ${v.rejectionReason}`}`,
      '',
      `**Addresses:** ${v.diff.addresses}`,
      `**Motivation:** ${v.diff.motivation}`,
      `**Risk:** ${v.diff.risk}`,
      ...v.warnings.map((w) => `**Warning:** ${w}`),
      '',
      '```',
      v.diff.proposed_content,
      '```',
      '',
    )
  }
  if (savedVariants.length > 0) {
    lines.push(
      '## Next step',
      '',
      'Each accepted diff was saved as an experimental variant. Re-run against the SAME seed and compare:',
      '',
      ...savedVariants.map(
        (v) =>
          `    npm run eval-suggest -- --scenarios <N> --prompt ${v.version} --seed <same-seed> --compare <this-run-id>`,
      ),
      '',
    )
  }
  return lines.join('\n')
}
