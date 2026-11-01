/**
 * UI5 fixes from review 078: the sign-in methods line says when it couldn't
 * load, the whole Intensity row is the switch, Change password is hidden for
 * accounts without a password (the API now says hasPassword), and the password
 * fields are cleared after a successful change.
 * Spec: initiatives/ui-audit/spec.md ("UI5").
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AccountBlock from '@/components/settings/AccountBlock'
import WorkoutsBlock from '@/components/settings/WorkoutsBlock'

const h = vi.hoisted(() => ({
  changePassword: vi.fn(),
  updateSettings: vi.fn(async () => {}),
  query: vi.fn(),
  getCurrentUser: vi.fn(),
  settings: {
    displayName: null,
    defaultWeightUnit: 'lbs',
    defaultIntensityRating: 'rir',
    intensityEnabled: false,
    loggingMode: 'full',
  },
}))

vi.mock('@/lib/auth-client', () => ({ authClient: { changePassword: h.changePassword, signOut: vi.fn() } }))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({ settings: h.settings, isLoading: false, error: null, refetch: vi.fn(), updateSettings: h.updateSettings }),
}))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/auth/server', () => ({ getCurrentUser: h.getCurrentUser }))
vi.mock('pg', () => ({
  Pool: class {
    query = h.query
  },
}))

const EMAIL = 'ada@example.com'
const reply = (body: unknown, ok = true) => vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body }))
const account = () => screen.getByRole('region', { name: 'Account' })

beforeEach(() => {
  h.changePassword.mockReset()
  h.updateSettings.mockClear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Sign-in methods when the lookup fails', () => {
  it('says it could not load when the request fails', async () => {
    vi.stubGlobal('fetch', reply({ error: 'Internal server error' }, false))
    render(<AccountBlock email={EMAIL} />)
    expect(await within(account()).findByText("Couldn't load")).toBeTruthy()
  })

  it('says it could not load when the network is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      })
    )
    render(<AccountBlock email={EMAIL} />)
    expect(await within(account()).findByText("Couldn't load")).toBeTruthy()
  })

  it('shows the providers when it loads', async () => {
    vi.stubGlobal('fetch', reply({ email: EMAIL, providers: ['google'], hasPassword: true }))
    render(<AccountBlock email={EMAIL} />)
    expect(await within(account()).findByText('Google')).toBeTruthy()
    expect(within(account()).queryByText("Couldn't load")).toBeNull()
  })
})

describe('Change password only for accounts with a password', () => {
  it('is hidden for a Google-only account', async () => {
    vi.stubGlobal('fetch', reply({ email: EMAIL, providers: ['google'], hasPassword: false }))
    render(<AccountBlock email={EMAIL} />)
    await within(account()).findByText('Google')
    expect(within(account()).queryByRole('button', { name: /change password/i })).toBeNull()
    expect(within(account()).getByRole('button', { name: /sign out/i })).toBeTruthy()
  })

  it('is shown for an account with a password', async () => {
    vi.stubGlobal('fetch', reply({ email: EMAIL, providers: [], hasPassword: true }))
    render(<AccountBlock email={EMAIL} />)
    await within(account()).findByText('None besides your password')
    expect(within(account()).getByRole('button', { name: /change password/i })).toBeTruthy()
  })

  it('stays available while unknown (loading, or an older response without hasPassword)', async () => {
    vi.stubGlobal('fetch', reply({ email: EMAIL, providers: [] }))
    render(<AccountBlock email={EMAIL} />)
    expect(within(account()).getByRole('button', { name: /change password/i })).toBeTruthy()
    await within(account()).findByText('None besides your password')
    expect(within(account()).getByRole('button', { name: /change password/i })).toBeTruthy()
  })
})

describe('connected-accounts says whether there is a password', () => {
  const GET = async () => {
    const { GET } = await import('@/app/api/settings/connected-accounts/route')
    const res = await GET({} as never)
    return (await res.json()) as { email: string; providers: string[]; hasPassword: boolean }
  }

  beforeEach(() => {
    h.getCurrentUser.mockResolvedValue({ user: { id: 'u1', email: EMAIL }, error: null })
  })

  it('a password and Google: hasPassword true, providers without the password', async () => {
    h.query.mockResolvedValueOnce({ rows: [{ providerId: 'credential' }, { providerId: 'google' }] })
    expect(await GET()).toEqual({ email: EMAIL, providers: ['google'], hasPassword: true })
  })

  it('Google only: hasPassword false', async () => {
    h.query.mockResolvedValueOnce({ rows: [{ providerId: 'google' }] })
    expect(await GET()).toEqual({ email: EMAIL, providers: ['google'], hasPassword: false })
  })

  it('a password only: hasPassword true, no providers', async () => {
    h.query.mockResolvedValueOnce({ rows: [{ providerId: 'credential' }] })
    expect(await GET()).toEqual({ email: EMAIL, providers: [], hasPassword: true })
  })
})

describe('The whole Intensity row is the switch', () => {
  it('is one switch, named for intensity, that contains the label', () => {
    render(<WorkoutsBlock />)
    const toggle = screen.getByRole('switch', { name: /intensity/i })
    expect(within(toggle).getByText(/intensity tracking/i)).toBeTruthy()
    expect(toggle.className).toContain('min-h-12')
    expect(toggle.className).toContain('w-full')
  })

  it('tapping the label text toggles it', () => {
    render(<WorkoutsBlock />)
    const toggle = screen.getByRole('switch', { name: /intensity/i })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(screen.getByText(/intensity tracking/i))
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })
})

describe('Password fields are cleared after a successful change', () => {
  it('reopening the form after a change shows empty fields', async () => {
    vi.stubGlobal('fetch', reply({ email: EMAIL, providers: [], hasPassword: true }))
    h.changePassword.mockResolvedValue({ error: null })
    render(<AccountBlock email={EMAIL} />)
    const open = () => fireEvent.click(within(account()).getByRole('button', { name: /change password/i }))
    open()
    fireEvent.change(screen.getByLabelText(/^current password$/i), { target: { value: 'old-pass' } })
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'new-pass-1' } })
    fireEvent.change(screen.getByLabelText(/^confirm new password$/i), { target: { value: 'new-pass-1' } })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(await screen.findByText('Password changed successfully')).toBeTruthy()
    open()
    await waitFor(() => expect((screen.getByLabelText(/^current password$/i) as HTMLInputElement).value).toBe(''))
    expect((screen.getByLabelText(/^new password$/i) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(/^confirm new password$/i) as HTMLInputElement).value).toBe('')
  })
})
