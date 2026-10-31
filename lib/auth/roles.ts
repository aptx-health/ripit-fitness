import type { UserRole } from '@/lib/auth/server'

/**
 * Which roles count as admin or editor. Pure, so code without a session (the
 * MCP route and tools) uses the same rule as lib/admin/auth.
 */

export const ADMIN_ROLES: readonly string[] = ['admin'] satisfies UserRole[]
export const EDITOR_ROLES: readonly string[] = ['admin', 'editor'] satisfies UserRole[]

/** Admin-level access: the admin pages, including /admin/proposals. */
export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role)
}

/** Editor-level access. */
export function isEditorRole(role: string): boolean {
  return EDITOR_ROLES.includes(role)
}
