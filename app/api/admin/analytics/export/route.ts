import { Prisma } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'

import { requireEditor } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

const END_USER_ROLE = 'user'
const ONLY_END_USERS = Prisma.sql`AND u.role::text = ${END_USER_ROLE}`

const VALID_TABLES = ['events', 'feedback', 'completions'] as const
type ExportTable = (typeof VALID_TABLES)[number]

interface EventRow {
  id: string
  email: string
  event: string
  properties: string | null
  pageUrl: string | null
  sessionId: string | null
  createdAt: Date
}

interface FeedbackRow {
  id: string
  email: string
  category: string
  message: string
  pageUrl: string
  rating: number | null
  refinements: string[]
  status: string
  createdAt: Date
}

interface CompletionRow {
  id: string
  email: string
  workoutName: string
  programName: string
  status: string
  completedAt: Date
  notes: string | null
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function toCsvRow(fields: string[]): string {
  return fields.map((f) => escapeCsvField(f)).join(',')
}

function formatDate(d: Date | null): string {
  if (!d) return ''
  return new Date(d).toISOString()
}

function jsonToString(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  return JSON.stringify(val)
}

async function exportEvents(since: Date): Promise<string> {
  const rows = await prisma.$queryRaw<EventRow[]>`
    SELECT
      ae.id,
      u.email,
      ae.event,
      ae.properties::text AS properties,
      ae."pageUrl",
      ae."sessionId",
      ae."createdAt"
    FROM "AppEvent" ae
    INNER JOIN "user" u ON u.id = ae."userId"
    WHERE ae."createdAt" >= ${since}
      ${ONLY_END_USERS}
    ORDER BY ae."createdAt" DESC
  `

  const header = toCsvRow(['id', 'email', 'event', 'properties', 'pageUrl', 'sessionId', 'createdAt'])
  const lines = rows.map((r) =>
    toCsvRow([r.id, r.email, r.event, jsonToString(r.properties), r.pageUrl ?? '', r.sessionId ?? '', formatDate(r.createdAt)])
  )
  return [header, ...lines].join('\n')
}

async function exportFeedback(since: Date): Promise<string> {
  const rows = await prisma.$queryRaw<FeedbackRow[]>`
    SELECT
      f.id,
      u.email,
      f.category,
      f.message,
      f."pageUrl",
      f.rating,
      f.refinements,
      f.status,
      f."createdAt"
    FROM "Feedback" f
    INNER JOIN "user" u ON u.id = f."userId"
    WHERE f."createdAt" >= ${since}
      ${ONLY_END_USERS}
    ORDER BY f."createdAt" DESC
  `

  const header = toCsvRow(['id', 'email', 'category', 'message', 'pageUrl', 'rating', 'refinements', 'status', 'createdAt'])
  const lines = rows.map((r) =>
    toCsvRow([
      r.id,
      r.email,
      r.category,
      r.message,
      r.pageUrl,
      r.rating !== null ? String(r.rating) : '',
      r.refinements.length > 0 ? r.refinements.join('; ') : '',
      r.status,
      formatDate(r.createdAt),
    ])
  )
  return [header, ...lines].join('\n')
}

async function exportCompletions(since: Date): Promise<string> {
  const rows = await prisma.$queryRaw<CompletionRow[]>`
    SELECT
      wc.id,
      u.email,
      w.name AS "workoutName",
      p.name AS "programName",
      wc.status,
      wc."completedAt",
      wc.notes
    FROM "WorkoutCompletion" wc
    INNER JOIN "user" u ON u.id = wc."userId"
    LEFT JOIN "Workout" w ON w.id = wc."workoutId"
    LEFT JOIN "Week" wk ON wk.id = w."weekId"
    LEFT JOIN "Program" p ON p.id = wk."programId"
    WHERE wc."completedAt" >= ${since}
      ${ONLY_END_USERS}
    ORDER BY wc."completedAt" DESC
  `

  const header = toCsvRow(['id', 'email', 'workoutName', 'programName', 'status', 'completedAt', 'notes'])
  const lines = rows.map((r) =>
    toCsvRow([
      r.id,
      r.email,
      r.workoutName ?? '',
      r.programName ?? '',
      r.status,
      formatDate(r.completedAt),
      r.notes ?? '',
    ])
  )
  return [header, ...lines].join('\n')
}

const exporters: Record<ExportTable, (since: Date) => Promise<string>> = {
  events: exportEvents,
  feedback: exportFeedback,
  completions: exportCompletions,
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireEditor({ rateLimit: true })
    if (auth.response) return auth.response

    const tableParam = request.nextUrl.searchParams.get('table')
    if (!tableParam || !VALID_TABLES.includes(tableParam as ExportTable)) {
      return NextResponse.json(
        { error: `Invalid table. Must be one of: ${VALID_TABLES.join(', ')}` },
        { status: 400 }
      )
    }
    const table = tableParam as ExportTable

    const daysParam = request.nextUrl.searchParams.get('days')
    const parsedDays = daysParam ? Number(daysParam) : NaN
    const days = Number.isFinite(parsedDays)
      ? Math.min(Math.max(Math.floor(parsedDays), 1), 365)
      : 90
    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const csv = await exporters[table](since)
    const filename = `ripit-${table}-${days}d-${new Date().toISOString().slice(0, 10)}.csv`

    logger.info({ table, days, user: auth.user.email }, 'CSV export')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    logger.error({ error, context: 'admin-analytics-export' }, 'Failed to export CSV')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
