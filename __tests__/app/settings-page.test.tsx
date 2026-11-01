/**
 * UI5 Settings page: the blocks, their order and names, the role-gated Admin
 * block, the Training targets rows, the Theme and Mode values, the Account
 * and Help rows. Behaviour (roles, names, hrefs, calls), not layout.
 * Spec: initiatives/ui-audit/spec.md ("UI5"); features/ui-audit/settings-page.feature.
 *
 * Seam (pinned here so the implementer matches it):
 *
 *   app/(app)/settings/page.tsx   a SERVER component: no 'use client', no
 *     useSession / '@/lib/auth-client' import. `export default async function
 *     SettingsPage()` takes no props, calls `getCurrentUser()` from
 *     '@/lib/auth/server' (returns { user, error }), calls
 *     redirect('/login') when there is no user, and returns a React tree of
 *     client blocks (components/settings/* or similar, names not pinned) that
 *     the test renders. Client blocks are fed role and email from the server.
 *     Under the page's own line limit (250) so it really is split up.
 *
 *   Blocks are landmark regions (<section aria-label="…">), in this DOM order:
 *     "Look", "Workouts", "Training targets", "Account", "Help", and, for
 *     admin and editor roles only, "Admin" last. No other regions.
 *
 *   Look: a button named /theme/i whose text shows the current theme
 *     ("Ripit" or its THEME_LABELS form), and a button named /mode/i showing
 *     "Dark" or "Light"; clicking Mode calls updateTheme({ ...preference,
 *     mode: <other> }) from useThemePreference.
 *   Workouts: tablists "Workout mode" (Follow Along | Log Sets) and "Default
 *     rating type" (RPE | RIR) and a switch named /intensity/i. There is NO
 *     weight unit control (hidden on purpose, commit fba784df); the saved
 *     defaultWeightUnit is carried through unchanged. Saving is in
 *     settings-save.test.tsx.
 *   Training targets: exactly four links, in this order: Muscle balance
 *     (/settings/muscle-balance), Target movements (/settings/target-movements),
 *     Equipment (/settings/equipment), Agent access (/settings/agent-access).
 *   Account: the signed-in email (from getCurrentUser, no fetch needed), the
 *     text "Connected sign-in methods", a "Change password" button that reveals
 *     Current / New / Confirm new password fields and an "Update password"
 *     button (messages as today), and, last, a "Sign out" button in a
 *     <form action="/api/auth/signout" method="post">.
 *   Help: a "Send feedback" button that opens FeedbackModal, and a "Support"
 *     link to https://venmo.com/<NEXT_PUBLIC_VENMO_HANDLE> only when that env
 *     var is set.
 *   Admin: a link named /admin panel/i to /admin.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)
const h = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  redirect: vi.fn(),
  changePassword: vi.fn(),
  updateTheme: vi.fn(),
  updateSettings: vi.fn(async () => {}),
  pref: { themeName: 'ripit', mode: 'dark' } as { themeName: string; mode: string },
  // one stable object: the page re-syncs whenever `settings` changes identity
  settings: {
    displayName: null,
    defaultWeightUnit: 'lbs',
    defaultIntensityRating: 'rir',
    intensityEnabled: false,
    loggingMode: 'full',
  },
}))

vi.mock('@/lib/auth/server', () => ({ getCurrentUser: h.getCurrentUser }))
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    h.redirect(to)
    throw new Error(`NEXT_REDIRECT ${to}`)
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/auth-client', () => ({
  // The old page called this while rendering on the server, which is the 500.
  useSession: () => {
    throw new Error('useSession must not be called by the Settings page')
  },
  authClient: { changePassword: h.changePassword, signOut: vi.fn() },
}))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({ settings: h.settings, isLoading: false, error: null, refetch: vi.fn(), updateSettings: h.updateSettings }),
}))
vi.mock('@/hooks/useThemePreference', () => ({
  useThemePreference: () => ({ preference: h.pref, updateTheme: h.updateTheme }),
}))
vi.mock('@/components/features/FeedbackModal', () => ({
  default: ({ open }: { open: boolean }) => <div data-testid="feedback" data-open={String(open)} />,
}))

const EMAIL = 'ada@example.com'

function stubFetch(providers: string[] = []) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () => (url.includes('connected-accounts') ? { email: EMAIL, providers } : {}),
    })),
  )
}

async function open(role: string | undefined = 'user', providers: string[] = []) {
  h.getCurrentUser.mockResolvedValue({ user: { id: 'u1', email: EMAIL, role }, error: null })
  stubFetch(providers)
  const mod = (await load('@/app/(app)/settings/page')) as { default: () => Promise<React.ReactElement> }
  return render(await mod.default())
}

const region = (name: string) => screen.getByRole('region', { name })
const hrefs = (el: HTMLElement) => within(el).getAllByRole('link').map((a) => a.getAttribute('href'))

beforeEach(() => {
  h.pref = { themeName: 'ripit', mode: 'dark' }
  for (const f of [h.getCurrentUser, h.redirect, h.changePassword, h.updateTheme, h.updateSettings]) f.mockClear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('Settings renders on the server', () => {
  // The page file's text, read through the bundler's ?raw import.
  const source = async () => ((await load('@/app/(app)/settings/page?raw')) as { default: string }).default

  it('is a server component: no "use client" directive', async () => {
    expect(await source()).not.toMatch(/^\s*['"]use client['"]/m)
  })

  it('does not use useSession or the browser auth client', async () => {
    expect(await source()).not.toMatch(/useSession/)
    expect(await source()).not.toMatch(/from ['"]@\/lib\/auth-client['"]/)
  })

  it('reads the user on the server with getCurrentUser', async () => {
    await open('user')
    expect(h.getCurrentUser).toHaveBeenCalledTimes(1)
  })

  it('is split up: the page file stays short', async () => {
    expect((await source()).split('\n').length).toBeLessThanOrEqual(250)
  })

  it('sends a signed-out visitor to /login', async () => {
    h.getCurrentUser.mockResolvedValue({ user: null, error: null })
    const mod = (await load('@/app/(app)/settings/page')) as { default: () => Promise<unknown> }
    await expect(mod.default()).rejects.toThrow('NEXT_REDIRECT /login')
    expect(h.redirect).toHaveBeenCalledWith('/login')
  })

  it('sends a failed session lookup to /login too', async () => {
    h.getCurrentUser.mockResolvedValue({ user: null, error: new Error('db down') })
    const mod = (await load('@/app/(app)/settings/page')) as { default: () => Promise<unknown> }
    await expect(mod.default()).rejects.toThrow('NEXT_REDIRECT /login')
  })

  it('renders a heading "Settings"', async () => {
    await open()
    expect(screen.getByRole('heading', { level: 1, name: /^settings$/i })).toBeTruthy()
  })

  it('has no doom-corners anywhere on the page', async () => {
    const { container } = await open('admin')
    expect(container.innerHTML).not.toContain('doom-corners')
  })
})

describe('Settings is grouped into blocks', () => {
  const NAMES = ['Look', 'Workouts', 'Training targets', 'Account', 'Help']

  it('shows the five blocks to a regular user, and no Admin block', async () => {
    await open('user')
    for (const name of NAMES) expect(region(name)).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Admin' })).toBeNull()
    expect(screen.getAllByRole('region')).toHaveLength(5)
  })

  it('puts them in that order', async () => {
    await open('user')
    const els = NAMES.map(region)
    for (let i = 1; i < els.length; i++) {
      expect(els[i - 1].compareDocumentPosition(els[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('does not nest one block inside another', async () => {
    await open('user')
    for (const a of NAMES) for (const b of NAMES) if (a !== b) expect(region(a).contains(region(b))).toBe(false)
  })
})

describe('Admins and editors see the Admin block', () => {
  it.each(['admin', 'editor'])('a %s sees Admin, after Help, with a link to /admin', async (role) => {
    await open(role)
    const admin = region('Admin')
    expect(within(admin).getByRole('link', { name: /admin panel/i }).getAttribute('href')).toBe('/admin')
    expect(region('Help').compareDocumentPosition(admin) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getAllByRole('region')).toHaveLength(6)
  })

  it.each(['user', 'banned', undefined])('role %s does not see Admin or any link to /admin', async (role) => {
    await open(role as string | undefined)
    expect(screen.queryByRole('region', { name: 'Admin' })).toBeNull()
    expect(screen.queryAllByRole('link').filter((a) => a.getAttribute('href') === '/admin')).toHaveLength(0)
  })
})

describe('Equipment is reachable from Settings', () => {
  it('Training targets has Muscle balance, Target movements, Equipment and Agent access, in that order', async () => {
    await open()
    const block = region('Training targets')
    expect(hrefs(block)).toEqual(['/settings/muscle-balance', '/settings/target-movements', '/settings/equipment', '/settings/agent-access'])
    const names = within(block).getAllByRole('link').map((a) => a.textContent ?? '')
    expect(names[0]).toMatch(/^muscle balance/i)
    expect(names[1]).toMatch(/^target movements/i)
    expect(names[2]).toMatch(/^equipment/i)
    expect(names[3]).toMatch(/^agent access/i)
  })

  it('the Equipment row links to /settings/equipment', async () => {
    await open()
    expect(screen.getByRole('link', { name: /^equipment/i }).getAttribute('href')).toBe('/settings/equipment')
  })

  it('each of these rows appears once, for admins as well', async () => {
    await open('admin')
    for (const name of [/^muscle balance/i, /^target movements/i, /^equipment/i, /^agent access/i]) {
      expect(screen.getAllByRole('link', { name })).toHaveLength(1)
    }
  })
})

describe('Theme and mode show their current value', () => {
  it('Ripit in dark mode: the Theme row shows Ripit and the Mode row shows Dark', async () => {
    await open()
    const look = region('Look')
    expect(within(look).getByRole('button', { name: /theme/i }).textContent).toMatch(/ripit/i)
    const mode = within(look).getByRole('button', { name: /mode/i })
    expect(mode.textContent).toMatch(/dark/i)
    expect(mode.textContent).not.toMatch(/light/i)
  })

  it('Dracula in light mode', async () => {
    h.pref = { themeName: 'dracula', mode: 'light' }
    await open()
    const look = region('Look')
    expect(within(look).getByRole('button', { name: /theme/i }).textContent).toMatch(/dracula/i)
    const mode = within(look).getByRole('button', { name: /mode/i })
    expect(mode.textContent).toMatch(/light/i)
    expect(mode.textContent).not.toMatch(/dark/i)
  })

  it('choosing Mode switches dark to light, keeping the theme', async () => {
    await open()
    fireEvent.click(within(region('Look')).getByRole('button', { name: /mode/i }))
    expect(h.updateTheme).toHaveBeenCalledWith({ themeName: 'ripit', mode: 'light' })
  })

  it('choosing Mode switches light to dark', async () => {
    h.pref = { themeName: 'dracula', mode: 'light' }
    await open()
    fireEvent.click(within(region('Look')).getByRole('button', { name: /mode/i }))
    expect(h.updateTheme).toHaveBeenCalledWith({ themeName: 'dracula', mode: 'dark' })
  })
})

describe('The Workouts block has the four controls', () => {
  it('Workout mode, Intensity and Rating type are in the Workouts block, and there is no weight unit', async () => {
    await open()
    const block = region('Workouts')
    expect(within(block).getByRole('tablist', { name: /workout mode/i })).toBeTruthy()
    expect(screen.queryByRole('tablist', { name: /weight unit/i })).toBeNull()
    expect(screen.queryByRole('tab', { name: /^(lbs|kg)$/i })).toBeNull()
    expect(within(block).getByRole('switch', { name: /intensity/i })).toBeTruthy()
    expect(within(block).getByRole('tablist', { name: /rating type/i })).toBeTruthy()
  })

  it('shows the saved values selected', async () => {
    Object.assign(h.settings, { defaultWeightUnit: 'kg', loggingMode: 'follow_along', intensityEnabled: true, defaultIntensityRating: 'rpe' })
    try {
      await open()
      const sel = (list: RegExp, tab: RegExp) =>
        within(within(region('Workouts')).getByRole('tablist', { name: list })).getByRole('tab', { name: tab }).getAttribute('aria-selected')
      expect(sel(/workout mode/i, /follow along/i)).toBe('true')
      expect(sel(/rating type/i, /^rpe$/i)).toBe('true')
      expect(within(region('Workouts')).getByRole('switch', { name: /intensity/i }).getAttribute('aria-checked')).toBe('true')
    } finally {
      Object.assign(h.settings, { defaultWeightUnit: 'lbs', loggingMode: 'full', intensityEnabled: false, defaultIntensityRating: 'rir' })
    }
  })
})

describe('Account', () => {
  it('shows the signed-in email from the server, without waiting for a fetch', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    h.getCurrentUser.mockResolvedValue({ user: { id: 'u1', email: EMAIL, role: 'user' }, error: null })
    const mod = (await load('@/app/(app)/settings/page')) as { default: () => Promise<React.ReactElement> }
    render(await mod.default())
    expect(within(region('Account')).queryAllByText(EMAIL, { exact: false }).length).toBeGreaterThan(0)
  })

  it('has a Connected sign-in methods line, and shows Google when it is connected', async () => {
    await open('user', ['google'])
    const account = region('Account')
    expect(within(account).getByText(/connected sign-in methods/i)).toBeTruthy()
    expect(await within(account).findByText(/google/i)).toBeTruthy()
  })

  it('Sign out is a POST form to /api/auth/signout, and is the last control in Account', async () => {
    const { container } = await open()
    const account = region('Account')
    const form = container.querySelector('form[action="/api/auth/signout"]') as HTMLFormElement
    expect(form).toBeTruthy()
    expect(form.method.toLowerCase()).toBe('post')
    expect(account.contains(form)).toBe(true)
    const signOut = within(form).getByRole('button', { name: /sign out/i })
    expect(signOut.getAttribute('type')).toBe('submit')
    const buttons = within(account).getAllByRole('button')
    expect(buttons[buttons.length - 1]).toBe(signOut)
  })

  it('has only one Sign out', async () => {
    await open('admin')
    expect(screen.getAllByRole('button', { name: /sign out/i })).toHaveLength(1)
  })
})

describe('Change password still works', () => {
  const openForm = async () => {
    await open()
    fireEvent.click(within(region('Account')).getByRole('button', { name: /change password/i }))
  }
  const fill = (cur: string, next: string, confirm: string) => {
    fireEvent.change(screen.getByLabelText(/^current password$/i), { target: { value: cur } })
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: next } })
    fireEvent.change(screen.getByLabelText(/^confirm new password$/i), { target: { value: confirm } })
  }
  const update = () => screen.getByRole('button', { name: /update password/i })

  it('hides the fields until Change password is chosen', async () => {
    await open()
    expect(screen.queryByLabelText(/^current password$/i)).toBeNull()
    fireEvent.click(within(region('Account')).getByRole('button', { name: /change password/i }))
    expect(screen.getByLabelText(/^current password$/i)).toBeTruthy()
    expect(screen.getByLabelText(/^new password$/i)).toBeTruthy()
    expect(screen.getByLabelText(/^confirm new password$/i)).toBeTruthy()
  })

  it('Update password stays disabled until every field is filled', async () => {
    await openForm()
    expect((update() as HTMLButtonElement).disabled).toBe(true)
    fill('old-pass', 'new-pass-1', '')
    expect((update() as HTMLButtonElement).disabled).toBe(true)
    fill('old-pass', 'new-pass-1', 'new-pass-1')
    expect((update() as HTMLButtonElement).disabled).toBe(false)
  })

  it('rejects a new password under 6 characters without calling the server', async () => {
    await openForm()
    fill('old-pass', 'abc', 'abc')
    fireEvent.click(update())
    expect(await screen.findByText('New password must be at least 6 characters')).toBeTruthy()
    expect(h.changePassword).not.toHaveBeenCalled()
  })

  it('rejects mismatched new passwords without calling the server', async () => {
    await openForm()
    fill('old-pass', 'new-pass-1', 'new-pass-2')
    fireEvent.click(update())
    expect(await screen.findByText('New passwords do not match')).toBeTruthy()
    expect(h.changePassword).not.toHaveBeenCalled()
  })

  it('changes the password and signs other sessions out, then confirms and closes the form', async () => {
    h.changePassword.mockResolvedValue({ error: null })
    await openForm()
    fill('old-pass', 'new-pass-1', 'new-pass-1')
    fireEvent.click(update())
    expect(await screen.findByText('Password changed successfully')).toBeTruthy()
    expect(h.changePassword).toHaveBeenCalledWith({ currentPassword: 'old-pass', newPassword: 'new-pass-1', revokeOtherSessions: true })
    expect(screen.queryByLabelText(/^current password$/i)).toBeNull()
  })

  it("shows the server's message when the change is refused", async () => {
    h.changePassword.mockResolvedValue({ error: { message: 'Invalid password' } })
    await openForm()
    fill('wrong', 'new-pass-1', 'new-pass-1')
    fireEvent.click(update())
    expect(await screen.findByText('Invalid password')).toBeTruthy()
    expect(screen.queryByText('Password changed successfully')).toBeNull()
  })

  it('shows a fallback message when the refusal has none, and when the call throws', async () => {
    h.changePassword.mockResolvedValueOnce({ error: {} })
    await openForm()
    fill('wrong', 'new-pass-1', 'new-pass-1')
    fireEvent.click(update())
    expect(await screen.findByText('Failed to change password')).toBeTruthy()
    h.changePassword.mockRejectedValueOnce(new Error('network down'))
    fireEvent.click(update())
    expect(await screen.findByText('network down')).toBeTruthy()
  })
})

describe('Help', () => {
  it('Send feedback opens the feedback form', async () => {
    await open()
    expect(screen.getByTestId('feedback').getAttribute('data-open')).toBe('false')
    fireEvent.click(within(region('Help')).getByRole('button', { name: /send feedback/i }))
    await waitFor(() => expect(screen.getByTestId('feedback').getAttribute('data-open')).toBe('true'))
  })

  it('shows a Support link to Venmo when a handle is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_VENMO_HANDLE', 'ripit-fitness')
    await open()
    const link = within(region('Help')).getByRole('link', { name: /support/i })
    expect(link.getAttribute('href')).toBe('https://venmo.com/ripit-fitness')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('shows no Support link without a handle', async () => {
    vi.stubEnv('NEXT_PUBLIC_VENMO_HANDLE', '')
    await open()
    expect(screen.queryByRole('link', { name: /support/i })).toBeNull()
  })
})
