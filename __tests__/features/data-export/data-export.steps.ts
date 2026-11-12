/**
 * Step definitions for features/data-export.feature (work 156). Format:
 * docs/RIPIT_EXPORT_FORMAT.md. Builder details and the query count:
 * __tests__/lib/ripit-export.test.ts.
 *
 * Seams:
 *   GET /api/me/export   session auth; 200 JSON with Content-Disposition
 *     attachment; filename="ripit-export-YYYY-MM-DD.json"; 401 signed out; 429
 *     when checkRateLimitWithHeaders (keyed on the user id) refuses.
 *   components/settings/DownloadDataRow.tsx   a "Download my data" button in
 *     Settings → Account that fetches the route and saves the file under the
 *     name the route gives.
 *
 * `@/lib/db` hands the route the testcontainers client; auth and the rate
 * limiter are stubbed. vitest-cucumber runs every step as its own test, so
 * state lives in `s`.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, expect, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'
import { seedSystemExercises, seedTrainingData } from './seed'

const auth = vi.hoisted(() => ({ userId: '' }))
const rl = vi.hoisted(() => ({ refuseAfter: Number.POSITIVE_INFINITY, calls: [] as string[] }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  const prisma = (await db()).getPrismaClient()
  return { prisma, default: prisma }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    auth.userId ? { user: { id: auth.userId, role: 'user', email: 'me@x.test' }, error: null } : { user: null, error: null },
}))
vi.mock('@/lib/rate-limit', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/rate-limit')>()
  return {
    ...real,
    checkRateLimitWithHeaders: async (_l: unknown, key: string) => {
      rl.calls.push(key)
      const refused = rl.calls.filter((k) => k === key).length > rl.refuseAfter
      return {
        response: refused ? new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }) : null,
        headers: {},
      }
    },
  }
})
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const feature = await loadFeature('features/data-export.feature')

type Json = Record<string, unknown>

interface State {
  prisma: PrismaClient
  me: string
  other: string
  otherIds: string[]
  seeded?: Awaited<ReturnType<typeof seedTrainingData>>
  sys?: Awaited<ReturnType<typeof seedSystemExercises>>
  response?: Response
  file?: Json
  savedAs?: string
  statuses: number[]
}

let s = {} as State

async function route() {
  return (await import('@/app/api/me/export/route')) as { GET: (req: Request) => Promise<Response> }
}

async function getExport(): Promise<Response> {
  const { GET } = await route()
  return GET(new Request('http://localhost/api/me/export'))
}

async function fresh() {
  const db = await getTestDatabase()
  await db.reset()
  rl.calls = []
  rl.refuseAfter = Number.POSITIVE_INFINITY
  s = { prisma: db.getPrismaClient(), me: (await createTestUser()).id, other: (await createTestUser()).id, otherIds: [], statuses: [] }
  auth.userId = s.me
}

async function download() {
  s.response = await getExport()
  expect(s.response.status).toBe(200)
  s.file = (await s.response.json()) as Json
}

afterEach(() => cleanup())

describeFeature(feature, ({ Scenario }) => {
  Scenario('Download my data from Settings', ({ Given, When, Then, And }) => {
    Given('I am signed in on the web app', async () => {
      await fresh()
      s.sys = await seedSystemExercises(s.prisma)
      await seedTrainingData(s.prisma, s.me, s.sys)
    })

    When('I choose "Download my data" in Settings', async () => {
      // The Account block's row fetches the real route and saves the file.
      const realFetch = globalThis.fetch
      vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/me/export') {
          s.response = await getExport()
          return s.response.clone()
        }
        if (url === '/api/settings/connected-accounts') {
          return new Response(JSON.stringify({ providers: [], hasPassword: true }), { status: 200 })
        }
        return realFetch(input)
      })
      const blobs: Blob[] = []
      const urlStatics = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }
      URL.createObjectURL = (b: Blob) => {
        blobs.push(b)
        return 'blob:export'
      }
      URL.revokeObjectURL = () => {}
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        s.savedAs = this.download
      })
      try {
        const { default: AccountBlock } = await import('@/components/settings/AccountBlock')
        render(createElement(AccountBlock, { email: 'me@x.test' }))
        fireEvent.click(screen.getByRole('button', { name: /download my data/i }))
        await waitFor(() => expect(s.savedAs).toBeTruthy())
        expect(blobs).toHaveLength(1)
        // The Blob may be Node's (has text()) or jsdom's (no text(), needs
        // jsdom's FileReader); which one depends on the runner, so handle both.
        const blob = blobs[0]
        const text =
          typeof blob.text === 'function'
            ? await blob.text()
            : await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = () => reject(reader.error)
                reader.readAsText(blob)
              })
        s.file = JSON.parse(text) as Json
      } finally {
        click.mockRestore()
        URL.createObjectURL = urlStatics.create
        URL.revokeObjectURL = urlStatics.revoke
        vi.unstubAllGlobals()
      }
    })

    Then('I get a file named like "ripit-export-2026-11-07.json"', () => {
      expect(s.savedAs).toMatch(/^ripit-export-\d{4}-\d{2}-\d{2}\.json$/)
      expect(s.response?.headers.get('content-disposition')).toBe(`attachment; filename="${s.savedAs}"`)
      expect(s.response?.headers.get('content-type')).toMatch(/^application\/json/)
      expect(s.response?.headers.get('cache-control')).toBe('no-store')
    })

    And('it holds format "ripit-export", version 1, and the export time', () => {
      expect(s.file).toMatchObject({ format: 'ripit-export', version: 1, userId: s.me })
      const at = Date.parse(s.file?.exportedAt as string)
      expect(Math.abs(Date.now() - at)).toBeLessThan(60_000)
      expect(s.savedAs).toBe(`ripit-export-${(s.file?.exportedAt as string).slice(0, 10)}.json`)
    })
  })

  Scenario('The export holds only my data', ({ Given, When, Then }) => {
    Given('another user has programs and workouts', async () => {
      await fresh()
      const sys = await seedSystemExercises(s.prisma)
      await seedTrainingData(s.prisma, s.me, sys)
      const t = await seedTrainingData(s.prisma, s.other, sys, ' (theirs)')
      s.otherIds = [t.sledPush.id, t.active.program.id, t.archived.program.id, t.finished.id, t.abandoned.id, t.adHoc.id, t.saved.id]
    })

    When('I download my data', download)

    Then('none of their rows are in my file', () => {
      const text = JSON.stringify(s.file)
      expect(text).not.toContain(s.other)
      expect(text).not.toContain('(theirs)')
      for (const id of s.otherIds) expect(text).not.toContain(id)
      expect((s.file?.programs as Json[]).length).toBe(2)
    })
  })

  Scenario('The export is complete enough to rebuild my training', ({ Given, When, Then, And }) => {
    Given('I have programs with weeks, workouts, exercises, prescribed sets and supersets', async () => {
      await fresh()
      s.sys = await seedSystemExercises(s.prisma)
      s.seeded = await seedTrainingData(s.prisma, s.me, s.sys)
    })
    And('finished, abandoned and ad-hoc workouts with logged sets', () => {
      expect(s.seeded?.adHoc.isAdHoc).toBe(true)
    })
    And('saved workouts and custom exercises', () => {
      expect(s.seeded?.saved.id).toBeTruthy()
    })

    When('I download my data', download)

    Then('all of it is in the file, with plan and logged sets kept apart', async () => {
      const f = s.file as Json
      const prescribed = await s.prisma.prescribedSet.findMany({ where: { userId: s.me }, select: { id: true } })
      const logged = await s.prisma.loggedSet.findMany({ where: { userId: s.me }, select: { id: true } })
      const exercises = await s.prisma.exercise.findMany({ where: { userId: s.me }, select: { id: true } })

      type Ex = Json & { prescribedSets: Json[] }
      type Completion = Json & { exercises: Ex[]; loggedSets: Json[] }
      const programs = f.programs as Array<Json & { weeks: Array<{ workouts: Array<{ exercises: Ex[] }> }> }>
      const programExercises = programs.flatMap((p) => p.weeks.flatMap((w) => w.workouts.flatMap((wo) => wo.exercises)))
      const completions = f.workoutCompletions as Completion[]
      const oneOffs = completions.flatMap((c) => c.exercises)
      const allExercises = [...programExercises, ...oneOffs]

      expect(new Set(allExercises.map((e) => e.id))).toEqual(new Set(exercises.map((e) => e.id)))
      expect(new Set(allExercises.flatMap((e) => e.prescribedSets.map((p) => p.id)))).toEqual(new Set(prescribed.map((p) => p.id)))
      expect(new Set(completions.flatMap((c) => c.loggedSets.map((l) => l.id)))).toEqual(new Set(logged.map((l) => l.id)))
      // Kept apart: no logged sets on exercises, no prescribed sets on completions.
      for (const e of allExercises) expect(e).not.toHaveProperty('loggedSets')
      for (const c of completions) expect(c).not.toHaveProperty('prescribedSets')

      expect(programExercises.filter((e) => e.exerciseGroup === 'A').length).toBeGreaterThanOrEqual(2)
      expect(completions.map((c) => c.status).sort()).toEqual(['abandoned', 'completed', 'completed'])
      expect(completions.some((c) => c.isAdHoc)).toBe(true)
      const units = new Set(completions.flatMap((c) => c.loggedSets.map((l) => l.weightUnit)))
      expect(units).toEqual(new Set(['kg', 'lbs']))
      expect((f.savedWorkouts as Json[]).map((w) => w.id)).toEqual([s.seeded?.saved.id])
      expect((f.customExercises as Json[]).map((d) => d.id)).toEqual([s.seeded?.sledPush.id])
      expect(f.settings).toMatchObject({ userId: s.me })
      expect(f.balanceSettings).toMatchObject({ userId: s.me })
      expect((f.pinnedExercises as Json[]).length).toBe(2)
    })

    And('system exercises are referenced by id, not copied', () => {
      const f = s.file as Json
      const sys = s.sys as NonNullable<State['sys']>
      for (const ref of f.exerciseRefs as Json[]) expect(Object.keys(ref).sort()).toEqual(['id', 'name'])
      const refIds = (f.exerciseRefs as Json[]).map((r) => r.id)
      expect(refIds).toEqual(expect.arrayContaining([sys.squat.id, sys.bench.id, sys.row.id, sys.pullup.id, sys.deadlift.id]))
      const customIds = (f.customExercises as Json[]).map((d) => d.id)
      for (const d of Object.values(sys)) expect(customIds).not.toContain(d.id)
    })
  })

  Scenario('Export is rate limited and needs a session', ({ Given, When, Then, And }) => {
    Given('I am not signed in', async () => {
      await fresh()
      auth.userId = ''
    })

    When('I request my data', async () => {
      s.response = await getExport()
    })

    Then('I get 401', () => {
      expect(s.response?.status).toBe(401)
      expect(rl.calls).toEqual([])
    })

    And('repeated requests past the limit get 429', async () => {
      auth.userId = s.me
      rl.refuseAfter = 3
      for (let i = 0; i < 5; i++) s.statuses.push((await getExport()).status)
      expect(s.statuses).toEqual([200, 200, 200, 429, 429])
      expect(rl.calls.every((k) => k === s.me)).toBe(true)
    })
  })
})
