import { prisma } from '@/lib/db'
import { programDetailHref, type Query } from './program-href'

/**
 * Where old addresses send the user: a `/training?resume=` bookmark, and
 * `/programs/[id]` until TL3 replaces it.
 */

export { programDetailHref }

/**
 * For `/training?resume=<workoutId>` (old bookmarks, PWA state): the active
 * program's detail page with the whole query kept. Null when there is no
 * `resume` or no active program, so `/training` shows the home page.
 */
export async function trainingResumeRedirectTarget(userId: string, query: Query): Promise<string | null> {
  if (query.resume === undefined) return null
  const active = await prisma.program.findFirst({
    where: { userId, isActive: true, isArchived: false, deletedAt: null },
    select: { id: true },
  })
  return active ? programDetailHref(active.id, query) : null
}

/** Where /programs/[id] sends the user. The detail page does the ownership check. */
export function legacyProgramRedirectTarget(programId: string, query: Query): string {
  return programDetailHref(programId, query)
}
