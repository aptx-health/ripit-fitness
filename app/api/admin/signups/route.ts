import { Prisma } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'

import { requireEditor } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

const END_USER_ROLE = 'user'
const ONLY_END_USERS = Prisma.sql`AND u.role::text = ${END_USER_ROLE}`

interface SignupRow {
  email: string
  createdAt: Date
  source: string | null
  experienceLevel: string | null
  firstWorkoutAt: Date | null
  signupIntent: string | null
  welcomePath: string | null
  welcomeMsToChoice: number | null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const daysParam = request.nextUrl.searchParams.get('days')
    const parsedDays = daysParam ? Number(daysParam) : NaN
    const days = Number.isFinite(parsedDays)
      ? Math.min(Math.max(Math.floor(parsedDays), 1), 365)
      : 30
    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const rows = await prisma.$queryRaw<SignupRow[]>`
      SELECT
        u.email,
        u."createdAt",
        ae.source,
        us."experienceLevel",
        us."signupIntent",
        wc."firstWorkoutAt",
        wp.path AS "welcomePath",
        wp."msToChoice" AS "welcomeMsToChoice"
      FROM "user" u
      LEFT JOIN LATERAL (
        SELECT (ae_inner.properties->>'source') AS source
        FROM "AppEvent" ae_inner
        WHERE ae_inner."userId" = u.id
          AND ae_inner.event = 'signup_completed'
        ORDER BY ae_inner."createdAt" DESC
        LIMIT 1
      ) ae ON true
      LEFT JOIN "UserSettings" us ON us."userId" = u.id
      LEFT JOIN LATERAL (
        SELECT MIN(wc_inner."completedAt") AS "firstWorkoutAt"
        FROM "WorkoutCompletion" wc_inner
        WHERE wc_inner."userId" = u.id
          AND wc_inner.status = 'completed'
      ) wc ON true
      LEFT JOIN LATERAL (
        SELECT
          CASE
            WHEN wp_inner.event = 'welcome_path_freestyle' THEN 'freestyle'
            WHEN wp_inner.event = 'welcome_path_program' THEN 'program'
            WHEN wp_inner.event = 'welcome_skipped' THEN 'skipped'
          END AS path,
          (wp_inner.properties->>'ms_to_choice')::int AS "msToChoice"
        FROM "AppEvent" wp_inner
        WHERE wp_inner."userId" = u.id
          AND wp_inner.event IN ('welcome_path_freestyle', 'welcome_path_program', 'welcome_skipped')
        ORDER BY wp_inner."createdAt" DESC
        LIMIT 1
      ) wp ON true
      WHERE u."createdAt" >= ${since}
        ${ONLY_END_USERS}
      ORDER BY u."createdAt" DESC
    `

    return NextResponse.json({ data: rows })
  } catch (error) {
    logger.error({ error, context: 'admin-signups' }, 'Failed to fetch signups')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
