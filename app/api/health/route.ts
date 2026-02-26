import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ error }, 'Health check failed: database unreachable')

    return NextResponse.json(
      {
        status: 'error',
        db: 'disconnected',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
