import { NextResponse } from 'next/server'
import { type AuthUser, getCurrentUser, type UserRole } from '@/lib/auth/server'
import { logger } from '@/lib/logger'

const ADMIN_ROLES: UserRole[] = ['admin']
const EDITOR_ROLES: UserRole[] = ['admin', 'editor']

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
export async function requireAdmin(): Promise<AdminAuth> {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    logger.debug({ error }, 'Admin auth: unauthorized')
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!ADMIN_ROLES.includes(user.role)) {
    logger.warn({ userId: user.id, role: user.role }, 'Admin auth: forbidden (admin required)')
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user }
}

/**
 * Require editor or admin role for an API route.
 * Returns { user } on success, or { response } with the appropriate error.
 */
export async function requireEditor(): Promise<AdminAuth> {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    logger.debug({ error }, 'Editor auth: unauthorized')
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!EDITOR_ROLES.includes(user.role)) {
    logger.warn({ userId: user.id, role: user.role }, 'Editor auth: forbidden (editor required)')
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user }
}

/**
 * Check if a role has admin-level access (for use in server components).
 */
export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role)
}

/**
 * Check if a role has editor-level access (for use in server components).
 */
export function isEditorRole(role: UserRole): boolean {
  return EDITOR_ROLES.includes(role)
}
