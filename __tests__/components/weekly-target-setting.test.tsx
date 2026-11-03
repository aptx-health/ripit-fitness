/**
 * Progress S1: the weekly workout target in Settings (work item 107).
 * Spec: features/analytics/weekly-report.feature, "Weekly target setting".
 *
 * Seam as in __tests__/app/settings-save.test.tsx: the page
 * `app/(app)/settings/page.tsx`, saving through the real useUserSettings hook
 * and GET/PUT /api/settings (a small fake of it here).
 *
 * Pinned: in the "Workouts" region there is a number input named "Weekly workout
 * target" (role spinbutton, min 1, max 14, whole numbers, a 48px target). It
 * shows the stored `weeklyWorkoutTarget` (3 when the server sent none). Changing
 * it saves on its own with a PUT of exactly { weeklyWorkoutTarget: n }, debounced
 * like the other Workouts controls, and only for a whole number from 1 to 14;
 * anything else is not sent. The other controls' payloads do not carry it.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)
const api = vi.hoisted(() => ({
  stored: {} as Record<string, unknown>,
  puts: [] as Array<Record<string, unknown>>,
  failWith: null as string | null,
}))

vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () => ({ user: { id: 'u1', email: 'ada@example.com', role: 'user' }, error: null }),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/auth-client', () => ({
  useSession: () => {
    throw new Error('useSession must not be called by the Settings page')
  },
  authClient: { changePassword: vi.fn(), signOut: vi.fn() },
}))
vi.mock('@/hooks/useThemePreference', () => ({
  useThemePreference: () => ({ preference: { themeName: 'ripit', mode: 'dark' }, updateTheme: vi.fn() }),
}))
vi.mock('@/components/features/FeedbackModal', () => ({ default: () => null }))

const json = (ok: boolean, body: unknown) => ({ ok, status: ok ? 200 : 500, json: async () => body })

beforeEach(() => {
  api.stored = {
    displayName: null,
    defaultWeightUnit: 'lbs',
    defaultIntensityRating: 'rir',
    intensityEnabled: false,
    loggingMode: 'full',
    weeklyWorkoutTarget: 3,
  }
  api.puts = []
  api.failWith = null
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
      if (url === '/api/settings' && (init?.method ?? 'GET') === 'GET') return json(true, { settings: api.stored })
      if (url === '/api/settings' && init?.method === 'PUT') {
        if (api.failWith) return json(false, { error: api.failWith })
        const body = JSON.parse(init.body ?? '{}')
        api.puts.push(body)
        api.stored = { ...api.stored, ...body }
        return json(true, { settings: api.stored })
      }
      if (url.includes('connected-accounts')) return json(true, { email: 'ada@example.com', providers: [] })
      return json(true, {})
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function openSettings() {
  const mod = (await load('@/app/(app)/settings/page')) as { default: () => Promise<React.ReactElement> }
  const view = render(await mod.default())
  await screen.findByRole('tab', { name: /log sets/i })
  return view
}
const workouts = () => screen.getByRole('region', { name: 'Workouts' })
const target = () => within(workouts()).getByRole('spinbutton', { name: /weekly workout target/i }) as HTMLInputElement
const saved = () => waitFor(() => expect(api.puts.length).toBeGreaterThan(0), { timeout: 3000 })
const quiet = () => new Promise((r) => setTimeout(r, 700))

describe('Weekly target setting', () => {
  it('shows the stored target', async () => {
    api.stored = { ...api.stored, weeklyWorkoutTarget: 5 }
    await openSettings()
    expect(target().value).toBe('5')
  })

  it('shows 3 by default, also when the server sends no target', async () => {
    delete api.stored.weeklyWorkoutTarget
    await openSettings()
    expect(target().value).toBe('3')
  })

  it('accepts whole numbers from 1 to 14', async () => {
    await openSettings()
    expect(target().min).toBe('1')
    expect(target().max).toBe('14')
    expect(target().type).toBe('number')
  })

  it('is a 48px target', async () => {
    await openSettings()
    expect(target().className).toMatch(/\b(h-12|min-h-12|h-\[48px\]|min-h-\[48px\])\b/)
  })

  it('When the user sets the weekly workout target to 4 in Settings, it saves { weeklyWorkoutTarget: 4 } on its own', async () => {
    await openSettings()
    fireEvent.change(target(), { target: { value: '4' } })
    await saved()
    expect(api.puts).toEqual([{ weeklyWorkoutTarget: 4 }])
    expect(api.stored.weeklyWorkoutTarget).toBe(4)
  })

  it('a save of the target carries no other setting, and the weight unit is not sent', async () => {
    api.stored = { ...api.stored, defaultWeightUnit: 'kg', intensityEnabled: true }
    await openSettings()
    fireEvent.change(target(), { target: { value: '6' } })
    await saved()
    expect(Object.keys(api.puts[0])).toEqual(['weeklyWorkoutTarget'])
  })

  it('shows what was saved after a reload', async () => {
    const first = await openSettings()
    fireEvent.change(target(), { target: { value: '4' } })
    await saved()
    first.unmount()
    await openSettings()
    expect(target().value).toBe('4')
  })

  it('typing through several values saves the last one', async () => {
    await openSettings()
    fireEvent.change(target(), { target: { value: '5' } })
    fireEvent.change(target(), { target: { value: '6' } })
    fireEvent.change(target(), { target: { value: '7' } })
    await saved()
    await quiet()
    expect(api.puts[api.puts.length - 1]).toEqual({ weeklyWorkoutTarget: 7 })
    expect(api.stored.weeklyWorkoutTarget).toBe(7)
  })

  it.each([['0'], ['15'], ['2.5'], ['-3'], ['']])('does not send %j', async (value) => {
    await openSettings()
    fireEvent.change(target(), { target: { value } })
    await quiet()
    expect(api.puts).toEqual([])
    expect(api.stored.weeklyWorkoutTarget).toBe(3)
  })

  it('the lowest and highest values are sent', async () => {
    await openSettings()
    fireEvent.change(target(), { target: { value: '1' } })
    await saved()
    expect(api.puts[api.puts.length - 1]).toEqual({ weeklyWorkoutTarget: 1 })
    fireEvent.change(target(), { target: { value: '14' } })
    await waitFor(() => expect(api.stored.weeklyWorkoutTarget).toBe(14), { timeout: 3000 })
  })

  it('loading never saves the target', async () => {
    api.stored = { ...api.stored, weeklyWorkoutTarget: 8 }
    await openSettings()
    await quiet()
    expect(api.puts).toEqual([])
  })

  it('other Workouts controls still save without the target', async () => {
    api.stored = { ...api.stored, weeklyWorkoutTarget: 8 }
    await openSettings()
    fireEvent.click(within(workouts()).getByRole('switch', { name: /intensity/i }))
    await saved()
    expect(api.puts[api.puts.length - 1]).not.toHaveProperty('weeklyWorkoutTarget')
    expect(api.stored.weeklyWorkoutTarget).toBe(8)
  })

  it('shows the error when saving the target fails', async () => {
    await openSettings()
    api.failWith = 'Could not save'
    fireEvent.change(target(), { target: { value: '4' } })
    expect(await screen.findByText('Could not save', undefined, { timeout: 3000 })).toBeTruthy()
  })
})
