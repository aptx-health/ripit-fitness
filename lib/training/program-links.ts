import { prisma } from '@/lib/db'
import { programDetailHref, type Query } from './program-href'

/**
 * Where the old /training and /programs/[id] addresses send the user until TL2
 * and TL3 replace them.
 */

export { programDetailHref }

/** The active program's detail page with the query kept, or null when there is no active program. */
export async function trainingRedirectTarget(userId: string, query: Query): Promise<string | null> {
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
