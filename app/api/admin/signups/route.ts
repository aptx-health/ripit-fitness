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
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const daysParam = request.nextUrl.searchParams.get('days')
    const days = daysParam ? Math.min(Math.max(Number(daysParam), 1), 365) : 30
    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const rows = await prisma.$queryRaw<SignupRow[]>`
      SELECT
        u.email,
        u."createdAt",
        ae.source,
        us."experienceLevel",
        wc."firstWorkoutAt"
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
