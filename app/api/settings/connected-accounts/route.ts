import { type NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { getCurrentUser } from '@/lib/auth/server'
import { logger } from '@/lib/logger'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await pool.query(
      'SELECT "providerId" FROM "account" WHERE "userId" = $1',
      [user.id]
    )

    const providers = result.rows
      .map((row) => row.providerId)
      .filter((id) => id !== 'credential')

    return NextResponse.json({
      email: user.email,
      providers,
    })
  } catch (err) {
    logger.error({ error: err, context: 'connected-accounts' }, 'Failed to fetch connected accounts')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
