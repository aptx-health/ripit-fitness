/**
 * Progress follows the user's effort scale (work item 162), end to end: real test DB, the real
 * /api/progress/week, /api/progress/lift/[id] and /api/settings handlers behind a stubbed fetch,
 * and the real ProgressView and LiftView. Spec: features/analytics/effort-scale.feature,
 * "Effort numbers use the chosen scale", "Mixed history is converted", "Switching the setting".
 *
 * Every week has one squat session: two sets at RPE 8 and two at RIR 2, so each week, the
 * normal and the lift's session average are RPE 8, which is RIR 2. The shown week is last
 * week (opened with ?week=), so the sessions never fall after "now".
 */

import type { PrismaClient } from '@prisma/client'
import { cleanup, render, screen } from '@testing-library/react'
import { NextRequest } from 'next/server'
import { type ComponentType, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addWeeks, weekStartFor } from '@/lib/insights/progress'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const TZ = 'America/Denver'
const h = vi.hoisted(() => ({ userId: '', week: '' }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})
vi.mock('@/lib/auth/server', () => ({ getCurrentUser: async () => ({ user: { id: h.userId, role: 'user' }, error: null }) }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/progress',
  useSearchParams: () => new URLSearchParams({ week: h.week }),
}))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

let prisma: PrismaClient
let squat: string

/** One completion on the week's Wednesday: two sets at RPE 8, two at RIR 2. */
async function mixedSession(weekStart: string) {
  const at = new Date(`${weekStart}T18:00:00Z`)
  at.setUTCDate(at.getUTCDate() + 2)
  const c = await prisma.workoutCompletion.create({ data: { userId: h.userId, status: 'completed', completedAt: at, isAdHoc: true } })
  const e = await prisma.exercise.create({
    data: { name: 'Back Squat', exerciseDefinitionId: squat, order: 1, userId: h.userId, workoutCompletionId: c.id, isOneOff: true },
  })
  const efforts = [{ rpe: 8 }, { rpe: 8 }, { rir: 2 }, { rir: 2 }]
  for (const [i, x] of efforts.entries()) {
    await prisma.loggedSet.create({
      data: {
        setNumber: i + 1,
        reps: 5,
        weight: 225,
        weightUnit: 'lbs',
        isWarmup: false,
        rpe: x.rpe ?? null,
        rir: x.rir ?? null,
        exerciseId: e.id,
        completionId: c.id,
        userId: h.userId,
      },
    })
  }
}

/** Saves the scale through the real settings route, as the Settings page does. */
async function chooseScale(scale: 'rpe' | 'rir') {
  const { PUT } = await import('@/app/api/settings/route')
  const res = await PUT(
    new NextRequest('http://localhost/api/settings', { method: 'PUT', body: JSON.stringify({ defaultIntensityRating: scale }) }),
  )
  expect(res.status).toBe(200)
}

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  h.userId = (await createTestUser()).id
  squat = (await createTestExerciseDefinition(prisma, { name: 'Back Squat', primaryFAUs: ['quads'] })).id
  h.week = addWeeks(weekStartFor(new Date(), TZ), -1)
  for (let i = 0; i <= 8; i++) await mixedSession(addWeeks(h.week, -i))

  const real = Intl.DateTimeFormat.prototype.resolvedOptions
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(function (this: Intl.DateTimeFormat) {
    return { ...real.call(this), timeZone: TZ }
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = new URL(String(input), 'http://localhost')
      const request = new NextRequest(url)
      const lift = url.pathname.match(/^\/api\/progress\/lift\/([^/]+)$/)
      if (lift) {
        const { GET } = await import('@/app/api/progress/lift/[id]/route')
        return GET(request, { params: Promise.resolve({ id: lift[1] }) })
      }
      const { GET } = await import('@/app/api/progress/week/route')
      return GET(request)
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const flat = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

async function openProgress() {
  const View = ((await import('@/components/features/progress/ProgressView')) as { default: ComponentType }).default
  render(createElement(View))
  await screen.findByRole('heading', { name: /^Week of/ })
}

async function openLift() {
  const View = ((await import('@/components/features/progress/LiftView')) as { default: ComponentType<{ exerciseDefinitionId: string }> })
    .default
  render(createElement(View, { exerciseDefinitionId: squat }))
  await screen.findByRole('heading', { level: 1 })
}

const effortRow = () => document.querySelector('[data-row="effort"]')
const shownWeek = () => document.querySelector(`[data-week="${h.week}"]`)

describe.each([
  { scale: 'rpe' as const, label: 'RPE', value: '8' },
  { scale: 'rir' as const, label: 'RIR', value: '2' },
])('Effort numbers use the chosen scale: $label', ({ scale, label, value }) => {
  beforeEach(() => chooseScale(scale))

  it(`the effort tile reads "${label} ${value}.0"`, async () => {
    await openProgress()
    const tile = effortRow()?.querySelector('.text-2xl')
    expect(flat(tile)).toBe(`${label} ${value}.0`)
  })

  it(`the weekly sets chart is labelled ${label} and each week reads ${value}.0`, async () => {
    await openProgress()
    const chart = screen.getByRole('group', { name: 'Working sets per week' })
    expect(flat(chart)).toContain(label)
    expect(flat(chart)).not.toContain(label === 'RPE' ? 'RIR' : 'RPE')
    expect(shownWeek()?.getAttribute('aria-label')).toMatch(new RegExp(`sets, ${label} ${value}\\.0$`))
    const values = Array.from(document.querySelectorAll('[data-week]')).map((w) => flat(w.lastElementChild))
    expect(values).toEqual(Array(8).fill(`${value}.0`))
  })

  it(`the normal-range note reads ${value}.0 in ${label}`, async () => {
    await openProgress()
    expect(flat(effortRow())).toContain(scale === 'rir' ? `normal RIR ${value}.0` : `normal ${value}.0`)
  })

  it(`the lift page's per-session average reads "${label} ${value}"`, async () => {
    await openLift()
    const rows = Array.from(document.querySelectorAll('[data-session]'))
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(flat(row)).toContain(`· ${label} ${value}`)
  })
})

describe('Mixed history is converted', () => {
  it('sets logged as RPE 8 and RIR 2 average RPE 8 with RPE chosen', async () => {
    await chooseScale('rpe')
    await openProgress()
    expect(flat(effortRow())).toContain('RPE 8.0')
  })

  it('and RIR 2 with RIR chosen', async () => {
    await chooseScale('rir')
    await openProgress()
    expect(flat(effortRow())).toContain('RIR 2.0')
  })
})

describe('Switching the setting', () => {
  it('opening Progress again after a change in Settings shows every effort number in the new scale', async () => {
    await chooseScale('rpe')
    await openProgress()
    expect(flat(effortRow())).toContain('RPE 8.0')
    cleanup()

    await chooseScale('rir')
    await openProgress()
    expect(flat(effortRow())).toContain('RIR 2.0')
    expect(flat(effortRow())).toContain('normal RIR 2.0')
    expect(shownWeek()?.getAttribute('aria-label')).toContain('RIR 2.0')
    expect(flat(document.body)).not.toMatch(/RPE/)
  })

  it('a user without settings sees RIR, the default scale', async () => {
    await prisma.userSettings.deleteMany({ where: { userId: h.userId } })
    await openProgress()
    expect(flat(effortRow())).toContain('RIR 2.0')
  })
})
