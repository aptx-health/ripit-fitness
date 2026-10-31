/**
 * TL5b: the Settings page links to Agent access, like it links to Muscle
 * Balance: a row labelled "Agent access" to /settings/agent-access, for every
 * user (regular and admin). The page itself is app/(app)/settings/page.tsx.
 */

import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)
const session = vi.hoisted(() => ({
  role: 'user',
  // one stable object: the page re-syncs whenever `settings` changes identity
  settings: {
    displayName: null,
    defaultWeightUnit: 'lbs',
    defaultIntensityRating: 'rir',
    intensityEnabled: false,
    loggingMode: 'full',
  },
  updateSettings: () => {},
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/auth-client', () => ({
  useSession: () => ({ data: { user: { id: 'u1', role: session.role, email: 'a@b.c' } } }),
  authClient: { changePassword: vi.fn(), signOut: vi.fn() },
}))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({
    settings: session.settings,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    updateSettings: session.updateSettings,
  }),
}))
vi.mock('@/hooks/useThemePreference', () => ({
  useThemePreference: () => ({ preference: 'system', updateTheme: vi.fn() }),
}))
vi.mock('@/components/features/FeedbackModal', () => ({ default: () => null }))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function renderSettings(role: string) {
  session.role = role
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })))
  const mod = (await load('@/app/(app)/settings/page')) as { default: ComponentType }
  return render(createElement(mod.default))
}

describe('Settings: Agent access link', () => {
  it.each(['user', 'admin'])('a %s sees a row to Agent access', async (role) => {
    await renderSettings(role)
    const link = screen.getByRole('link', { name: /agent access/i })
    expect(link.getAttribute('href')).toBe('/settings/agent-access')
  })

  it('sits beside the other settings rows, as its own link', async () => {
    await renderSettings('user')
    expect(screen.getByRole('link', { name: /muscle balance/i }).getAttribute('href')).toBe('/settings/muscle-balance')
    expect(screen.getAllByRole('link', { name: /agent access/i })).toHaveLength(1)
  })
})
