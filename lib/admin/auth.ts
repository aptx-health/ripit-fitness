import { NextResponse } from 'next/server'
import { isAdminRole, isEditorRole } from '@/lib/auth/roles'
import { type AuthUser, getCurrentUser } from '@/lib/auth/server'
import { logger } from '@/lib/logger'
import { adminLimiter, checkRateLimit } from '@/lib/rate-limit'

export interface RequireOptions {
  /** Apply the admin rate limiter (30 req / 60s per user). Use on write handlers. */
  rateLimit?: boolean
}

export { isAdminRole, isEditorRole } from '@/lib/auth/roles'

export interface AdminAuthResult {
  user: AuthUser
  response?: never
}

export interface AdminAuthError {
  user?: never
  response: NextResponse
}

export type AdminAuth = AdminAuthResult | AdminAuthError

/**
 * Require admin role for an API route.
 * Returns { user } on success, or { response } with the appropriate error.
 */
export async function requireAdmin(opts: RequireOptions = {}): Promise<AdminAuth> {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    logger.debug({ error }, 'Admin auth: unauthorized')
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!isAdminRole(user.role)) {
    logger.warn({ userId: user.id, role: user.role }, 'Admin auth: forbidden (admin required)')
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  if (opts.rateLimit) {
    const limited = await checkRateLimit(adminLimiter, user.id)
    if (limited) return { response: limited }
  }

  return { user }
}

/**
 * Require editor or admin role for an API route.
 * Returns { user } on success, or { response } with the appropriate error.
 */
export async function requireEditor(opts: RequireOptions = {}): Promise<AdminAuth> {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    logger.debug({ error }, 'Editor auth: unauthorized')
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!isEditorRole(user.role)) {
    logger.warn({ userId: user.id, role: user.role }, 'Editor auth: forbidden (editor required)')
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  if (opts.rateLimit) {
    const limited = await checkRateLimit(adminLimiter, user.id)
    if (limited) return { response: limited }
  }

  return { user }
}

