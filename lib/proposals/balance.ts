import type { Prisma, PrismaClient } from '@prisma/client'
import {
  ANCHOR_PATTERN_DISPLAY_NAMES,
  type AnchorPattern,
  isAnchorPattern,
  MAX_ANCHOR_EXERCISES,
} from '@/lib/exercises/anchor-patterns'
import type { FAUKey } from '@/lib/fau-volume'
import { DEFAULT_CALC_SETTINGS, effectiveTargets, formatTarget, isValidTarget } from '@/lib/insights/balance'
import { getDefaultMuscleBalanceTargets, isFAUKey } from '@/lib/muscle-balance'
import { normalizeTargetMovements } from '@/lib/user-training-profile'
import { visibleTo } from './exercise-definition'

/**
 * Anchor (`anchors.update`) and muscle-balance target (`balance_targets.update`)
 * proposals. Each change names the keys it touches; `before` and `inverse` hold
 * only those keys. Conflicts compare the touched keys' values, never
 * `updatedAt`, so an unrelated profile or settings edit doesn't block approval.
 */

type Db = PrismaClient | Prisma.TransactionClient

export type AnchorChanges = Partial<Record<AnchorPattern, string[]>>
export type TargetChanges = Partial<Record<FAUKey, number>>

export type BalanceCheck<T> = { ok: true; changes: T } | { ok: false; code: 'invalid'; error: string; field: string }

/** Thrown inside the approve or revert transaction; the message names what changed. */
export class BalanceConflict extends Error {}

const CALC_KEYS = new Set(Object.keys(DEFAULT_CALC_SETTINGS))

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i])

// ---------------------------------------------------------------------------
// Anchors
// ---------------------------------------------------------------------------

/**
 * Valid patterns, at most 5 ids each after duplicates are removed, and every id
 * visible to the user. The first failure is reported, named by its pattern.
 */
export async function checkAnchorChanges(
  db: Db,
  changes: Record<string, unknown>,
  userId: string
): Promise<BalanceCheck<AnchorChanges>> {
  const out: AnchorChanges = {}
  for (const [pattern, value] of Object.entries(changes)) {
    if (!isAnchorPattern(pattern)) {
      return { ok: false, code: 'invalid', error: `${pattern} is not an anchor pattern`, field: pattern }
    }
    if (!Array.isArray(value) || value.some((id) => typeof id !== 'string')) {
      return { ok: false, code: 'invalid', error: `${pattern} must be a list of exercise ids`, field: pattern }
    }
    const ids = [...new Set(value as string[])]
    if (ids.length > MAX_ANCHOR_EXERCISES) {
      return {
        ok: false,
        code: 'invalid',
        error: `${pattern} takes at most ${MAX_ANCHOR_EXERCISES} exercises`,
        field: pattern,
      }
    }
    out[pattern] = ids
  }

  const ids = [...new Set(Object.values(out).flat())]
  const found = await db.exerciseDefinition.findMany({
    where: { id: { in: ids }, ...visibleTo(userId) },
    select: { id: true },
  })
  const visible = new Set(found.map((d) => d.id))
  for (const [pattern, list] of Object.entries(out)) {
    const missing = list.find((id) => !visible.has(id))
    if (missing) {
      return { ok: false, code: 'invalid', error: `${pattern}: exercise not found: ${missing}`, field: pattern }
    }
  }
  return { ok: true, changes: out }
}

export async function anchorsBefore(db: Db, userId: string, changes: AnchorChanges): Promise<AnchorChanges> {
  const profile = await db.userTrainingProfile.findUnique({ where: { userId }, select: { targetMovements: true } })
  const live = normalizeTargetMovements(profile?.targetMovements)
  const before: AnchorChanges = {}
  for (const pattern of Object.keys(changes) as AnchorPattern[]) before[pattern] = live[pattern] ?? []
  return before
}

export function anchorSummary(changes: AnchorChanges): string {
  const names = (Object.keys(changes) as AnchorPattern[]).map((p) => ANCHOR_PATTERN_DISPLAY_NAMES[p])
  return `Update anchors: ${names.join(', ')}`
}

/**
 * Write `next` over the touched patterns if each still holds `expected`;
 * otherwise throw BalanceConflict. Creates the profile when there is none (its
 * unused ratioTargets column gets the default targets, not Settings').
 */
export async function swapAnchors(
  tx: Prisma.TransactionClient,
  userId: string,
  expected: AnchorChanges,
  next: AnchorChanges
): Promise<void> {
  const profile = await tx.userTrainingProfile.findUnique({
    where: { userId },
    select: { targetMovements: true, updatedAt: true },
  })
  const live = normalizeTargetMovements(profile?.targetMovements)
  for (const [pattern, list] of Object.entries(expected) as Array<[AnchorPattern, string[]]>) {
    if (!sameList(live[pattern] ?? [], list)) throw new BalanceConflict(`${pattern} anchors`)
  }
  const targetMovements = normalizeTargetMovements({ ...live, ...next })

  if (!profile) {
    await tx.userTrainingProfile.create({
      data: { userId, ratioTargets: getDefaultMuscleBalanceTargets(), targetMovements },
    })
    return
  }
  // Guards the read above against a concurrent write in this window.
  const written = await tx.userTrainingProfile.updateMany({
    where: { userId, updatedAt: profile.updatedAt },
    data: { targetMovements },
  })
  if (written.count === 0) throw new BalanceConflict('anchors')
}

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

/** Each key a FAU (calc settings are refused by name), each value 0–2 on the 0.05 step. */
export function checkTargetChanges(changes: Record<string, unknown>): BalanceCheck<TargetChanges> {
  const out: TargetChanges = {}
  for (const [fau, value] of Object.entries(changes)) {
    if (CALC_KEYS.has(fau)) {
      return { ok: false, code: 'invalid', error: `${fau} is a calc setting; only targets can be proposed`, field: fau }
    }
    if (!isFAUKey(fau)) return { ok: false, code: 'invalid', error: `${fau} is not a FAU`, field: fau }
    if (typeof value !== 'number' || !isValidTarget(value)) {
      return { ok: false, code: 'invalid', error: `${fau} must be a number from 0 to 2 in steps of 0.05`, field: fau }
    }
    out[fau] = value
  }
  return { ok: true, changes: out }
}

export async function targetsBefore(db: Db, userId: string, changes: TargetChanges): Promise<TargetChanges> {
  const row = await db.userMuscleBalanceSettings.findUnique({ where: { userId }, select: { targets: true } })
  const live = effectiveTargets(row?.targets)
  const before: TargetChanges = {}
  for (const fau of Object.keys(changes) as FAUKey[]) before[fau] = live[fau]
  return before
}

export function targetSummary(changes: TargetChanges, before: TargetChanges): string {
  const parts = (Object.entries(changes) as Array<[FAUKey, number]>).map(
    ([fau, value]) => `${fau} ${formatTarget(before[fau] ?? 1)} → ${formatTarget(value)}`
  )
  return `Update targets: ${parts.join(', ')}`
}

/**
 * Write `next` over the touched FAUs if each still holds `expected`; otherwise
 * throw BalanceConflict. Calc settings are never written. With no settings row,
 * creates one with the default calc settings.
 */
export async function swapTargets(
  tx: Prisma.TransactionClient,
  userId: string,
  expected: TargetChanges,
  next: TargetChanges
): Promise<void> {
  const row = await tx.userMuscleBalanceSettings.findUnique({
    where: { userId },
    select: { targets: true, updatedAt: true },
  })
  const live = effectiveTargets(row?.targets)
  for (const [fau, value] of Object.entries(expected) as Array<[FAUKey, number]>) {
    if (live[fau] !== value) throw new BalanceConflict(`${fau} target`)
  }
  const targets = { ...live, ...next }

  if (!row) {
    await tx.userMuscleBalanceSettings.create({ data: { userId, targets, ...DEFAULT_CALC_SETTINGS } })
    return
  }
  const written = await tx.userMuscleBalanceSettings.updateMany({
    where: { userId, updatedAt: row.updatedAt },
    data: { targets },
  })
  if (written.count === 0) throw new BalanceConflict('targets')
}
