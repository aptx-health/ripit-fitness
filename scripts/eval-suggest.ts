/**
 * End-to-end eval runner for Suggest Workout prompts.
 *
 * Usage (run under doppler so LLM_* env vars are present):
 *   doppler run --config dev_personal -- npx tsx scripts/eval-suggest.ts \
 *     --scenarios 20 --prompt v1 --seed eval-v1
 *
 * Or via the npm script:
 *   doppler run --config dev_personal -- npm run eval-suggest -- --scenarios 20 --prompt v1
 *
 * Flags:
 *   --scenarios N       number of scenarios (default 12)
 *   --prompt NAME       prompt variant: registry version or .eval/variants name (default v1)
 *   --seed STRING       scenario seed (default eval-v1). Same seed+count → same scenarios.
 *   --judge-runs K      judge passes per suggestion (default 1; use 3 for release decisions)
 *   --judge-model M     override judge model (default LLM_JUDGE_MODEL, then LLM_MODEL)
 *   --model M           override planner model (default LLM_MODEL)
 *   --concurrency N     parallel scenarios (default 3)
 *   --compare RUN_ID    paired comparison against a previous run (same seed required)
 *   --refine            after scoring, cluster failures and propose prompt diffs
 *   --dry-run           generate + save scenarios and print coverage, no LLM calls
 *
 * Env: LLM_PROVIDER_URL, LLM_API_KEY, LLM_MODEL (see lib/llm/client.ts),
 * optional LLM_JUDGE_MODEL / LLM_JUDGE_PROVIDER_URL / LLM_JUDGE_API_KEY.
 */

import { parseArgs } from 'node:util'

import { LLMClient } from '../lib/llm/client'
import { generateScenarios } from '../lib/eval/scenario-generator'
import { runHardChecks, failedGates } from '../lib/eval/hard-checks'
import { aggregateJudgeRuns, judgeSuggestion } from '../lib/eval/judge'
import {
  buildRunReport,
  compareRuns,
  renderComparisonMarkdown,
  renderReportMarkdown,
} from '../lib/eval/report'
import {
  applyDiff,
  clusterFailures,
  proposeDiffs,
  renderProposalMarkdown,
} from '../lib/eval/refinement-engine'
import {
  loadRun,
  makeRunId,
  resolvePromptVariant,
  saveExperimentalVariant,
  saveProposal,
  saveReport,
  saveRunMeta,
  saveScenarioResult,
  saveScenarios,
} from '../lib/eval/store'
import type { EvalScenario, ScenarioResult } from '../lib/eval/types'
import { buildPlannerPrompt } from '../lib/suggest/prompts/registry'
import { suggestionResponseSchema } from '../lib/suggest/schema'

const { values: args } = parseArgs({
  options: {
    scenarios: { type: 'string', default: '12' },
    prompt: { type: 'string', default: 'v1' },
    seed: { type: 'string', default: 'eval-v1' },
    'judge-runs': { type: 'string', default: '1' },
    'judge-model': { type: 'string' },
    model: { type: 'string' },
    concurrency: { type: 'string', default: '3' },
    compare: { type: 'string' },
    refine: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
})

function log(msg: string): void {
  process.stdout.write(`${msg}\n`)
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

async function runScenario(
  scenario: EvalScenario,
  plannerClient: LLMClient,
  judgeClient: LLMClient,
  options: {
    promptVariant: string
    plannerModel?: string
    judgeModel?: string
    judgeRuns: number
  },
): Promise<ScenarioResult> {
  const variant = resolvePromptVariant(options.promptVariant)
  const { system, user } = buildPlannerPrompt(variant, scenario.payload)

  const base: ScenarioResult = {
    scenarioId: scenario.id,
    response: null,
    error: null,
    latencyMs: null,
    plannerModel: null,
    hardChecks: [],
    judgeRuns: [],
    composite: null,
    dimensionMedians: {},
  }

  let responseData
  try {
    const result = await plannerClient.callWithStructuredOutput(
      user,
      suggestionResponseSchema,
      {
        system,
        model: options.plannerModel,
        temperature: 0,
        schemaName: 'workout_suggestion',
        timeoutMs: 120_000,
      },
    )
    responseData = result.data
    base.latencyMs = result.latencyMs
    base.plannerModel = result.model
  } catch (err) {
    base.error = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    return base
  }

  base.response = responseData
  base.hardChecks = runHardChecks(scenario, responseData)

  try {
    base.judgeRuns = await judgeSuggestion(
      judgeClient,
      scenario,
      responseData,
      failedGates(base.hardChecks),
      { model: options.judgeModel, runs: options.judgeRuns },
    )
    const aggregated = aggregateJudgeRuns(base.judgeRuns)
    base.composite = aggregated.composite
    base.dimensionMedians = aggregated.dimensionMedians
  } catch (err) {
    base.error = `judge failed: ${err instanceof Error ? err.message : String(err)}`
  }

  return base
}

async function main(): Promise<void> {
  const scenarioCount = Number.parseInt(args.scenarios ?? '12', 10)
  const judgeRuns = Number.parseInt(args['judge-runs'] ?? '1', 10)
  const concurrency = Number.parseInt(args.concurrency ?? '3', 10)
  const promptVariant = args.prompt ?? 'v1'
  const seed = args.seed ?? 'eval-v1'

  // Fail fast on unknown variants before spending tokens
  const variant = resolvePromptVariant(promptVariant)

  const scenarios = generateScenarios({ count: scenarioCount, seed })
  const runId = makeRunId(promptVariant)

  log(`run ${runId}: ${scenarios.length} scenarios, prompt=${variant.version}, seed=${seed}`)
  const coverage = new Map<string, number>()
  for (const s of scenarios) {
    const key = s.modifiers.length > 0 ? s.modifiers.join('+') : '(plain)'
    coverage.set(key, (coverage.get(key) ?? 0) + 1)
  }
  log(
    `coverage: ${[...coverage.entries()].map(([k, n]) => `${k}×${n}`).join(', ')}`,
  )

  saveScenarios(runId, scenarios)

  if (args['dry-run']) {
    log('dry run — scenarios saved, no LLM calls made')
    return
  }

  const plannerClient = new LLMClient({ model: args.model })
  const judgeClient = new LLMClient({
    apiKey: process.env.LLM_JUDGE_API_KEY,
    baseURL: process.env.LLM_JUDGE_PROVIDER_URL,
    model: args['judge-model'] ?? process.env.LLM_JUDGE_MODEL ?? process.env.LLM_MODEL,
  })

  saveRunMeta({
    runId,
    createdAt: new Date().toISOString(),
    promptVariant: variant.version,
    seed,
    scenarioCount: scenarios.length,
    plannerModel: args.model ?? process.env.LLM_MODEL ?? 'unknown',
    judgeModel:
      args['judge-model'] ?? process.env.LLM_JUDGE_MODEL ?? process.env.LLM_MODEL ?? 'unknown',
    judgeRuns,
  })

  let completed = 0
  const results = await mapPool(scenarios, concurrency, async (scenario) => {
    const result = await runScenario(scenario, plannerClient, judgeClient, {
      promptVariant,
      plannerModel: args.model,
      judgeModel: args['judge-model'] ?? process.env.LLM_JUDGE_MODEL,
      judgeRuns,
    })
    saveScenarioResult(runId, result)
    completed++
    const gateFails = result.hardChecks.filter((c) => !c.passed).length
    log(
      `[${completed}/${scenarios.length}] ${scenario.id}: ${
        result.error
          ? `ERROR ${result.error}`
          : `composite ${result.composite ?? 'n/a'}${gateFails > 0 ? `, ${gateFails} gate fails` : ''}`
      }`,
    )
    return result
  })

  const run = { meta: loadRun(runId).meta, scenarios, results }
  const spreads = results
    .map((r) => aggregateJudgeRuns(r.judgeRuns).compositeSpread)
    .filter((s) => s > 0)
  const report = buildRunReport(run, spreads)
  const markdown = renderReportMarkdown(report)
  saveReport(runId, report, markdown)
  log('')
  log(markdown)
  log(`saved: .eval/runs/${runId}/report.md`)

  if (args.compare) {
    const baseRun = loadRun(args.compare)
    const baseSpreads = baseRun.results
      .map((r) => aggregateJudgeRuns(r.judgeRuns).compositeSpread)
      .filter((s) => s > 0)
    const baseReport = buildRunReport(baseRun, baseSpreads)
    const cmp = compareRuns(
      { report: baseReport, results: baseRun.results },
      { report, results },
    )
    log(renderComparisonMarkdown(cmp))
  }

  if (args.refine) {
    log('clustering failures and proposing prompt diffs...')
    const clusters = clusterFailures(run)
    if (clusters.length === 0) {
      log('no failure clusters — nothing to refine')
      return
    }
    const { validations, clustersUsed } = await proposeDiffs(
      judgeClient,
      variant,
      clusters,
    )
    const saved: Array<{ version: string; file: string }> = []
    for (const v of validations) {
      if (!v.accepted) continue
      const version = `${variant.version}+${v.diff.id}`
      try {
        const file = saveExperimentalVariant(applyDiff(variant, v.diff, version))
        saved.push({ version, file })
      } catch (err) {
        log(`skip variant ${version}: ${err instanceof Error ? err.message : err}`)
      }
    }
    const proposal = renderProposalMarkdown(
      runId,
      variant,
      clustersUsed,
      validations,
      saved,
    )
    const file = saveProposal(runId, proposal)
    log('')
    log(proposal)
    log(`saved: ${file}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
