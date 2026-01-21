// Auth wrapper for server-side authentication
// Supports both real Supabase Auth and dev-only mock auth

import { createClient as createSupabaseClient } from '@/lib/supabase/server'

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
 * In production: Uses Supabase Auth
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

  // Real Supabase auth
  const supabase = await createSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  return {
    user: user as AuthUser | null,
    error: error as Error | null,
  }
}
