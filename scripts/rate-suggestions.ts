/**
 * Human-rating CLI for Suggest Workout eval runs.
 *
 * Usage:
 *   npx tsx scripts/rate-suggestions.ts                # rate latest run, 8 items
 *   npx tsx scripts/rate-suggestions.ts --run <runId> --n 10 --pick worst
 *   npx tsx scripts/rate-suggestions.ts --calibrate-only
 *
 * Flow per item: shows the scenario context + one option, asks for an
 * overall 1-4 on the SAME anchored scale the judge uses, then optional
 * problem-dimension flags (single letters) and an optional note. The
 * judge's score is revealed only AFTER you rate, to avoid anchoring.
 *
 * Ratings append to .eval/ratings.jsonl. After each session the
 * human-vs-judge calibration is recomputed and appended to
 * .eval/calibration.json.
 *
 * No LLM calls — safe to run without doppler.
 */

import * as readline from 'node:readline/promises'
import { parseArgs } from 'node:util'

import { exerciseName } from '../lib/eval/exercise-catalog'
import { compositeScore, dimensionByFlagKey, RUBRIC_DIMENSIONS, RUBRIC_VERSION } from '../lib/eval/rating-rubric'
import { createRng } from '../lib/eval/rng'
import {
  appendCalibrationEntry,
  appendRating,
  latestRunId,
  listRunIds,
  loadRatings,
  loadRun,
  type LoadedRun,
} from '../lib/eval/store'
import type {
  EvalScenario,
  HumanRating,
  JudgeResult,
  OptionId,
  ScenarioResult,
  SuggestionOption,
} from '../lib/eval/types'

const { values: args } = parseArgs({
  options: {
    run: { type: 'string' },
    n: { type: 'string', default: '8' },
    pick: { type: 'string', default: 'mix' }, // mix | worst | random
    'calibrate-only': { type: 'boolean', default: false },
  },
})

interface RatableItem {
  runId: string
  scenario: EvalScenario
  result: ScenarioResult
  option: SuggestionOption
  judgeComposite: number | null
}

/** Judge composite for ONE option (per-option dims only, renormalized). */
function optionJudgeComposite(run: JudgeResult | undefined, optionId: OptionId): number | null {
  if (!run) return null
  const optionJudgement = run.per_option.find((o) => o.option_id === optionId)
  if (!optionJudgement) return null
  const scores: Record<string, number> = {}
  for (const ds of optionJudgement.dimension_scores) {
    scores[ds.dimension] = ds.score
  }
  return compositeScore(scores)
}

function collectItems(run: LoadedRun): RatableItem[] {
  const scenarioById = new Map(run.scenarios.map((s) => [s.id, s]))
  const items: RatableItem[] = []
  for (const result of run.results) {
    const scenario = scenarioById.get(result.scenarioId)
    if (!scenario || !result.response) continue
    for (const option of result.response.options) {
      items.push({
        runId: run.meta.runId,
        scenario,
        result,
        option,
        judgeComposite: optionJudgeComposite(result.judgeRuns[0], option.id),
      })
    }
  }
  return items
}

function pickItems(items: RatableItem[], n: number, mode: string, seed: string): RatableItem[] {
  const rng = createRng(`rate-${seed}`)
  const alreadyRated = new Set(
    loadRatings().map((r) => `${r.runId}/${r.scenarioId}/${r.optionId}`),
  )
  const fresh = items.filter(
    (i) => !alreadyRated.has(`${i.runId}/${i.scenario.id}/${i.option.id}`),
  )
  const pool = fresh.length >= n ? fresh : items

  if (mode === 'random') return rng.shuffle(pool).slice(0, n)
  const byWorst = [...pool].sort(
    (a, b) => (a.judgeComposite ?? 5) - (b.judgeComposite ?? 5),
  )
  if (mode === 'worst') return byWorst.slice(0, n)
  // mix: half worst (where the judge thinks there are problems), half random
  const half = Math.ceil(n / 2)
  const worstPicks = byWorst.slice(0, half)
  const rest = rng
    .shuffle(pool.filter((i) => !worstPicks.includes(i)))
    .slice(0, n - worstPicks.length)
  return [...worstPicks, ...rest]
}

function renderItem(item: RatableItem, index: number, total: number): string {
  const p = item.scenario.payload
  const deficits = p.training_state.per_fau
    .filter((f) => f.status === 'neglected')
    .sort((a, b) => b.deficit_share - a.deficit_share)
    .slice(0, 4)
    .map((f) => `${f.fau} +${f.deficit_share.toFixed(3)}`)
  const expectations = item.scenario.expectations.map((e) => `  · ${e.description}`)
  const exercises = item.option.exercises.map(
    (e, i) => `  ${i + 1}. ${exerciseName(e.id)} — ${e.rationale}`,
  )
  const gateFails = item.result.hardChecks
    .filter((c) => !c.passed && (c.optionId === undefined || c.optionId === item.option.id))
    .map((c) => `  ! ${c.name}: ${c.detail}`)

  return [
    '',
    `═══ [${index + 1}/${total}] ${item.scenario.id}`,
    `Scenario: ${item.scenario.description}`,
    `Request: ${p.ephemeral_context.time_budget_minutes}min, ${p.ephemeral_context.intensity_vibe}` +
      `${p.ephemeral_context.prioritize_freetext ? `, prioritize: "${p.ephemeral_context.prioritize_freetext}"` : ''}` +
      `${p.ephemeral_context.deprioritize_freetext ? `, deprioritize: "${p.ephemeral_context.deprioritize_freetext}"` : ''}`,
    `Goals: ${p.durable_profile.goal_sentences.join(' | ')}`,
    deficits.length > 0 ? `Neglected: ${deficits.join(', ')}` : 'Neglected: none',
    ...(expectations.length > 0 ? ['Expectations:', ...expectations] : []),
    '',
    `─── Option ${item.option.id} — "${item.option.name}"`,
    `${item.option.description}`,
    `${item.option.summary}`,
    ...exercises,
    ...(gateFails.length > 0 ? ['', 'Gate failures:', ...gateFails] : []),
  ].join('\n')
}

function rubricHelp(): string {
  return RUBRIC_DIMENSIONS.map(
    (d) => `  ${d.flagKey} = ${d.key}: ${d.label}`,
  ).join('\n')
}

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

function ranks(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }))
  indexed.sort((a, b) => a.v - b.v)
  const result = new Array<number>(values.length)
  let pos = 0
  while (pos < indexed.length) {
    let end = pos
    while (end + 1 < indexed.length && indexed[end + 1].v === indexed[pos].v) end++
    const avgRank = (pos + end) / 2 + 1
    for (let k = pos; k <= end; k++) result[indexed[k].i] = avgRank
    pos = end + 1
  }
  return result
}

function spearman(a: number[], b: number[]): number | null {
  if (a.length < 3) return null
  const ra = ranks(a)
  const rb = ranks(b)
  const meanA = ra.reduce((x, y) => x + y, 0) / ra.length
  const meanB = rb.reduce((x, y) => x + y, 0) / rb.length
  let cov = 0
  let varA = 0
  let varB = 0
  for (let i = 0; i < ra.length; i++) {
    cov += (ra[i] - meanA) * (rb[i] - meanB)
    varA += (ra[i] - meanA) ** 2
    varB += (rb[i] - meanB) ** 2
  }
  if (varA === 0 || varB === 0) return null
  return Math.round((cov / Math.sqrt(varA * varB)) * 1000) / 1000
}

function twoLowestDimensions(run: JudgeResult | undefined, optionId: OptionId): string[] {
  if (!run) return []
  const optionJudgement = run.per_option.find((o) => o.option_id === optionId)
  if (!optionJudgement) return []
  return [...optionJudgement.dimension_scores]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((d) => d.dimension)
}

function recomputeCalibration(): void {
  const ratings = loadRatings()
  if (ratings.length === 0) {
    console.log('no ratings yet — nothing to calibrate')
    return
  }

  const runCache = new Map<string, LoadedRun>()
  const humanScores: number[] = []
  const judgeScores: number[] = []
  let flagged = 0
  let flagsAgreed = 0
  let judgeModel = 'unknown'

  for (const rating of ratings) {
    let run = runCache.get(rating.runId)
    if (!run) {
      try {
        run = loadRun(rating.runId)
      } catch {
        continue
      }
      runCache.set(rating.runId, run)
    }
    judgeModel = run.meta.judgeModel
    const result = run.results.find((r) => r.scenarioId === rating.scenarioId)
    if (!result) continue
    const judge = optionJudgeComposite(result.judgeRuns[0], rating.optionId)
    if (judge === null) continue
    humanScores.push(rating.overall)
    judgeScores.push(judge)

    if (rating.flaggedDimensions.length > 0) {
      flagged++
      const lowest = twoLowestDimensions(result.judgeRuns[0], rating.optionId)
      if (rating.flaggedDimensions.some((f) => lowest.includes(f))) flagsAgreed++
    }
  }

  const meanAbsDiff =
    humanScores.length > 0
      ? Math.round(
          (humanScores.reduce((acc, h, i) => acc + Math.abs(h - judgeScores[i]), 0) /
            humanScores.length) *
            100,
        ) / 100
      : null

  const entry = {
    computedAt: new Date().toISOString(),
    rubricVersion: RUBRIC_VERSION,
    judgeModel,
    sampleSize: humanScores.length,
    spearman: spearman(humanScores, judgeScores),
    meanAbsDiff,
    flagAgreement: flagged > 0 ? Math.round((flagsAgreed / flagged) * 100) / 100 : null,
  }
  appendCalibrationEntry(entry)

  console.log('\n── Calibration (all ratings to date) ──')
  console.log(`  sample size:     ${entry.sampleSize}`)
  console.log(`  spearman:        ${entry.spearman ?? 'n/a (need >=3 ratings)'}`)
  console.log(`  mean |Δ|:        ${entry.meanAbsDiff ?? 'n/a'} (on the 1-4 scale)`)
  console.log(`  flag agreement:  ${entry.flagAgreement ?? 'n/a'}`)
  if (entry.spearman !== null && entry.spearman < 0.4) {
    console.log(
      '  ⚠ Weak correlation — do NOT trust judge-only iteration until the rubric or judge model improves.',
    )
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (args['calibrate-only']) {
    recomputeCalibration()
    return
  }

  const runId = args.run ?? latestRunId()
  if (!runId) {
    console.error(`No eval runs found. Run eval-suggest first. Known runs: ${listRunIds().join(', ') || '(none)'}`)
    process.exit(1)
  }

  const run = loadRun(runId)
  const items = collectItems(run)
  if (items.length === 0) {
    console.error(`Run ${runId} has no rateable results`)
    process.exit(1)
  }

  const n = Number.parseInt(args.n ?? '8', 10)
  const picked = pickItems(items, n, args.pick ?? 'mix', runId)

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  console.log(`Rating ${picked.length} options from run ${runId} (pick=${args.pick}).`)
  console.log('Scale: 1 = would mislead/annoy me, 2 = flawed, 3 = acceptable, 4 = would use as-is.')
  console.log('Keys: 1-4 rate, s skip, ? rubric help, q quit.\n')

  let rated = 0
  for (let i = 0; i < picked.length; i++) {
    const item = picked[i]
    console.log(renderItem(item, i, picked.length))

    let overall: number | null = null
    while (overall === null) {
      const answer = (await rl.question('\nrate [1-4 / s / ? / q]: ')).trim().toLowerCase()
      if (answer === 'q') {
        rl.close()
        if (rated > 0) recomputeCalibration()
        return
      }
      if (answer === 's') break
      if (answer === '?') {
        console.log(`\nDimension flag keys:\n${rubricHelp()}`)
        continue
      }
      const num = Number.parseInt(answer, 10)
      if (num >= 1 && num <= 4) overall = num
    }
    if (overall === null) continue

    let flaggedDimensions: string[] = []
    if (overall <= 3) {
      const flagsAnswer = (
        await rl.question(`what's wrong? letters (${RUBRIC_DIMENSIONS.map((d) => d.flagKey).join('')}), empty=skip: `)
      )
        .trim()
        .toLowerCase()
      flaggedDimensions = [...flagsAnswer]
        .map((ch) => dimensionByFlagKey(ch)?.key)
        .filter((k): k is string => k !== undefined)
    }

    const note = (await rl.question('note (enter to skip): ')).trim()

    const rating: HumanRating = {
      ratedAt: new Date().toISOString(),
      runId: item.runId,
      scenarioId: item.scenario.id,
      optionId: item.option.id,
      overall,
      flaggedDimensions,
      note: note.length > 0 ? note : null,
    }
    appendRating(rating)
    rated++
    console.log(
      `saved. judge had this at ${item.judgeComposite ?? 'n/a'}${
        item.judgeComposite !== null && Math.abs(item.judgeComposite - overall) >= 1
          ? '  ← disagreement worth a look'
          : ''
      }`,
    )
  }

  rl.close()
  console.log(`\n${rated} ratings saved to .eval/ratings.jsonl`)
  if (rated > 0) recomputeCalibration()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
