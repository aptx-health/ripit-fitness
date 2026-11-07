/**
 * Coaching slice 1 after review 139 (features/coaching/invite-link.feature):
 * "No display name" (show the email's part before "@") and "Waiver first"
 * (a signed-in user without the current waiver agrees before the invite).
 */

import type { PrismaClient } from '@prisma/client'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CURRENT_WAIVER_VERSION } from '@/lib/constants/waiver'
import { getTestDatabase } from '@/lib/test/database'

const auth = vi.hoisted(() => ({ userId: '' }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  const prisma = (await db()).getPrismaClient()
  return { prisma, default: prisma }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    auth.userId ? { user: { id: auth.userId, role: 'user' }, error: null } : { user: null, error: null },
}))
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`)
  },
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}))

import CoachInvitePage from '@/app/coach/invite/[token]/page'
import { createInvite, invitePath } from '@/lib/coaching/invites'
import { listCoaching } from '@/lib/coaching/links'

let prisma: PrismaClient
const coach = 'coach-no-name'
const trainee = 'trainee-no-name'

async function openInvite(token: string) {
  cleanup()
  render(await CoachInvitePage({ params: Promise.resolve({ token }) }))
}

async function agreeToWaiver(userId: string) {
  await prisma.waiverAcceptance.create({ data: { userId, waiverVersion: CURRENT_WAIVER_VERSION } })
}

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "user" (id text PRIMARY KEY, role text, email text)')
  await prisma.$executeRawUnsafe('DELETE FROM "user"')
  await prisma.$executeRaw`INSERT INTO "user" (id, role, email) VALUES (${coach}, 'user', 'dmays@x.test'), (${trainee}, 'user', 'sam.lifts@x.test')`
  auth.userId = ''
})
afterEach(() => cleanup())

describe('No display name', () => {
  it('names the coach by the email before "@" on the invite page', async () => {
    const { token } = await createInvite(prisma, coach)
    await openInvite(token)
    expect(screen.getByRole('heading', { name: 'dmays wants to coach you' })).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Someone|Anonymous User/)
  })

  it('names both sides on Coaching by the email before "@"', async () => {
    await prisma.coachLink.create({ data: { coachUserId: coach, traineeUserId: trainee } })
    const coachView = await listCoaching(prisma, coach)
    const traineeView = await listCoaching(prisma, trainee)
    expect(coachView.trainees.map((t) => t.name)).toEqual(['sam.lifts'])
    expect(traineeView.coaches.map((c) => c.name)).toEqual(['dmays'])
  })

  it('still prefers the display name when there is one', async () => {
    await prisma.userSettings.create({ data: { userId: coach, displayName: 'Dustin' } })
    await prisma.coachLink.create({ data: { coachUserId: coach, traineeUserId: trainee } })
    expect((await listCoaching(prisma, trainee)).coaches[0].name).toBe('Dustin')
    const { token } = await createInvite(prisma, coach)
    await openInvite(token)
    expect(screen.getByRole('heading', { name: 'Dustin wants to coach you' })).toBeTruthy()
  })

  it('treats a blank display name as none', async () => {
    await prisma.userSettings.create({ data: { userId: trainee, displayName: '  ' } })
    await prisma.coachLink.create({ data: { coachUserId: coach, traineeUserId: trainee } })
    expect((await listCoaching(prisma, coach)).trainees[0].name).toBe('sam.lifts')
  })
})

describe('Waiver first', () => {
  it('sends a signed-in user without the current waiver to the waiver, then back to the invite', async () => {
    const { token } = await createInvite(prisma, coach)
    auth.userId = trainee
    await expect(openInvite(token)).rejects.toThrow(
      `NEXT_REDIRECT /waiver?next=${encodeURIComponent(invitePath(token))}`
    )
  })

  it('an old waiver version does not count', async () => {
    const { token } = await createInvite(prisma, coach)
    await prisma.waiverAcceptance.create({ data: { userId: trainee, waiverVersion: '0.9' } })
    auth.userId = trainee
    await expect(openInvite(token)).rejects.toThrow(/NEXT_REDIRECT \/waiver\?next=/)
  })

  it('shows the invite once the current waiver is accepted', async () => {
    const { token } = await createInvite(prisma, coach)
    await agreeToWaiver(trainee)
    auth.userId = trainee
    await openInvite(token)
    expect(screen.getByRole('button', { name: /accept/i })).toBeTruthy()
  })

  it('signed out, the invite still shows (sign-up and onboarding reach the waiver)', async () => {
    const { token } = await createInvite(prisma, coach)
    await openInvite(token)
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeTruthy()
  })
})
