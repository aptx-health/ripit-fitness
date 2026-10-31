import type { Prisma } from '@prisma/client'
import { ANCHOR_PATTERN_DISPLAY_NAMES, ANCHOR_PATTERNS, type TargetMovements } from '@/lib/exercises/anchor-patterns'
import { ALL_FAUS, FAU_DISPLAY_NAMES, type FAUKey } from '@/lib/fau-volume'
import {
  DEFAULT_LOOKBACK_DAYS,
  DEFAULT_SECONDARY_WEIGHT,
  MAX_TARGET_WEIGHT,
  MIN_TARGET_WEIGHT,
  TARGET_STEP,
} from '@/lib/muscle-balance'

/**
 * Anchors, muscle-balance targets and per-FAU volume for the get_anchors,
 * get_balance_targets and get_fau_volume MCP tools, plus the target rules the
 * balance proposals share. Raw numbers only; the agent decides what is behind.
 * Pure: the tools do the queries, and never create a row.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export const TARGET_BOUNDS = { min: MIN_TARGET_WEIGHT, max: MAX_TARGET_WEIGHT, step: TARGET_STEP }

/** Volume counts finished sessions only, as the Settings balance view does. */
export const VOLUME_SESSION_STATUSES = ['completed']

export type BalanceTargets = Record<FAUKey, number>

export interface CalcSettings {
  lookbackDays: number
  includeSecondary: boolean
  secondaryWeight: number
  excludeWarmups: boolean
}

export const DEFAULT_CALC_SETTINGS: CalcSettings = {
  lookbackDays: DEFAULT_LOOKBACK_DAYS,
  includeSecondary: true,
  secondaryWeight: DEFAULT_SECONDARY_WEIGHT,
  excludeWarmups: true,
}

const wholeDays = (now: Date, then: Date) => Math.max(0, Math.floor((now.getTime() - then.getTime()) / DAY_MS))

/**
 * The stored targets as saved, with 1 for any FAU missing or not a number. Not
 * rounded, so `before` snapshots compare exactly against the live row.
 */
export function effectiveTargets(stored: Prisma.JsonValue | undefined): BalanceTargets {
  const source = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
  const targets = {} as BalanceTargets
  for (const fau of ALL_FAUS) {
    const value = (source as Record<string, unknown>)[fau]
    targets[fau] = typeof value === 'number' && Number.isFinite(value) ? value : 1
  }
  return targets
}

export function calcSettings(row: CalcSettings | null): CalcSettings {
  if (!row) return { ...DEFAULT_CALC_SETTINGS }
  const { lookbackDays, includeSecondary, secondaryWeight, excludeWarmups } = row
  return { lookbackDays, includeSecondary, secondaryWeight, excludeWarmups }
}

/** A target an agent may propose: 0–2 on the 0.05 step. Off-step values are refused, not rounded. */
export function isValidTarget(value: number): boolean {
  if (!Number.isFinite(value) || value < MIN_TARGET_WEIGHT || value > MAX_TARGET_WEIGHT) return false
  const steps = value / TARGET_STEP
  return Math.abs(steps - Math.round(steps)) < 1e-9
}

/** Two decimals at most, so float noise from Settings never reaches a summary. */
export const formatTarget = (value: number) => String(Number(value.toFixed(2)))

// ---------------------------------------------------------------------------
// get_anchors
// ---------------------------------------------------------------------------

export interface AnchorExercise {
  id: string
  name: string
  lastLoggedDaysAgo: number | null
}

/**
 * All 6 patterns in taxonomy order, each pattern's exercises in stored order.
 * An id with no visible definition (deleted, or not the user's) is left out.
 */
export function buildAnchors(
  anchors: TargetMovements,
  names: Map<string, string>,
  lastLogged: Map<string, Date>,
  now: Date
) {
  return {
    patterns: ANCHOR_PATTERNS.map((pattern) => ({
      pattern,
      displayName: ANCHOR_PATTERN_DISPLAY_NAMES[pattern],
      exercises: (anchors[pattern] ?? []).flatMap((id): AnchorExercise[] => {
        const name = names.get(id)
        if (name === undefined) return []
        const logged = lastLogged.get(id)
        return [{ id, name, lastLoggedDaysAgo: logged ? wholeDays(now, logged) : null }]
      }),
    })),
    validPatterns: [...ANCHOR_PATTERNS],
    maxPerPattern: 5,
  }
}

// ---------------------------------------------------------------------------
// get_fau_volume
// ---------------------------------------------------------------------------

export interface VolumeSessionRow {
  completedAt: Date
  sets: Array<{ isWarmup: boolean; primaryFAUs: string[]; secondaryFAUs: string[] }>
}

export interface FauVolumeRow {
  fau: FAUKey
  displayName: string
  primarySets: number
  secondarySets: number
  target: number
  lastTrainedDaysAgo: number | null
}

const isFau = (value: string): value is FAUKey => (ALL_FAUS as readonly string[]).includes(value)

/**
 * Raw set counts per FAU: each counted set adds 1 to every primary FAU and 1 to
 * every secondary FAU of its definition. No weighting; `secondaryWeight` is
 * returned with the settings for the agent to apply. `sessions` are the rows
 * passed in, already limited to the window.
 */
export function computeFauVolume(
  sessions: VolumeSessionRow[],
  targets: BalanceTargets,
  excludeWarmups: boolean,
  now: Date
): FauVolumeRow[] {
  const primary = new Map<FAUKey, number>()
  const secondary = new Map<FAUKey, number>()
  const lastTrained = new Map<FAUKey, Date>()

  for (const session of sessions) {
    for (const set of session.sets) {
      if (excludeWarmups && set.isWarmup) continue
      for (const fau of set.primaryFAUs) {
        if (!isFau(fau)) continue
        primary.set(fau, (primary.get(fau) ?? 0) + 1)
        const last = lastTrained.get(fau)
        if (!last || session.completedAt > last) lastTrained.set(fau, session.completedAt)
      }
      for (const fau of set.secondaryFAUs) {
        if (isFau(fau)) secondary.set(fau, (secondary.get(fau) ?? 0) + 1)
      }
    }
  }

  return ALL_FAUS.map((fau) => {
    const last = lastTrained.get(fau)
    return {
      fau,
      displayName: FAU_DISPLAY_NAMES[fau],
      primarySets: primary.get(fau) ?? 0,
      secondarySets: secondary.get(fau) ?? 0,
      target: targets[fau],
      lastTrainedDaysAgo: last ? wholeDays(now, last) : null,
    }
  })
}
