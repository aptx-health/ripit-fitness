import type { PrismaClient } from '@prisma/client'
import { coachingNames } from './names'

/**
 * Coach links (features/coaching/invite-link.feature): what Settings → Coaching
 * lists, and ending a link from either side. Every query is scoped to links or
 * invites the user is part of. Never returns a token or its hash.
 */

export interface OpenInvite {
  id: string
  createdAt: Date
  expiresAt: Date
}

export interface LinkedPerson {
  linkId: string
  userId: string
  name: string
  linkedAt: Date
}

export interface CoachingView {
  invites: OpenInvite[]
  trainees: LinkedPerson[]
  coaches: LinkedPerson[]
}

export async function listCoaching(db: PrismaClient, userId: string): Promise<CoachingView> {
  const [invites, active] = await Promise.all([
    db.coachInvite.findMany({
      where: { coachUserId: userId, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, expiresAt: true },
    }),
    db.coachLink.findMany({
      where: { endedAt: null, OR: [{ coachUserId: userId }, { traineeUserId: userId }] },
      orderBy: { createdAt: 'asc' },
      select: { id: true, coachUserId: true, traineeUserId: true, createdAt: true },
    }),
  ])

  const otherIds = [...new Set(active.map((l) => (l.coachUserId === userId ? l.traineeUserId : l.coachUserId)))]
  const nameOf = await coachingNames(db, otherIds)
  const person = (linkId: string, other: string, linkedAt: Date): LinkedPerson => ({
    linkId,
    userId: other,
    name: nameOf.get(other) ?? '',
    linkedAt,
  })

  return {
    invites,
    trainees: active.filter((l) => l.coachUserId === userId).map((l) => person(l.id, l.traineeUserId, l.createdAt)),
    coaches: active.filter((l) => l.traineeUserId === userId).map((l) => person(l.id, l.coachUserId, l.createdAt)),
  }
}

/**
 * Ends a link the user is part of (coach or trainee). Ending again keeps the
 * first endedAt and endedBy. Returns false for another user's or an unknown
 * link. Proposals already sent on the link are left alone.
 */
export async function endLink(db: PrismaClient, userId: string, linkId: string): Promise<boolean> {
  const row = await db.coachLink.findFirst({
    where: { id: linkId, OR: [{ coachUserId: userId }, { traineeUserId: userId }] },
    select: { id: true },
  })
  if (!row) return false
  await db.coachLink.updateMany({ where: { id: linkId, endedAt: null }, data: { endedAt: new Date(), endedBy: userId } })
  return true
}
