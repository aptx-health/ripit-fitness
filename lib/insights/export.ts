import type { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'

/**
 * Raw training rows for the export_training_data MCP tool and the CSV route
 * (app/api/agent/export.csv). One row per LoggedSet, warmups included, from
 * the user's completed and abandoned, unarchived sessions. Nothing is
 * converted or derived.
 */

export const EXPORT_COLUMNS = [
  'date',
  'completionId',
  'workoutName',
  'isAdHoc',
  'status',
  'sessionRpe',
  'durationSeconds',
  'exerciseDefinitionId',
  'exerciseName',
  'exerciseOrder',
  'setNumber',
  'reps',
  'weight',
  'unit',
  'rpe',
  'rir',
  'isWarmup',
] as const

export type ExportCell = string | number | boolean | null
export type ExportRow = ExportCell[]

const EXPORT_STATUSES = ['completed', 'abandoned']

/** The CSV route returns at most this many days in one response. */
export const MAX_CSV_RANGE_DAYS = 1096

const DAY_MS = 24 * 60 * 60 * 1000

// A date (midnight UTC) or an ISO timestamp with an offset.
const dateInput = z.iso.date().or(z.iso.datetime({ offset: true }))

export type RangeResult = { ok: true; since: Date; until: Date } | { ok: false; field: 'since' | 'until'; error: string }

const isAbsent = (value: unknown) => value === undefined || value === null || value === ''

/** `since` inclusive, `until` exclusive (default now). An empty value counts as absent. */
export function parseRange(since: unknown, until: unknown, now: Date): RangeResult {
  if (isAbsent(since)) {
    return { ok: false, field: 'since', error: 'since is required (a date or ISO timestamp)' }
  }
  if (!dateInput.safeParse(since).success) {
    return { ok: false, field: 'since', error: 'since must be a date (YYYY-MM-DD) or ISO timestamp' }
  }
  if (!isAbsent(until) && !dateInput.safeParse(until).success) {
    return { ok: false, field: 'until', error: 'until must be a date (YYYY-MM-DD) or ISO timestamp' }
  }
  const from = new Date(since as string)
  const to = isAbsent(until) ? now : new Date(until as string)
  if (to.getTime() <= from.getTime()) return { ok: false, field: 'until', error: 'until must be after since' }
  return { ok: true, since: from, until: to }
}

export function rangeDays(since: Date, until: Date): number {
  return (until.getTime() - since.getTime()) / DAY_MS
}

const exportSelect = {
  setNumber: true,
  reps: true,
  weight: true,
  weightUnit: true,
  rpe: true,
  rir: true,
  isWarmup: true,
  completionId: true,
  completion: {
    select: {
      completedAt: true,
      name: true,
      isAdHoc: true,
      status: true,
      sessionRpe: true,
      durationSeconds: true,
      workout: { select: { name: true } },
    },
  },
  exercise: { select: { order: true, exerciseDefinitionId: true, exerciseDefinition: { select: { name: true } } } },
} satisfies Prisma.LoggedSetSelect

type ExportSet = Prisma.LoggedSetGetPayload<{ select: typeof exportSelect }>

function toRow(set: ExportSet): ExportRow {
  const c = set.completion
  return [
    c.completedAt.toISOString(),
    set.completionId,
    c.name ?? c.workout?.name ?? null,
    c.isAdHoc,
    c.status,
    c.sessionRpe,
    c.durationSeconds,
    set.exercise.exerciseDefinitionId,
    set.exercise.exerciseDefinition.name,
    set.exercise.order,
    set.setNumber,
    set.reps,
    set.weight,
    set.weightUnit,
    set.rpe,
    set.rir,
    set.isWarmup,
  ]
}

/**
 * Rows in the range, ordered by date, completionId, exercise order and set
 * number (id breaks any remaining tie, so paging by offset is stable). One query.
 */
export async function fetchExportRows(
  prisma: PrismaClient,
  userId: string,
  range: { since: Date; until: Date },
  page?: { skip: number; take: number }
): Promise<ExportRow[]> {
  const sets = await prisma.loggedSet.findMany({
    where: {
      completion: {
        userId,
        status: { in: EXPORT_STATUSES },
        isArchived: false,
        completedAt: { gte: range.since, lt: range.until },
      },
    },
    orderBy: [
      { completion: { completedAt: 'asc' } },
      { completionId: 'asc' },
      { exercise: { order: 'asc' } },
      { setNumber: 'asc' },
      { id: 'asc' },
    ],
    ...(page && { skip: page.skip, take: page.take }),
    select: exportSelect,
  })
  return sets.map(toRow)
}

// ---------------------------------------------------------------------------
// MCP paging. The cursor is opaque to agents: the next offset plus the resolved
// range, so a page with no `until` keeps the "now" of the first page.
// ---------------------------------------------------------------------------

interface CursorState {
  offset: number
  since: string
  until: string
}

export function encodeCursor(state: CursorState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64url')
}

export function decodeCursor(cursor: string): CursorState | null {
  try {
    const state = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<CursorState>
    if (
      !Number.isInteger(state.offset) ||
      (state.offset as number) < 0 ||
      typeof state.since !== 'string' ||
      typeof state.until !== 'string' ||
      Number.isNaN(Date.parse(state.since)) ||
      Number.isNaN(Date.parse(state.until))
    ) {
      return null
    }
    return state as CursorState
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// CSV (RFC 4180), with a formula guard on text cells.
// ---------------------------------------------------------------------------

function csvCell(value: ExportCell): string {
  if (value === null) return ''
  if (typeof value !== 'string') return String(value)
  // Spreadsheets run text starting with these as a formula, including after
  // leading whitespace, and a leading tab or CR can smuggle one in.
  const guarded = /^(?:[=+\-@\t\r]|\s+[=+\-@])/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded
}

export function toCsv(rows: ExportRow[]): string {
  const lines = [EXPORT_COLUMNS.join(','), ...rows.map((row) => row.map(csvCell).join(','))]
  return `${lines.join('\r\n')}\r\n`
}
