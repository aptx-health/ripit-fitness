/**
 * File-based state for the eval loop. Everything lives under `.eval/`
 * (gitignored) — this is dev tooling, not app data.
 *
 * Layout:
 *   .eval/
 *     runs/<runId>/
 *       meta.json                # RunMeta
 *       scenarios.json           # EvalScenario[] (full payloads, replayable)
 *       results/<scenarioId>.json# ScenarioResult
 *       report.json              # RunReport (see report.ts)
 *       report.md
 *     ratings.jsonl              # HumanRating, append-only
 *     calibration.json           # human-vs-judge calibration history
 *     variants/<name>.json       # experimental PromptVariant files
 *     proposals/<runId>.md       # refinement-engine output
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import {
  PLANNER_PROMPT_VARIANTS,
  type PromptVariant,
} from '@/lib/suggest/prompts/registry'

import type {
  EvalScenario,
  HumanRating,
  RunMeta,
  ScenarioResult,
} from './types'

export function evalRoot(): string {
  return path.join(process.cwd(), '.eval')
}

function runDir(runId: string): string {
  return path.join(evalRoot(), 'runs', runId)
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

function writeJson(file: string, data: unknown): void {
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export function makeRunId(promptVariant: string, now = new Date()): string {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..*$/, '')
    .replace('T', '-')
  return `${stamp}-${promptVariant.replace(/[^a-zA-Z0-9_+.-]/g, '_')}`
}

export function saveRunMeta(meta: RunMeta): void {
  writeJson(path.join(runDir(meta.runId), 'meta.json'), meta)
}

export function saveScenarios(runId: string, scenarios: EvalScenario[]): void {
  writeJson(path.join(runDir(runId), 'scenarios.json'), scenarios)
}

export function saveScenarioResult(runId: string, result: ScenarioResult): void {
  writeJson(
    path.join(runDir(runId), 'results', `${result.scenarioId}.json`),
    result,
  )
}

export function saveReport(runId: string, report: unknown, markdown: string): void {
  writeJson(path.join(runDir(runId), 'report.json'), report)
  fs.writeFileSync(path.join(runDir(runId), 'report.md'), markdown)
}

export interface LoadedRun {
  meta: RunMeta
  scenarios: EvalScenario[]
  results: ScenarioResult[]
}

export function loadRun(runId: string): LoadedRun {
  const dir = runDir(runId)
  if (!fs.existsSync(dir)) {
    throw new Error(`No such run: ${runId} (looked in ${dir})`)
  }
  const meta = readJson<RunMeta>(path.join(dir, 'meta.json'))
  const scenarios = readJson<EvalScenario[]>(path.join(dir, 'scenarios.json'))
  const resultsDir = path.join(dir, 'results')
  const results = fs.existsSync(resultsDir)
    ? fs
        .readdirSync(resultsDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => readJson<ScenarioResult>(path.join(resultsDir, f)))
    : []
  return { meta, scenarios, results }
}

export function listRunIds(): string[] {
  const dir = path.join(evalRoot(), 'runs')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => fs.existsSync(path.join(dir, f, 'meta.json')))
    .sort()
}

export function latestRunId(): string | null {
  const runs = listRunIds()
  return runs.length > 0 ? runs[runs.length - 1] : null
}

// ---------------------------------------------------------------------------
// Human ratings
// ---------------------------------------------------------------------------

function ratingsFile(): string {
  return path.join(evalRoot(), 'ratings.jsonl')
}

export function appendRating(rating: HumanRating): void {
  ensureDir(evalRoot())
  fs.appendFileSync(ratingsFile(), `${JSON.stringify(rating)}\n`)
}

export function loadRatings(): HumanRating[] {
  const file = ratingsFile()
  if (!fs.existsSync(file)) return []
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as HumanRating)
}

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

export interface CalibrationEntry {
  computedAt: string
  rubricVersion: string
  judgeModel: string
  sampleSize: number
  /** Spearman rank correlation, human overall vs judge composite. */
  spearman: number | null
  /** Mean |human - judge| on the shared 1-4 scale. */
  meanAbsDiff: number | null
  /**
   * Of options where the human flagged >=1 dimension, fraction where a
   * flagged dimension is among the judge's two lowest for that option.
   */
  flagAgreement: number | null
}

export function loadCalibrationHistory(): CalibrationEntry[] {
  const file = path.join(evalRoot(), 'calibration.json')
  if (!fs.existsSync(file)) return []
  return readJson<CalibrationEntry[]>(file)
}

export function appendCalibrationEntry(entry: CalibrationEntry): void {
  const history = loadCalibrationHistory()
  history.push(entry)
  writeJson(path.join(evalRoot(), 'calibration.json'), history)
}

// ---------------------------------------------------------------------------
// Prompt variants
// ---------------------------------------------------------------------------

/**
 * Resolve a prompt variant by name: committed variants from the
 * registry first, then experimental `.eval/variants/<name>.json`.
 */
export function resolvePromptVariant(name: string): PromptVariant {
  const builtin = PLANNER_PROMPT_VARIANTS[name]
  if (builtin) return builtin

  const file = path.join(evalRoot(), 'variants', `${name}.json`)
  if (fs.existsSync(file)) {
    const variant = readJson<PromptVariant>(file)
    if (!Array.isArray(variant.sections) || variant.sections.length === 0) {
      throw new Error(`Variant file ${file} has no sections`)
    }
    return variant
  }

  const known = [
    ...Object.keys(PLANNER_PROMPT_VARIANTS),
    ...listExperimentalVariants(),
  ]
  throw new Error(
    `Unknown prompt variant "${name}". Known: ${known.join(', ') || '(none)'}`,
  )
}

export function listExperimentalVariants(): string[] {
  const dir = path.join(evalRoot(), 'variants')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort()
}

export function saveExperimentalVariant(variant: PromptVariant): string {
  const file = path.join(evalRoot(), 'variants', `${variant.version}.json`)
  if (fs.existsSync(file)) {
    throw new Error(`Variant ${variant.version} already exists at ${file}`)
  }
  writeJson(file, variant)
  return file
}

export function saveProposal(runId: string, markdown: string): string {
  const file = path.join(evalRoot(), 'proposals', `${runId}.md`)
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, markdown)
  return file
}
