import { createHash, randomBytes } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import { coachingNames } from './names'

/**
 * Coach invites (features/coaching/invite-link.feature). A coach makes a
 * single-use link /coach/invite/<token> that expires in 7 days. The plain
 * token is returned once by createInvite; only its SHA-256 hash is stored,
 * like agent tokens (lib/agent-tokens.ts).
 */

export const INVITE_TTL_DAYS = 7
const INVITE_TTL_MS = INVITE_TTL_DAYS * 24 * 60 * 60 * 1000

/** valid: can be accepted. invalid: unknown, expired, revoked or used. */
export type InviteStatus = 'valid' | 'invalid' | 'self' | 'already_linked'

type Db = PrismaClient | Prisma.TransactionClient

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function invitePath(token: string): string {
  return `/coach/invite/${token}`
}

export async function createInvite(
  db: PrismaClient,
  coachUserId: string
): Promise<{ id: string; token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url')
  const row = await db.coachInvite.create({
    data: { coachUserId, tokenHash: hashInviteToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
    select: { id: true, expiresAt: true },
  })
  return { id: row.id, token, expiresAt: row.expiresAt }
}

/** Revokes one of the coach's unused invites. Returns false for another user's or an unknown id. */
export async function revokeInvite(db: PrismaClient, coachUserId: string, id: string): Promise<boolean> {
  const row = await db.coachInvite.findFirst({ where: { id, coachUserId }, select: { revokedAt: true, usedAt: true } })
  if (!row) return false
  if (!row.revokedAt && !row.usedAt) {
    await db.coachInvite.update({ where: { id }, data: { revokedAt: new Date() } })
  }
  return true
}

async function inviteStatus(db: Db, token: string, viewerId: string | null) {
  const invite = token
    ? await db.coachInvite.findUnique({ where: { tokenHash: hashInviteToken(token) } })
    : null
  if (!invite || invite.usedAt || invite.revokedAt || invite.expiresAt.getTime() <= Date.now()) {
    return { status: 'invalid' as const, invite: null }
  }
  if (viewerId === invite.coachUserId) return { status: 'self' as const, invite }
  if (viewerId) {
    const linked = await db.coachLink.findFirst({
      where: { coachUserId: invite.coachUserId, traineeUserId: viewerId, endedAt: null },
      select: { id: true },
    })
    if (linked) return { status: 'already_linked' as const, invite }
  }
  return { status: 'valid' as const, invite }
}

/** What the invite page shows. coachName is only read for a live invite. */
export async function getInvite(
  db: PrismaClient,
  token: string,
  viewerId: string | null
): Promise<{ status: InviteStatus; coachName: string | null }> {
  const { status, invite } = await inviteStatus(db, token, viewerId)
  if (!invite) return { status, coachName: null }
  const names = await coachingNames(db, [invite.coachUserId])
  return { status, coachName: names.get(invite.coachUserId) ?? null }
}

/**
 * Links the trainee to the invite's coach and marks the invite used, only when
 * getInvite would say 'valid'. Runs under advisory locks on the invite and the
 * coach–trainee pair, so two accepts at once make one link.
 */
export async function acceptInvite(
  db: PrismaClient,
  token: string,
  traineeUserId: string
): Promise<{ ok: true; linkId: string } | { ok: false; code: Exclude<InviteStatus, 'valid'> }> {
  if (!token) return { ok: false, code: 'invalid' }
  const tokenHash = hashInviteToken(token)
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`coach-invite:${tokenHash}`}))`
    const first = await inviteStatus(tx, token, traineeUserId)
    if (!first.invite) return { ok: false, code: 'invalid' }
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`coach-link:${first.invite.coachUserId}:${traineeUserId}`}))`
    // Re-read under the pair lock: another invite from this coach may have just linked them.
    const { status, invite } = await inviteStatus(tx, token, traineeUserId)
    if (status !== 'valid') return { ok: false, code: status }
    if (!invite) return { ok: false, code: 'invalid' }

    const now = new Date()
    await tx.coachInvite.update({ where: { id: invite.id }, data: { usedAt: now } })
    const link = await tx.coachLink.create({
      data: { coachUserId: invite.coachUserId, traineeUserId, createdAt: now },
      select: { id: true },
    })
    return { ok: true, linkId: link.id }
  })
}
