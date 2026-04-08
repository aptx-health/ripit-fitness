import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isPgBouncerConfigured } from '@/lib/db/assert-pgbouncer'
import { logger } from '@/lib/logger'

/**
 * Readiness probe — k8s readiness probe target.
 *
 * Verifies the pod can serve traffic: DB reachable + Prisma configured
 * correctly for our PgBouncer transaction-mode pooler. A failing readiness
 * probe causes k8s to route traffic away from the pod (but does NOT restart
 * it — that's liveness).
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const pgbouncerConfigured = isPgBouncerConfigured(process.env)

  try {
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      pgbouncerConfigured,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ error }, 'Readiness check failed: database unreachable')

    return NextResponse.json(
      {
        status: 'error',
        db: 'disconnected',
        pgbouncerConfigured,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
