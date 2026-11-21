/**
 * Select mode after review 231:
 *   1. toasts are lifted above the select bar while it shows (--toast-lift);
 *   3. the bar's actions are off while any bulk request is in flight;
 *   4. a failed Archive keeps the selection; an Archive that changed nothing
 *      says so, with no Undo.
 * fetch is stubbed: GET /api/workouts/saved lists ITEMS, and each bulk POST
 * waits for the test to answer it.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('next/navigation', () => {
  const router = { push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, prefetch: () => {} }
  return { useRouter: () => router, usePathname: () => '/library', useSearchParams: () => new URLSearchParams('type=workouts') }
})

import SavedWorkoutsList from '@/components/features/saved-workouts/SavedWorkoutsList'
import { ToastProvider } from '@/components/ToastProvider'

const recent = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()
const ITEMS = ['Leg Day', 'Bench Blast', 'Squat Focus'].map((name, i) => ({
  id: `w${i}`,
  name,
  notes: null,
  exerciseCount: 2,
  lastUsedAt: recent(i + 1),
  createdAt: recent(30),
  pinnedAt: null,
  origin: 'session',
  archivedAt: null,
  dismissedAt: null,
  tags: [],
}))

type Pending = { body: Record<string, unknown>; answer: (status: number, json: unknown) => void }
let bulk: Pending[] = []
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  bulk = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
      if (url === '/api/workouts/saved/bulk')
        return new Promise<Response>((resolve) =>
          bulk.push({ body: JSON.parse(init?.body ?? '{}'), answer: (s, b) => resolve(json(s, b)) })
        )
      if (url.startsWith('/api/workouts/saved') && (init?.method ?? 'GET') === 'GET') return json(200, { saved: ITEMS })
      return json(200, {})
    })
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function tap(el: HTMLElement) {
  await act(async () => {
    fireEvent.click(el)
  })
}
const box = (name: string) => screen.getByRole('checkbox', { name: `Select ${name}` }) as HTMLInputElement
const toolbar = () => screen.getByRole('toolbar', { name: /selected workouts/i })
const barButton = (name: string) => within(toolbar()).getByRole('button', { name: new RegExp(`^${name}$`, 'i') })
const barButtons = () => ['Archive', 'Tag', 'Delete'].map(barButton) as HTMLButtonElement[]

async function selectTwo() {
  render(createElement(ToastProvider, null, createElement(SavedWorkoutsList)))
  await screen.findByText('Leg Day')
  await tap(screen.getByRole('button', { name: /^select$/i }))
  await tap(box('Leg Day'))
  await tap(box('Bench Blast'))
  expect(toolbar().textContent).toMatch(/\b2 selected/i)
}
const answer = async (status: number, body: unknown) => {
  await waitFor(() => expect(bulk).toHaveLength(1))
  await act(async () => {
    bulk[0].answer(status, body)
  })
}

describe('select bar while a bulk request is in flight', () => {
  it('turns Archive, Tag and Delete off during a Tag request, and on again after', async () => {
    await selectTwo()
    await tap(barButton('Tag'))
    await tap(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Core' }))
    await waitFor(() => expect(bulk).toHaveLength(1))
    for (const b of barButtons()) expect(b.disabled, b.textContent ?? '').toBe(true)
    // A second tap starts nothing.
    await tap(barButton('Archive'))
    expect(bulk).toHaveLength(1)
    await answer(200, { ids: ['w0', 'w1'], skipped: [] })
    await waitFor(() => expect(barButtons().every((b) => !b.disabled)).toBe(true))
  })

  it('turns them off during an Archive request', async () => {
    await selectTwo()
    await tap(barButton('Archive'))
    await waitFor(() => expect(bulk).toHaveLength(1))
    for (const b of barButtons()) expect(b.disabled).toBe(true)
    await answer(200, { ids: ['w0', 'w1'], previous: {} })
  })
})

describe('Archive outcomes', () => {
  it('keeps the selection and select mode when Archive fails', async () => {
    await selectTwo()
    await tap(barButton('Archive'))
    await answer(500, { error: 'Internal server error' })
    expect(await screen.findByText('Could not archive workouts')).toBeTruthy()
    expect(box('Leg Day').checked).toBe(true)
    expect(box('Bench Blast').checked).toBe(true)
    expect(toolbar().textContent).toMatch(/\b2 selected/i)
    expect(barButtons().every((b) => !b.disabled)).toBe(true)
  })

  it('says nothing was archived, with no Undo, when no workout changed', async () => {
    await selectTwo()
    await tap(barButton('Archive'))
    await answer(200, { ids: [], previous: {} })
    expect(await screen.findByText('Nothing was archived')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^undo\b/i })).toBeNull()
    expect(screen.queryByText(/archived 0/i)).toBeNull()
  })

  it('offers Undo and leaves select mode when it archived some', async () => {
    await selectTwo()
    await tap(barButton('Archive'))
    await answer(200, { ids: ['w0', 'w1'], previous: { w0: { pinnedAt: null, dismissedAt: null }, w1: { pinnedAt: null, dismissedAt: null } } })
    expect(await screen.findByRole('button', { name: /^undo\b/i })).toBeTruthy()
    expect(screen.queryByRole('toolbar', { name: /selected workouts/i })).toBeNull()
  })
})

describe('toasts and the select bar', () => {
  it('lifts toasts above the bar while it shows, and back down after Done', async () => {
    await selectTwo()
    expect(document.documentElement.style.getPropertyValue('--toast-lift')).toMatch(/^\d+px$/)
    await tap(barButton('Archive'))
    await answer(500, { error: 'x' })
    const toast = (await screen.findByText('Could not archive workouts')).closest('li') as HTMLElement
    expect(toast.className).toContain('var(--toast-lift')
    await tap(screen.getByRole('button', { name: /^done$/i }))
    expect(document.documentElement.style.getPropertyValue('--toast-lift')).toBe('')
  })
})
