import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { Pool } from 'pg'
import { logger } from '@/lib/logger'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getCurrentUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, password } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if another user already has this email
    const existing = await pool.query(
      'SELECT id FROM "user" WHERE email = $1 AND id != $2',
      [normalizedEmail, user.id]
    )

    if (existing.rows.length > 0) {
      // Existing account — need password to link
      if (!password) {
        return NextResponse.json(
          { error: 'This email is associated with an existing account', code: 'EMAIL_EXISTS' },
          { status: 409 }
        )
      }

      // Verify the password against the existing account
      const existingUserId = existing.rows[0].id
      const accountRow = await pool.query(
        'SELECT "password" FROM "account" WHERE "userId" = $1 AND "providerId" = $2',
        [existingUserId, 'credential']
      )

      if (!accountRow.rows.length || !accountRow.rows[0].password) {
        return NextResponse.json(
          { error: 'This account does not have a password. Try signing in with Google instead.' },
          { status: 400 }
        )
      }

      // Verify password using BetterAuth's configured password verify
      const bcrypt = await import('bcrypt')
      const isValid = await bcrypt.default.compare(password, accountRow.rows[0].password)

      if (!isValid) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
      }

      // Link: move the OAuth account from the temp user to the existing user
      await pool.query(
        'UPDATE "account" SET "userId" = $1 WHERE "userId" = $2 AND "providerId" != $3',
        [existingUserId, user.id, 'credential']
      )

      // Delete the temp user (created by OAuth without email)
      await pool.query('DELETE FROM "session" WHERE "userId" = $1', [user.id])
      await pool.query('DELETE FROM "user" WHERE id = $1', [user.id])

      // Create a new session for the existing user via BetterAuth
      // The user will need to re-authenticate — redirect to login
      logger.info({ existingUserId, provider: 'discord' }, 'Linked Discord account to existing user via complete-profile')

      return NextResponse.json({ success: true, linked: true, redirect: '/login' })
    }

    // No conflict — just update the current user's email
    await pool.query(
      'UPDATE "user" SET email = $1, "emailVerified" = false WHERE id = $2',
      [normalizedEmail, user.id]
    )

    logger.info({ userId: user.id }, 'Updated email via complete-profile interstitial')

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error, context: 'complete-profile' }, 'Failed to complete profile')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
