// Auth wrapper for server-side authentication
// Supports both real BetterAuth and dev-only mock auth

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'

export interface AuthUser {
  id: string
  email?: string
}

export interface AuthResult {
  user: AuthUser | null
  error: Error | null
}

/**
 * Get the currently authenticated user
 *
 * In production: Uses BetterAuth session API
 * In development with USE_MOCK_AUTH=true: Returns a mock user for local testing
 */
export async function getCurrentUser(): Promise<AuthResult> {
  // Check if mock auth is enabled (dev only)
  if (process.env.USE_MOCK_AUTH === 'true') {
    const mockUserId = process.env.MOCK_USER_ID || 'dev-user-local'
    return {
      user: {
        id: mockUserId,
        email: 'dev@local.dev',
      },
      error: null,
    }
  }

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return { user: null, error: null }
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      error: null,
    }
  } catch (error) {
    logger.debug({ error }, 'Auth error getting session')
    return {
      user: null,
      error: error as Error,
    }
  }
}
