/**
 * Score aggregation + report rendering for eval runs, and paired
 * comparison between two runs (the "did my prompt diff help?" answer).
 *
 * Gates and judged scores are reported side by side but NEVER blended:
 * a prompt that raises composite while doubling gate failures is a
 * regression, and a blended number would hide that.
 */

import { DIMENSION_KEYS } from './rating-rubric'
import type { LoadedRun } from './store'
import type { ScenarioResult } from './types'

export interface RunReport {
  runId: string
  promptVariant: string
  seed: string
  scenarioCount: number
  plannerErrors: number
  gate: {
    totalChecks: number
    failedChecks: number
    passRate: number
    /** Fail counts by check name. */
    failsByCheck: Record<string, number>
    /** Scenarios with at least one gate failure. */
    scenariosWithFailures: number
  }
  compositeMean: number | null
  dimensionMeans: Record<string, number>
  /** Mean of per-scenario judge spread (only meaningful when runs > 1). */
  judgeSpreadMean: number | null
  worstScenarios: Array<{
    scenarioId: string
    composite: number | null
    failedGates: string[]
    worstDimension: string | null
  }>
  byModifier: Record<
    string,
    { count: number; compositeMean: number | null; gateFailScenarios: number }
  >
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
}

function worstDimension(result: ScenarioResult): string | null {
  let worst: string | null = null
  let worstScore = Infinity
  for (const [dim, score] of Object.entries(result.dimensionMedians)) {
    if (score < worstScore) {
      worstScore = score
      worst = dim
    }
  }
  return worst
}

export function buildRunReport(run: LoadedRun, judgeSpreads: number[]): RunReport {
  const { meta, scenarios, results } = run
  const scenarioById = new Map(scenarios.map((s) => [s.id, s]))

  const failsByCheck: Record<string, number> = {}
  let totalChecks = 0
  let failedChecks = 0
  let scenariosWithFailures = 0
  for (const r of results) {
    totalChecks += r.hardChecks.length
    const failed = r.hardChecks.filter((c) => !c.passed)
    failedChecks += failed.length
    if (failed.length > 0) scenariosWithFailures++
    for (const f of failed) {
      failsByCheck[f.name] = (failsByCheck[f.name] ?? 0) + 1
    }
  }

  const composites = results
    .map((r) => r.composite)
    .filter((c): c is number => c !== null)

  const dimensionMeans: Record<string, number> = {}
  for (const dim of [...DIMENSION_KEYS]) {
    const values = results
      .map((r) => r.dimensionMedians[dim])
      .filter((v): v is number => v !== undefined)
    const m = mean(values)
    if (m !== null) dimensionMeans[dim] = m
  }

  const ranked = [...results].sort(
    (a, b) => (a.composite ?? 0) - (b.composite ?? 0),
  )
  const worstScenarios = ranked.slice(0, 5).map((r) => ({
    scenarioId: r.scenarioId,
    composite: r.composite,
    failedGates: r.hardChecks.filter((c) => !c.passed).map((c) => c.name),
    worstDimension: worstDimension(r),
  }))

  const byModifier: RunReport['byModifier'] = {}
  for (const r of results) {
    const scenario = scenarioById.get(r.scenarioId)
    const keys =
      scenario && scenario.modifiers.length > 0 ? scenario.modifiers : ['(none)']
    for (const key of keys) {
      const bucket = (byModifier[key] = byModifier[key] ?? {
        count: 0,
        compositeMean: null,
        gateFailScenarios: 0,
      })
      bucket.count++
      if (r.hardChecks.some((c) => !c.passed)) bucket.gateFailScenarios++
    }
  }
  for (const [key, bucket] of Object.entries(byModifier)) {
    const values = results
      .filter((r) => {
        const s = scenarioById.get(r.scenarioId)
        const keys = s && s.modifiers.length > 0 ? s.modifiers : ['(none)']
        return keys.includes(key)
      })
      .map((r) => r.composite)
      .filter((c): c is number => c !== null)
    bucket.compositeMean = mean(values)
  }

  return {
    runId: meta.runId,
    promptVariant: meta.promptVariant,
    seed: meta.seed,
    scenarioCount: scenarios.length,
    plannerErrors: results.filter((r) => r.error !== null).length,
    gate: {
      totalChecks,
      failedChecks,
      passRate:
        totalChecks > 0
          ? Math.round(((totalChecks - failedChecks) / totalChecks) * 1000) / 1000
          : 1,
      failsByCheck,
      scenariosWithFailures,
    },
    compositeMean: mean(composites),
    dimensionMeans,
    judgeSpreadMean: judgeSpreads.length > 0 ? mean(judgeSpreads) : null,
    worstScenarios,
    byModifier,
  }
}

export function renderReportMarkdown(report: RunReport): string {
  const lines: string[] = [
    `# Eval run ${report.runId}`,
    '',
    `- Prompt variant: **${report.promptVariant}**  |  Seed: \`${report.seed}\`  |  Scenarios: ${report.scenarioCount}  |  Planner errors: ${report.plannerErrors}`,
    `- **Composite (judged, 1-4): ${report.compositeMean ?? 'n/a'}**`,
    `- **Gate pass rate: ${(report.gate.passRate * 100).toFixed(1)}%** (${report.gate.failedChecks}/${report.gate.totalChecks} checks failed across ${report.gate.scenariosWithFailures} scenarios)`,
    report.judgeSpreadMean !== null
      ? `- Judge stability (mean composite spread across runs): ${report.judgeSpreadMean}`
      : '',
    '',
    '## Dimensions',
    '| dimension | mean |',
    '|---|---|',
    ...Object.entries(report.dimensionMeans).map(([d, m]) => `| ${d} | ${m} |`),
    '',
    '## Gate failures by check',
    ...(Object.keys(report.gate.failsByCheck).length > 0
      ? Object.entries(report.gate.failsByCheck).map(([c, n]) => `- ${c}: ${n}`)
      : ['- none']),
    '',
    '## Worst scenarios',
    ...report.worstScenarios.map(
      (w) =>
        `- \`${w.scenarioId}\` composite ${w.composite ?? 'n/a'}${w.worstDimension ? `, worst dim: ${w.worstDimension}` : ''}${w.failedGates.length > 0 ? `, gate fails: ${w.failedGates.join(', ')}` : ''}`,
    ),
    '',
    '## By modifier',
    '| modifier | n | composite | scenarios w/ gate fails |',
    '|---|---|---|---|',
    ...Object.entries(report.byModifier).map(
      ([k, b]) => `| ${k} | ${b.count} | ${b.compositeMean ?? 'n/a'} | ${b.gateFailScenarios} |`,
    ),
    '',
  ]
  return lines.filter((l) => l !== '').join('\n') + '\n'
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

export interface RunComparison {
  baseRunId: string
  candidateRunId: string
  pairedScenarios: number
  improved: number
  regressed: number
  unchanged: number
  compositeDelta: number | null
  dimensionDeltas: Record<string, number>
  gatePassRateDelta: number
  regressions: Array<{ scenarioId: string; before: number; after: number }>
  /** Scenario ids present in only one run. */
  unpaired: string[]
  /** Scenario ids match by index even across seeds — this flags it. */
  seedMismatch: boolean
}

const CHANGE_THRESHOLD = 0.1

export function compareRuns(
  base: { report: RunReport; results: ScenarioResult[] },
  candidate: { report: RunReport; results: ScenarioResult[] },
): RunComparison {
  const baseById = new Map(base.results.map((r) => [r.scenarioId, r]))
  const candById = new Map(candidate.results.map((r) => [r.scenarioId, r]))

  const paired: Array<{ id: string; before: number; after: number }> = []
  const unpaired: string[] = []
  for (const [id, b] of baseById) {
    const c = candById.get(id)
    if (!c) {
      unpaired.push(id)
      continue
    }
    if (b.composite !== null && c.composite !== null) {
      paired.push({ id, before: b.composite, after: c.composite })
    }
  }
  for (const id of candById.keys()) {
    if (!baseById.has(id)) unpaired.push(id)
  }

  let improved = 0
  let regressed = 0
  let unchanged = 0
  for (const p of paired) {
    const delta = p.after - p.before
    if (delta > CHANGE_THRESHOLD) improved++
    else if (delta < -CHANGE_THRESHOLD) regressed++
    else unchanged++
  }

  const dimensionDeltas: Record<string, number> = {}
  for (const dim of Object.keys(candidate.report.dimensionMeans)) {
    const before = base.report.dimensionMeans[dim]
    const after = candidate.report.dimensionMeans[dim]
    if (before !== undefined && after !== undefined) {
      dimensionDeltas[dim] = Math.round((after - before) * 100) / 100
    }
  }

  const regressions = paired
    .filter((p) => p.after - p.before < -CHANGE_THRESHOLD)
    .sort((a, b) => a.after - a.before - (b.after - b.before))
    .slice(0, 10)
    .map((p) => ({ scenarioId: p.id, before: p.before, after: p.after }))

  const compositeDelta =
    base.report.compositeMean !== null && candidate.report.compositeMean !== null
      ? Math.round((candidate.report.compositeMean - base.report.compositeMean) * 100) /
        100
      : null

  return {
    baseRunId: base.report.runId,
    candidateRunId: candidate.report.runId,
    pairedScenarios: paired.length,
    improved,
    regressed,
    unchanged,
    compositeDelta,
    dimensionDeltas,
    gatePassRateDelta:
      Math.round((candidate.report.gate.passRate - base.report.gate.passRate) * 1000) /
      1000,
    regressions,
    unpaired,
    seedMismatch: base.report.seed !== candidate.report.seed,
  }
}

export function renderComparisonMarkdown(cmp: RunComparison): string {
  return [
    `# Comparison: ${cmp.baseRunId} → ${cmp.candidateRunId}`,
    '',
    cmp.seedMismatch
      ? '> WARNING: the two runs used DIFFERENT seeds. Scenario ids pair by index but the payload jitter differs — this comparison is not a valid paired test. Re-run with matching --seed.'
      : '',
    cmp.unpaired.length > 0
      ? `> WARNING: ${cmp.unpaired.length} scenarios unpaired — were these runs generated with the same count? Paired comparison is only valid on identical scenario sets.`
      : '',
    `- Paired scenarios: ${cmp.pairedScenarios} — **${cmp.improved} improved / ${cmp.regressed} regressed / ${cmp.unchanged} unchanged** (threshold ±${CHANGE_THRESHOLD})`,
    `- Composite delta: **${cmp.compositeDelta !== null && cmp.compositeDelta >= 0 ? '+' : ''}${cmp.compositeDelta ?? 'n/a'}**`,
    `- Gate pass rate delta: ${cmp.gatePassRateDelta >= 0 ? '+' : ''}${(cmp.gatePassRateDelta * 100).toFixed(1)}pp`,
    '',
    '## Dimension deltas',
    ...Object.entries(cmp.dimensionDeltas).map(
      ([d, v]) => `- ${d}: ${v >= 0 ? '+' : ''}${v}`,
    ),
    '',
    '## Biggest regressions',
    ...(cmp.regressions.length > 0
      ? cmp.regressions.map(
          (r) => `- \`${r.scenarioId}\`: ${r.before} → ${r.after}`,
        )
      : ['- none']),
    '',
  ]
    .filter((l) => l !== '')
    .join('\n') + '\n'
}
