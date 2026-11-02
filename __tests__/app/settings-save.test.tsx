/**
 * UI5 "Settings still save": the Workouts controls save through the existing
 * useUserSettings hook (the REAL one) and GET/PUT /api/settings, and a reload
 * shows what was saved. The fetch is a small fake of that API. Payloads are as
 * before the redesign: { defaultWeightUnit, intensityEnabled, loggingMode }
 * plus defaultIntensityRating only while intensity is on; saves are debounced
 * (about 300 ms) and a load never changes what is stored. The weight unit has
 * NO control (hidden on purpose, commit fba784df): the payload carries the
 * loaded defaultWeightUnit back unchanged (these tests store 'kg', the
 * non-default, so a hard-coded 'lbs' is caught).
 *
 * Seam: app/(app)/settings/page.tsx (see settings-page.test.tsx), controls in
 * the "Workouts" region: tablist "Workout mode" (Follow Along | Log Sets),
 * switch /intensity/i, tablist "Default rating type" (RPE | RIR).
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
    defaultWeightUnit: 'kg',
    defaultIntensityRating: 'rir',
    intensityEnabled: false,
    loggingMode: 'full',
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
const tab = (list: RegExp, name: RegExp) => within(within(workouts()).getByRole('tablist', { name: list })).getByRole('tab', { name })
const intensity = () => within(workouts()).getByRole('switch', { name: /intensity/i })
const saved = () => waitFor(() => expect(api.puts.length).toBeGreaterThan(0), { timeout: 3000 })

describe('Settings still save', () => {
  it('shows the stored values on load, and loading never changes what is stored', async () => {
    api.stored = { ...api.stored, loggingMode: 'follow_along', intensityEnabled: true, defaultIntensityRating: 'rpe' }
    const before = { ...api.stored }
    await openSettings()
    expect(tab(/workout mode/i, /follow along/i).getAttribute('aria-selected')).toBe('true')
    await new Promise((r) => setTimeout(r, 700))
    // (a save of the values just loaded would be harmless; one of defaults would not)
    expect(api.stored).toEqual(before)
  })

  it('has no weight unit control', async () => {
    await openSettings()
    expect(screen.queryByRole('tablist', { name: /weight unit/i })).toBeNull()
    expect(screen.queryByRole('tab', { name: /^(lbs|kg)$/i })).toBeNull()
  })

  it('a save carries the loaded weight unit back unchanged, payload as before', async () => {
    await openSettings()
    fireEvent.click(tab(/workout mode/i, /follow along/i))
    await saved()
    expect(api.puts).toEqual([{ defaultWeightUnit: 'kg', intensityEnabled: false, loggingMode: 'follow_along' }])
    expect(api.stored.defaultWeightUnit).toBe('kg')
  })

  it('changing the workout mode saves it and turns intensity off', async () => {
    api.stored = { ...api.stored, intensityEnabled: true, defaultIntensityRating: 'rpe' }
    await openSettings()
    fireEvent.click(tab(/workout mode/i, /follow along/i))
    await saved()
    expect(api.puts[api.puts.length - 1]).toEqual({ defaultWeightUnit: 'kg', intensityEnabled: false, loggingMode: 'follow_along' })
    expect(api.stored.intensityEnabled).toBe(false)
  })

  it('turning intensity on saves it with the current rating type', async () => {
    await openSettings()
    fireEvent.click(intensity())
    await saved()
    expect(api.puts[api.puts.length - 1]).toEqual({
      defaultWeightUnit: 'kg',
      intensityEnabled: true,
      defaultIntensityRating: 'rir',
      loggingMode: 'full',
    })
  })

  it('changing the rating type saves it', async () => {
    api.stored = { ...api.stored, intensityEnabled: true }
    await openSettings()
    fireEvent.click(tab(/rating type/i, /^rpe$/i))
    await saved()
    expect(api.puts[api.puts.length - 1]).toMatchObject({ intensityEnabled: true, defaultIntensityRating: 'rpe' })
    expect(api.stored.defaultIntensityRating).toBe('rpe')
  })

  it('changes made together in one burst are saved in one request', async () => {
    await openSettings()
    fireEvent.click(intensity())
    fireEvent.click(tab(/rating type/i, /^rpe$/i))
    await saved()
    await new Promise((r) => setTimeout(r, 500))
    expect(api.puts).toHaveLength(1)
    expect(api.puts[0]).toMatchObject({ defaultWeightUnit: 'kg', intensityEnabled: true, defaultIntensityRating: 'rpe' })
  })

  it('each change is shown again after a reload', async () => {
    const first = await openSettings()
    fireEvent.click(intensity())
    await saved()
    fireEvent.click(tab(/rating type/i, /^rpe$/i))
    await waitFor(() => expect(api.stored.defaultIntensityRating).toBe('rpe'), { timeout: 3000 })
    fireEvent.click(tab(/workout mode/i, /follow along/i))
    await waitFor(() => expect(api.stored.loggingMode).toBe('follow_along'), { timeout: 3000 })
    first.unmount()

    await openSettings()
    expect(api.stored.defaultWeightUnit).toBe('kg')
    expect(tab(/workout mode/i, /follow along/i).getAttribute('aria-selected')).toBe('true')
    expect(tab(/rating type/i, /^rpe$/i).getAttribute('aria-selected')).toBe('true')
    expect(intensity().getAttribute('aria-checked')).toBe('false')
  })

  it('intensity and the rating type are still there after a reload when left on', async () => {
    const first = await openSettings()
    fireEvent.click(intensity())
    await saved()
    first.unmount()
    await openSettings()
    expect(intensity().getAttribute('aria-checked')).toBe('true')
    expect(tab(/rating type/i, /^rir$/i).getAttribute('aria-selected')).toBe('true')
  })

  it('shows the error when saving fails', async () => {
    await openSettings()
    api.failWith = 'Could not save'
    fireEvent.click(intensity())
    expect(await screen.findByText('Could not save', undefined, { timeout: 3000 })).toBeTruthy()
  })
})
