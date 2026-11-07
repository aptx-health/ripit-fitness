import type { PrismaClient } from '@prisma/client'

/** Shown only when a user has neither a display name nor an account row (deleted). */
const NO_ACCOUNT = 'Ripit user'

/**
 * The names coaching shows for people (features/coaching/invite-link.feature,
 * "No display name"): UserSettings.displayName, else the part of the account
 * email before "@". BetterAuth's "user" table isn't in Prisma, so emails are
 * read with raw SQL, and only for users without a display name.
 */
export async function coachingNames(db: PrismaClient, userIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds)]
  const names = new Map<string, string>()
  if (ids.length === 0) return names

  const settings = await db.userSettings.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, displayName: true },
  })
  for (const s of settings) if (s.displayName?.trim()) names.set(s.userId, s.displayName.trim())

  const missing = ids.filter((id) => !names.has(id))
  if (missing.length) {
    const rows = await db.$queryRaw<{ id: string; email: string | null }[]>`
      SELECT id, email FROM "user" WHERE id = ANY(${missing}::text[])`
    for (const r of rows) {
      const local = r.email?.split('@')[0]?.trim()
      if (local) names.set(r.id, local)
    }
  }
  for (const id of ids) if (!names.has(id)) names.set(id, NO_ACCOUNT)
  return names
}
