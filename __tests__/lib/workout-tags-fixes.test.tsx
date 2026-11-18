/**
 * Workout tags, fixes after review 228 (work 227 fix round):
 *   1. a coach's send route and Send screen say which tags were dropped;
 *   2. the 50-tag limit: a change that doesn't raise the count is allowed, and
 *      approving an agent's workout drops brand-new tags past 50, reporting them;
 *   3. the MCP tag filter tidies spaces;
 *   4. the Tags sheet keeps a refused tag in the box;
 *   5. the search box has its own themed clear button;
 *   6. "No workouts match" shows even when only archived workouts match.
 */

import type { PrismaClient } from '@prisma/client'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextRequest } from 'next/server'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const auth = vi.hoisted(() => ({ userId: '' }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  const prisma = (await db()).getPrismaClient()
  return { prisma, default: prisma }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () => (auth.userId ? { user: { id: auth.userId, role: 'user' }, error: null } : { user: null, error: null }),
}))
vi.mock('@/lib/rate-limit', async (orig) => ({ ...(await orig<object>()), checkRateLimit: async () => null }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/events', () => ({ recordEvent: () => {} }))
vi.mock('next/navigation', () => {
  const router = { push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, prefetch: () => {} }
  return { useRouter: () => router, usePathname: () => '/library', useSearchParams: () => new URLSearchParams('type=workouts') }
})

import SendToTrainee from '@/components/coaching/SendToTrainee'
import SavedWorkoutsList from '@/components/features/saved-workouts/SavedWorkoutsList'
import { ToastProvider } from '@/components/ToastProvider'
import { createAgentToken } from '@/lib/agent-tokens'
import { callTool } from '@/lib/mcp/tools'
import { approveProposal } from '@/lib/proposals/service'

let prisma: PrismaClient
let user: string

const seed = async (name: string, tags: string[], extra: Record<string, unknown> = {}, userId = user) =>
  (
    await prisma.savedWorkout.create({
      data: { userId, name, workoutData: [], exerciseCount: 1, tags, ...extra },
    })
  ).id

/** Workouts carrying `total` different "Custom n" tags, 8 to a workout. */
async function customTags(total: number) {
  const tags = Array.from({ length: total }, (_, i) => `Custom ${i + 1}`)
  for (let i = 0; i < tags.length; i += 8) await seed(`Many ${i}`, tags.slice(i, i + 8))
}

const patchTags = async (id: string, tags: string[]) => {
  const { PATCH } = await import('@/app/api/workouts/saved/[id]/route')
  const res = await PATCH(
    new NextRequest(`http://localhost/api/workouts/saved/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tags }),
    }),
    { params: Promise.resolve({ id }) }
  )
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}
const tagsOf = async (id: string) => (await prisma.savedWorkout.findUniqueOrThrow({ where: { id } })).tags

async function exerciseData() {
  const def = await createTestExerciseDefinition(prisma, { name: 'Bench Press', isSystem: true })
  return {
    def: def.id,
    data: [
      {
        name: def.name,
        exerciseDefinitionId: def.id,
        order: 1,
        notes: null,
        exerciseGroup: null,
        sets: [{ setNumber: 1, reps: '8', rir: null, rpe: null, isWarmup: false }],
      },
    ],
  }
}

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  user = (await createTestUser()).id
  auth.userId = user
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('1. coach send: dropped tags reach the coach', () => {
  let coach: string
  let linkId: string
  beforeEach(async () => {
    coach = (await createTestUser()).id
    linkId = (await prisma.coachLink.create({ data: { coachUserId: coach, traineeUserId: user } })).id
    auth.userId = coach
  })

  it('POST /api/coaching/send answers 201 with droppedTags', async () => {
    const { data } = await exerciseData()
    await seed('Trainee Hill', ['Hill sprints'])
    const sourceId = await seed('Coach Pull', ['Pull', 'hill sprints', 'Coach Only'], { workoutData: data }, coach)
    const { POST } = await import('@/app/api/coaching/send/route')
    const res = await POST(
      new NextRequest('http://localhost/api/coaching/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ linkId, kind: 'saved_workout', sourceId }),
      })
    )
    expect(res.status).toBe(201)
    const body = (await res.json()) as { proposalId: string; droppedTags: string[] }
    expect(body.droppedTags).toEqual(['Coach Only'])
    const proposal = await prisma.proposal.findUniqueOrThrow({ where: { id: body.proposalId } })
    expect((proposal.payload as { tags?: string[] }).tags).toEqual(['Pull', 'Hill sprints'])
  })

  it('the Send screen names the dropped tags', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ proposalId: 'p1', droppedTags: ['Coach Only'] }), { status: 201 }))
    )
    render(
      createElement(
        ToastProvider,
        null,
        createElement(SendToTrainee, { kind: 'saved_workout', sourceId: 's1', trainees: [{ linkId, name: 'Sam' }] })
      )
    )
    fireEvent.click(screen.getByRole('button', { name: 'Send to Sam' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /^send$/i }))
    })
    expect(await screen.findByText(/Not added: Coach Only — your trainee doesn't use it/)).toBeTruthy()
  })
})

describe('2. the 50-tag limit', () => {
  it('over 50 already: removing or swapping to a tag in use is allowed, a brand-new one is not', async () => {
    await customTags(48)
    const a = await seed('A', ['Extra A', 'Shared'])
    const b = await seed('B', ['Extra B', 'Shared'])
    // 51 different tags: 48 + Extra A + Extra B + Shared.
    expect((await patchTags(a, ['Shared'])).status).toBe(200) // removes Extra A: down to 50
    expect(await tagsOf(a)).toEqual(['Shared'])
    await prisma.savedWorkout.update({ where: { id: a }, data: { tags: ['Extra A', 'Shared'] } }) // 51 again
    expect((await patchTags(b, ['Shared'])).status).toBe(200) // removes a tag another workout doesn't hold
    await prisma.savedWorkout.update({ where: { id: b }, data: { tags: ['Extra B', 'Shared'] } })
    // Swap Extra B for Custom 1, already in use: the count goes down, allowed.
    expect((await patchTags(b, ['Custom 1', 'Shared'])).status).toBe(200)
    await prisma.savedWorkout.update({ where: { id: b }, data: { tags: ['Extra B', 'Shared'] } })
    // Swap Extra B for a brand-new tag: the count stays at 51, allowed.
    expect((await patchTags(b, ['Brand New', 'Shared'])).status).toBe(200)
    // Adding one more brand-new tag raises it: refused, nothing written.
    const res = await patchTags(b, ['Brand New', 'Shared', 'Another'])
    expect(res.status).toBe(400)
    expect(res.body.limit).toBe('perUser')
    expect(await tagsOf(b)).toEqual(['Brand New', 'Shared'])
  })

  it("approving an agent's workout drops brand-new tags past 50 and reports them", async () => {
    await customTags(49)
    const { def } = await exerciseData()
    const token = (await createAgentToken(prisma, user, 'Hermes')).record.id
    const res = await callTool(prisma, { userId: user, tokenId: token, role: 'user', notify: async () => {} }, 'propose_workout_create', {
      name: 'Agent Push',
      exercises: [{ exerciseDefinitionId: def, sets: [{ reps: '8' }] }],
      rationale: 'Try this',
      tags: ['custom 3', 'Push', 'Pull'],
    })
    expect(res.isError, res.content[0]?.text).toBeFalsy()
    const proposed = JSON.parse(res.content[0].text) as { proposalId: string; droppedTags: string[] }
    expect(proposed.droppedTags).toEqual([])

    // At 49: Push takes the 50th place, Pull would be the 51st.
    const approved = await approveProposal(prisma, proposed.proposalId, user)
    expect(approved.ok, JSON.stringify(approved)).toBe(true)
    if (!approved.ok) return
    expect(approved.droppedTags).toEqual(['Pull'])
    expect(await tagsOf(String(approved.proposal.targetId))).toEqual(['Custom 3', 'Push'])
  })
})

describe('3. MCP list_saved_workouts tag filter', () => {
  it('tidies spaces and ignores case', async () => {
    await seed('Full', ['Full body'])
    await seed('Other', ['Legs'])
    const token = (await createAgentToken(prisma, user, 'Hermes')).record.id
    const res = await callTool(prisma, { userId: user, tokenId: token, role: 'user', notify: async () => {} }, 'list_saved_workouts', {
      tag: '  FULL   body ',
    })
    const { savedWorkouts } = JSON.parse(res.content[0].text) as { savedWorkouts: Array<{ name: string }> }
    expect(savedWorkouts.map((w) => w.name)).toEqual(['Full'])
  })
})

describe('4–6. the list and the Tags sheet', () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
  const item = (name: string, o: Record<string, unknown> = {}) => ({
    id: name,
    name,
    notes: null,
    exerciseCount: 3,
    lastUsedAt: daysAgo(2),
    createdAt: daysAgo(10),
    pinnedAt: null,
    origin: 'session',
    archivedAt: null,
    dismissedAt: null,
    tags: [],
    ...o,
  })
  async function renderList(items: unknown[]) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ saved: items }), { status: 200 }))
    )
    render(createElement(ToastProvider, null, createElement(SavedWorkoutsList)))
    await screen.findAllByRole('listitem')
  }
  const search = (text: string) =>
    act(async () => {
      fireEvent.change(screen.getByRole('searchbox', { name: /search workouts/i }), { target: { value: text } })
    })

  it('4. a tag refused by a limit stays in the box', async () => {
    await renderList([item('Leg Day', { tags: ['Legs'] })])
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    fireEvent.click(screen.getByRole('button', { name: 'Tags for Leg Day' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tags for Leg Day' })
    const box = within(dialog).getByRole('textbox', { name: /new tag/i }) as HTMLInputElement
    fireEvent.change(box, { target: { value: 'Abcdefghijklmnopqrstuvwxy' } })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /^add$/i }))
    })
    expect(within(dialog).getByRole('alert').textContent).toMatch(/24 characters/)
    expect(box.value).toBe('Abcdefghijklmnopqrstuvwxy')
    // An accepted one clears it.
    fireEvent.change(box, { target: { value: 'Tempo' } })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /^add$/i }))
    })
    expect(box.value).toBe('')
  })

  it("5. the search box hides the browser's clear button and has a themed one", async () => {
    await renderList([item('Leg Day'), item('Bench Day')])
    const box = screen.getByRole('searchbox', { name: /search workouts/i })
    expect(box.className).toMatch(/::-webkit-search-cancel-button\]:appearance-none/)
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull()
    await search('bench')
    const clear = screen.getByRole('button', { name: 'Clear search' })
    expect(clear.className).toMatch(/\bh-12\b/)
    expect(clear.className).not.toMatch(/\b(text|bg)-(blue|gray|white|black)/)
    await act(async () => {
      fireEvent.click(clear)
    })
    expect((box as HTMLInputElement).value).toBe('')
  })

  it('6. a search matching only archived workouts says "No workouts match" above Show archived', async () => {
    await renderList([item('Leg Day'), item('Bench Shelved', { archivedAt: daysAgo(1) })])
    await search('shelved')
    await waitFor(() => expect(screen.getByText('No workouts match')).toBeTruthy())
    const message = screen.getByText('No workouts match')
    const fold = screen.getByRole('button', { name: /^show archived \(1\)/i })
    expect(message.compareDocumentPosition(fold) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
