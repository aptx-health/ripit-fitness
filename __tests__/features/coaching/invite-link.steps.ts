/**
 * Step definitions for features/coaching/invite-link.feature (coaching slice 1).
 * Design: initiatives/coaching/docs/136-discovery.md. Work item: work/137.
 *
 * Seams (all new unless marked; names are the contract):
 *
 *   Schema   models CoachInvite { id, coachUserId, tokenHash @unique, expiresAt,
 *     usedAt?, revokedAt?, createdAt } and CoachLink { id, coachUserId,
 *     traineeUserId, createdAt, endedAt?, endedBy? } (table names as the
 *     models, no @@map). Proposal.agentTokenId becomes nullable and gains
 *     coachLinkId String? (FK to CoachLink). The hand-written migration under
 *     prisma/migrations/ that adds "coachLinkId" also holds the CHECK as its own
 *     statement: ALTER TABLE "Proposal" ADD CONSTRAINT <name> CHECK (...).
 *     Tests run on a `db push` schema, so they apply that statement themselves.
 *
 *   lib/coaching/invites.ts
 *     createInvite(db, coachUserId) -> { id, token, expiresAt }   expires in 7 days;
 *       the plain token is returned only here and never stored.
 *     revokeInvite(db, coachUserId, id)   another user's or an unknown id changes nothing.
 *     getInvite(db, token, viewerId | null) -> { status, coachName }
 *       status: 'valid' | 'invalid' | 'self' | 'already_linked'. invalid = unknown,
 *       expired, revoked or used. self = the coach opening their own valid invite.
 *       already_linked = viewer has an active (not ended) link with this coach.
 *       coachName = the coach's UserSettings.displayName.
 *     acceptInvite(db, token, traineeUserId)   links and marks the invite used only
 *       when getInvite would say 'valid'; otherwise changes nothing. Single use,
 *       also under two accepts at once.
 *   lib/coaching/links.ts
 *     listCoaching(db, userId) -> { invites, trainees, coaches }
 *       invites: the user's open invites (unused, unrevoked, unexpired) as { id, expiresAt, ... }
 *       trainees / coaches: active links as { linkId, name, linkedAt, ... }
 *       never a token or a hash.
 *     endLink(db, userId, linkId)   either side; sets endedAt and endedBy; another
 *       user's or an unknown link changes nothing. Proposals are not touched.
 *
 *   Routes (every one: 401 signed out, 429 when its limiter refuses with no state
 *   change, 500 and logger.error when the database fails; limiters are new
 *   exports of lib/rate-limit.ts listed in docs/RATE_LIMITING.md on a line that
 *   says "coaching"):
 *     app/api/coaching/invites/route.ts          POST -> 201 { invite: { id, token, expiresAt } }
 *     app/api/coaching/invites/[id]/route.ts     DELETE -> 200; not mine -> 404
 *     app/api/coaching/invites/accept/route.ts   POST { token } -> 2xx; refused -> 4xx { code }
 *                                                where code is getInvite's status
 *     app/api/coaching/links/[id]/route.ts       DELETE -> 200; not mine -> 404
 *
 *   Pages
 *     app/(app)/settings/coaching/page.tsx   async server page (no props); reads the
 *       user and listCoaching, renders client parts that call the routes above.
 *       "Invite a trainee" button; the new link (contains /coach/invite/<token>),
 *       a "Copy" button (navigator.clipboard.writeText) and "Expires in 7 days".
 *       Each open invite, trainee and coach is an <li>; invites show "Expires ..." and Revoke,
 *       trainees show name + linked date + End, a coach shows "Your coach: <name>" + End.
 *       End asks to confirm before it sends anything.
 *     app/coach/invite/[token]/page.tsx   async server page ({ params }). Signed out:
 *       Sign up and Sign in links that bring the user back here (?next= or a
 *       cookie set in the browser; the tests follow the link either way).
 *     Settings: a "Coaching" row linking /settings/coaching inside the Account
 *       block (Training targets is pinned to four rows by settings-page.test.tsx).
 *     Login, signup (after onboarding) and OAuth return to the invite; a return
 *       path that is not a same-origin path (//evil.com, https://evil.com) is ignored.
 *     lib/auth/middleware.ts (existing): /coach/invite/* is reachable signed out
 *       (tested in __tests__/app/coaching-invite-middleware.test.ts, node environment).
 *
 * vitest-cucumber runs every step as its own test and Testing Library cleans up
 * between tests, so UI steps render inside the step that needs them.
 */

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextRequest } from 'next/server'
import { type ComponentType, createElement, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CURRENT_WAIVER_VERSION } from '@/lib/constants/waiver'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const auth = vi.hoisted(() => ({ userId: '', role: 'user' }))
const rl = vi.hoisted(() => ({ refuse: false, calls: [] as Array<{ name: string; key: string }> }))
const boom = vi.hoisted(() => ({ on: false }))
const log = vi.hoisted(() => ({ error: vi.fn() }))
const nav = vi.hoisted(() => ({ to: [] as string[], search: '', path: '/' }))
const authClient = vi.hoisted(() => ({
  signInEmail: vi.fn(async () => ({ error: null })),
  signUpEmail: vi.fn(async () => ({ error: null })),
  social: vi.fn(async () => ({ error: null })),
}))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  const real = (await db()).getPrismaClient()
  // boom.on makes every database call from app code fail (tests use the real client).
  const prisma = new Proxy(real, {
    get(target, key) {
      if (boom.on) throw new Error('database unavailable (test)')
      const value = Reflect.get(target, key)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  return { prisma, default: prisma }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    auth.userId
      ? { user: { id: auth.userId, role: auth.role, email: `${auth.userId}@x.test` }, error: null }
      : { user: null, error: null },
}))
vi.mock('@/lib/logger', () => {
  const l = { error: log.error, warn: vi.fn(), info: vi.fn(), debug: vi.fn(), trace: vi.fn(), fatal: vi.fn() }
  return { logger: { ...l, child: () => l }, default: l }
})
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/rate-limit', async () => {
  const refused = () => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
  const nameOf = (l: unknown) => (l as { limiterName?: string })?.limiterName ?? String(l)
  return new Proxy(
    {},
    {
      has: () => true,
      get: (_t, key) => {
        if (key === 'then' || key === '__esModule') return undefined
        if (key === 'getClientIp') return () => '203.0.113.7'
        if (key === 'checkRateLimit')
          return async (l: unknown, k: string) => {
            rl.calls.push({ name: nameOf(l), key: String(k) })
            return rl.refuse ? refused() : null
          }
        if (key === 'checkRateLimitWithHeaders')
          return async (l: unknown, k: string) => {
            rl.calls.push({ name: nameOf(l), key: String(k) })
            return { response: rl.refuse ? refused() : null, headers: {} }
          }
        // Every limiter export is a getter tagged with its export name.
        return Object.assign(() => ({}), { limiterName: String(key) })
      },
    }
  )
})
vi.mock('@/lib/events', () => ({ recordEvent: () => {} }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/app-origin', () => ({ appOrigin: async () => 'https://ripit.test' }))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn(), flushEvents: vi.fn(async () => {}), identify: vi.fn() }))
vi.mock('@/lib/auth-client', () => ({
  signIn: { email: authClient.signInEmail, social: authClient.social },
  signUp: { email: authClient.signUpEmail },
  signOut: vi.fn(),
  useSession: () => ({ data: null, isPending: false }),
  authClient: { signOut: vi.fn(), changePassword: vi.fn() },
}))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({ settings: null, isLoading: false, error: null, refetch: vi.fn(), updateSettings: vi.fn() }),
}))
vi.mock('@/hooks/useThemePreference', () => ({
  useThemePreference: () => ({ preference: { themeName: 'ripit', mode: 'dark' }, updateTheme: vi.fn() }),
}))
vi.mock('@/components/features/FeedbackModal', () => ({ default: () => null }))
vi.mock('next/navigation', () => {
  const router = {
    push: (to: string) => nav.to.push(to),
    replace: (to: string) => nav.to.push(to),
    refresh: () => {},
    back: () => {},
    prefetch: () => {},
  }
  return {
    redirect: (to: string) => {
      throw new Error(`NEXT_REDIRECT ${to}`)
    },
    notFound: () => {
      throw new Error('NEXT_NOT_FOUND')
    },
    useRouter: () => router,
    usePathname: () => nav.path,
    useSearchParams: () => new URLSearchParams(nav.search),
  }
})

const feature = await loadFeature('features/coaching/invite-link.feature')

// ---------------------------------------------------------------------------
const load = (spec: string) => import(/* @vite-ignore */ spec)
type Json = Record<string, unknown>
type Delegate = Record<string, (args?: unknown) => Promise<unknown>>
const DAY = 24 * 60 * 60 * 1000

interface State {
  prisma: PrismaClient
  dustin: string
  sam: string
  alex: string
  token?: string
  inviteId?: string
  linkId?: string
  proposalId?: string
  last?: { status: number; body: Json }
  clipboard: string[]
  fetched: Array<{ url: string; method: string; body?: string }>
}
let s: State

const model = (name: 'coachInvite' | 'coachLink') => (s.prisma as unknown as Record<string, Delegate>)[name]
const inviteRow = async (id = s.inviteId) => (await model('coachInvite').findUnique({ where: { id } })) as Json
const links = async () => (await model('coachLink').findMany({ orderBy: { createdAt: 'asc' } })) as Json[]
const activeLinks = async () => (await links()).filter((l) => l.endedAt === null)

async function freshState(): Promise<State> {
  const db = await getTestDatabase()
  await db.reset()
  const prisma = db.getPrismaClient()
  const [dustin, sam, alex] = [(await createTestUser()).id, (await createTestUser()).id, (await createTestUser()).id]
  await prisma.userSettings.createMany({
    data: [
      { userId: dustin, displayName: 'Dustin' },
      { userId: sam, displayName: 'Sam' },
      { userId: alex, displayName: 'Alex' },
    ],
  })
  // work 143: invites now sit behind the waiver gate, so the users have accepted it.
  await prisma.waiverAcceptance.createMany({
    data: [dustin, sam, alex].map((userId) => ({ userId, waiverVersion: CURRENT_WAIVER_VERSION })),
  })
  signIn(dustin)
  resetBrowser()
  return { prisma, dustin, sam, alex, clipboard: [], fetched: [] }
}
/**
 * Browser state a scenario carries from step to step (cookies, storage, where
 * the page navigated). Cleared once per scenario, never per step: every step is
 * its own test, so a beforeEach would wipe a return path between When and Then.
 */
function resetBrowser() {
  nav.to.length = 0
  nav.search = ''
  nav.path = '/'
  for (const f of Object.values(authClient)) f.mockClear()
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0].trim()
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  }
  try {
    sessionStorage.clear()
    localStorage.clear()
  } catch {}
  restoreLocation()
}
function signIn(userId: string, role = 'user') {
  auth.userId = userId
  auth.role = role
}

// --- lib ---------------------------------------------------------------------
type Invites = {
  createInvite: (db: PrismaClient, coachUserId: string) => Promise<{ id: string; token: string; expiresAt: Date }>
  revokeInvite: (db: PrismaClient, coachUserId: string, id: string) => Promise<unknown>
  getInvite: (db: PrismaClient, token: string, viewerId: string | null) => Promise<{ status: string; coachName?: string | null }>
  acceptInvite: (db: PrismaClient, token: string, traineeUserId: string) => Promise<unknown>
}
type Links = {
  listCoaching: (
    db: PrismaClient,
    userId: string
  ) => Promise<{ invites: Json[]; trainees: Json[]; coaches: Json[] }>
  endLink: (db: PrismaClient, userId: string, linkId: string) => Promise<unknown>
}
const invites = async () => (await load('@/lib/coaching/invites')) as Invites
const linksLib = async () => (await load('@/lib/coaching/links')) as Links

async function makeInvite(coach = s.dustin) {
  const out = await (await invites()).createInvite(s.prisma, coach)
  s.token = out.token
  s.inviteId = out.id
  return out
}
async function link(coach = s.dustin, trainee = s.sam) {
  const inv = await (await invites()).createInvite(s.prisma, coach)
  await (await invites()).acceptInvite(s.prisma, inv.token, trainee)
  const row = (await activeLinks()).find((l) => l.coachUserId === coach && l.traineeUserId === trainee)
  expect(row, 'link created through acceptInvite').toBeTruthy()
  return String(row?.id)
}
const statusOf = async (token: string, viewer: string | null) => (await (await invites()).getInvite(s.prisma, token, viewer)).status

// --- the one-sender CHECK -----------------------------------------------------
function migrationCheckSql(): string[] {
  const dir = path.resolve('prisma/migrations')
  const files = readdirSync(dir)
    .map((d) => path.join(dir, d, 'migration.sql'))
    .filter((f) => {
      try {
        return readFileSync(f, 'utf8').includes('coachLinkId')
      } catch {
        return false
      }
    })
  const statements = files.flatMap((f) => readFileSync(f, 'utf8').split(';'))
  return statements.map((st) => st.trim()).filter((st) => /add\s+constraint/i.test(st) && /check\s*\(/i.test(st))
}
async function applyCheck() {
  const sql = migrationCheckSql()
  expect(sql.length, 'a migration that adds "coachLinkId" also adds a CHECK constraint').toBeGreaterThan(0)
  for (const st of sql) {
    try {
      await s.prisma.$executeRawUnsafe(st)
    } catch (e) {
      if (!/already exists/i.test(String(e))) throw e
    }
  }
}
async function agentToken(userId: string) {
  const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
  return (await createAgentToken(s.prisma, userId, 'Hermes')).record.id
}
async function insertProposal(userId: string, agentTokenId: string | null, coachLinkId: string | null) {
  return s.prisma.$executeRawUnsafe(
    `INSERT INTO "Proposal" (id, "userId", "agentTokenId", "coachLinkId", kind, status, summary, rationale, payload)
     VALUES ($1, $2, $3, $4, 'anchors.update', 'pending', 's', 'r', '{}'::jsonb)`,
    `p_${Math.random().toString(36).slice(2)}`,
    userId,
    agentTokenId,
    coachLinkId
  )
}
/** A real saved-workout proposal to `userId`, then moved onto the coach link (as slice 2 will send). */
async function coachSentProposal(userId: string, linkId: string) {
  const bench = await createTestExerciseDefinition(s.prisma, { name: 'Barbell Bench Press' })
  const tokenId = await agentToken(userId)
  const { createProposal } = (await load('@/lib/proposals/service')) as typeof import('@/lib/proposals/service')
  const made = await createProposal(
    s.prisma,
    {
      userId,
      agentTokenId: tokenId,
      kind: 'saved_workout.create',
      rationale: 'Start here',
      workout: { name: 'Coach Push', exercises: [{ exerciseDefinitionId: bench.id, sets: [{ reps: '8' }] }] },
    },
    async () => {}
  )
  expect(made.ok, JSON.stringify(made)).toBe(true)
  const id = (made as { proposal: { id: string } }).proposal.id
  await s.prisma.$executeRawUnsafe(
    `UPDATE "Proposal" SET "agentTokenId" = NULL, "coachLinkId" = $1 WHERE id = $2`,
    linkId,
    id
  )
  return id
}

// --- routes -------------------------------------------------------------------
type Ctx = { params: Promise<{ id: string }> }
type Handler = (r: NextRequest, c?: Ctx) => Promise<Response>
const invitesRoute = async () => (await load('@/app/api/coaching/invites/route')) as { POST: Handler }
const inviteIdRoute = async () => (await load('@/app/api/coaching/invites/[id]/route')) as { DELETE: Handler }
const acceptRoute = async () => (await load('@/app/api/coaching/invites/accept/route')) as { POST: Handler }
const linkIdRoute = async () => (await load('@/app/api/coaching/links/[id]/route')) as { DELETE: Handler }
const result = async (res: Response) => ({ status: res.status, body: (await res.json().catch(() => ({}))) as Json })
const req = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    ...(body !== undefined && { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })
const ctx = (id: string): Ctx => ({ params: Promise.resolve({ id }) })

const postInvite = async () => result(await (await invitesRoute()).POST(req('/api/coaching/invites', 'POST', {})))
const deleteInvite = async (id: string) =>
  result(await (await inviteIdRoute()).DELETE(req(`/api/coaching/invites/${id}`, 'DELETE'), ctx(id)))
const postAccept = async (token: string) =>
  result(await (await acceptRoute()).POST(req('/api/coaching/invites/accept', 'POST', { token })))
const deleteLink = async (id: string) =>
  result(await (await linkIdRoute()).DELETE(req(`/api/coaching/links/${id}`, 'DELETE'), ctx(id)))

// --- UI -----------------------------------------------------------------------
/** fetch that runs the real coaching routes; anything else answers 200 {}. */
function routedFetch(extra?: (url: string, method: string) => Json | undefined) {
  s.fetched.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: { method?: string; body?: string }) => {
      const url = String(input instanceof Request ? input.url : input).replace(/^https?:\/\/[^/]+/, '')
      const method = (init?.method ?? 'GET').toUpperCase()
      s.fetched.push({ url, method, body: init?.body })
      const pass = (r: NextRequest) => new NextRequest(`http://localhost${url}`, { method, headers: r.headers, body: init?.body })
      let res: Response | null = null
      if (url === '/api/coaching/invites' && method === 'POST')
        res = await (await invitesRoute()).POST(pass(req(url, method, {})))
      else if (url === '/api/coaching/invites/accept' && method === 'POST')
        res = await (await acceptRoute()).POST(pass(req(url, method, {})))
      else {
        const inv = /^\/api\/coaching\/invites\/([^/?]+)$/.exec(url)?.[1]
        const lnk = /^\/api\/coaching\/links\/([^/?]+)$/.exec(url)?.[1]
        if (inv && method === 'DELETE') res = await (await inviteIdRoute()).DELETE(req(url, method), ctx(inv))
        if (lnk && method === 'DELETE') res = await (await linkIdRoute()).DELETE(req(url, method), ctx(lnk))
      }
      if (!res) {
        const body = extra?.(url, method) ?? {}
        res = new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return res
    })
  )
}
function stubClipboard() {
  s.clipboard = []
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (t: string) => void s.clipboard.push(t) },
  })
}
const realLocation = window.location
function restoreLocation() {
  if (window.location === realLocation) return
  delete (window as unknown as { location?: unknown }).location
  ;(window as unknown as { location: unknown }).location = realLocation
}
/** Replaces window.location with a recorder; assignments land in nav.to. */
function stubLocation(href: string) {
  const u = new URL(href, 'http://localhost')
  const loc = {
    origin: u.origin,
    protocol: u.protocol,
    host: u.host,
    hostname: u.hostname,
    pathname: u.pathname,
    search: u.search,
    hash: '',
    get href() {
      return u.toString()
    },
    set href(to: string) {
      nav.to.push(to)
    },
    assign: (to: string) => nav.to.push(to),
    replace: (to: string) => nav.to.push(to),
    reload: () => {},
    toString: () => u.toString(),
  }
  // jsdom allows deleting and replacing window.location (probed 2026-11-06)
  delete (window as unknown as { location?: unknown }).location
  ;(window as unknown as { location: unknown }).location = loc
  nav.path = u.pathname
  nav.search = u.search
}
/** Where the page sent the user last, as a path (+ query), or null. */
function landed(): string | null {
  const to = nav.to.at(-1)
  if (to === undefined) return null
  const u = new URL(to, 'http://localhost')
  return u.origin === 'http://localhost' ? `${u.pathname}${u.search}` : u.toString()
}
const landedPath = () => {
  const l = landed()
  return l === null ? null : l.startsWith('http') ? l : new URL(l, 'http://localhost').pathname
}

async function renderCoachingPage(userId: string) {
  cleanup()
  signIn(userId)
  routedFetch()
  stubClipboard()
  const mod = (await load('@/app/(app)/settings/coaching/page')) as { default: () => Promise<ReactElement> }
  return render(await mod.default())
}
async function renderInvitePage(token: string, userId: string | null) {
  cleanup()
  signIn(userId ?? '')
  routedFetch()
  const mod = (await load('@/app/coach/invite/[token]/page')) as {
    default: (p: { params: Promise<{ token: string }> }) => Promise<ReactElement>
  }
  return render(await mod.default({ params: Promise.resolve({ token }) }))
}
const rowOf = (text: string | RegExp) => {
  const el = screen.getAllByText(text)[0].closest('li')
  expect(el, `a list item containing ${text}`).toBeTruthy()
  return el as HTMLElement
}
/** Tokens in /coach/invite/<token> links on the page: text nodes, input values and hrefs, each on its own. */
function shownTokens(): string[] {
  const pieces: string[] = []
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  while (walk.nextNode()) pieces.push(walk.currentNode.textContent ?? '')
  for (const i of document.querySelectorAll('input, textarea')) pieces.push((i as HTMLInputElement).value)
  for (const a of document.querySelectorAll('[href]')) pieces.push(a.getAttribute('href') ?? '')
  return pieces.flatMap((p) => [...p.matchAll(/\/coach\/invite\/([A-Za-z0-9_-]+)/g)].map((m) => m[1]))
}
const bodyText = () => document.body.textContent?.replace(/\s+/g, ' ') ?? ''
const NO_LONGER_VALID = 'This invite is no longer valid'
const SELF = /you can.t coach yourself/i

/** Clicks End (or Revoke) in a row, confirms if asked, and waits for the DELETE. */
async function tapAndConfirm(row: HTMLElement, name: RegExp, urlPart: string, mustConfirm = false) {
  const first = within(row).getByRole('button', { name })
  fireEvent.click(first)
  const sent = () => s.fetched.some((f) => f.method === 'DELETE' && f.url.includes(urlPart))
  await new Promise((r) => setTimeout(r, 50))
  if (mustConfirm) expect(sent(), 'nothing is sent before confirming').toBe(false)
  if (!sent()) {
    const confirm = screen
      .getAllByRole('button', { name: new RegExp(`${name.source}|^(yes|confirm)`, 'i') })
      .filter((b) => b !== first)
    expect(confirm.length, 'a confirm button').toBeGreaterThan(0)
    fireEvent.click(confirm.at(-1) as HTMLElement)
  }
  await waitFor(() => expect(sent()).toBe(true))
}

/** Signed out on the invite page, follows its Sign in / Sign up link. Returns the auth page's URL. */
async function followAuthLink(which: RegExp) {
  await renderInvitePage(String(s.token), null)
  const a = await screen.findByRole('link', { name: which })
  const href = a.getAttribute('href') ?? ''
  fireEvent.click(a)
  cleanup()
  return href
}
async function renderAuthPage(page: 'login' | 'signup' | 'onboarding', url: string) {
  cleanup()
  nav.to.length = 0
  stubLocation(url)
  const mod = (await load(`@/app/(auth)/${page}/page`)) as { default: ComponentType }
  return render(createElement(mod.default))
}
async function submitLogin() {
  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'sam@x.test' } })
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password1' } })
  fireEvent.click(screen.getByRole('button', { name: /^sign in/i }))
  await waitFor(() => expect(landed()).not.toBeNull())
}
async function submitSignup() {
  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'sam@x.test' } })
  for (const box of screen.getAllByLabelText(/password/i)) fireEvent.change(box, { target: { value: 'password1' } })
  fireEvent.click(screen.getByRole('button', { name: /create account|sign up/i }))
  await waitFor(() => expect(landed()).not.toBeNull())
}
/** Runs onboarding at `url` as an experienced lifter (or already onboarded) and returns where it lands. */
async function finishOnboarding(url: string, alreadyOnboarded = false) {
  routedFetch((u) => {
    if (u.startsWith('/api/settings')) return { settings: { onboardingCompleted: alreadyOnboarded } }
    if (u.startsWith('/api/onboarding/complete')) return { success: true }
    return undefined
  })
  await renderAuthPage('onboarding', url)
  if (!alreadyOnboarded) fireEvent.click(await screen.findByText(/I HAVE EXPERIENCE/i))
  await waitFor(() => expect(landed()).not.toBeNull(), { timeout: 8000 })
  return landedPath()
}

const TAP = /\b(min-)?h-12\b|\b(min-)?h-\[48px\]/
/** Raw palette colours bypass the theme tokens (light, dark and E-INK). */
const RAW_COLOUR = /\b(bg|text|border)-(white|black|(gray|slate|zinc|neutral|red|green|blue|yellow|orange)-\d{2,3})\b|\[#[0-9a-f]{3,6}\]/i
function expectPhoneFriendly() {
  const targets = [...document.body.querySelectorAll('button, a')] as HTMLElement[]
  expect(targets.length).toBeGreaterThan(0)
  for (const t of targets) expect(`${t.textContent}: ${t.className}`).toMatch(TAP)
  for (const el of document.body.querySelectorAll('[class]')) expect(String(el.getAttribute('class'))).not.toMatch(RAW_COLOUR)
}

beforeEach(() => {
  rl.refuse = false
  rl.calls.length = 0
  boom.on = false
  log.error.mockClear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------
describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('Dustin is signed in and his display name is "Dustin"', async () => {
      s = await freshState()
    })
  })

  // Schema ---------------------------------------------------------------------
  Scenario('A proposal has exactly one sender', ({ Then, And }) => {
    Then('a proposal has either an agent token or a coach link, never both and never neither', async () => {
      await applyCheck()
      const tokenId = await agentToken(s.sam)
      const linkId = await link()
      await expect(insertProposal(s.sam, tokenId, null)).resolves.toBe(1)
      await expect(insertProposal(s.sam, null, linkId)).resolves.toBe(1)
      await expect(insertProposal(s.sam, null, null)).rejects.toThrow()
      await expect(insertProposal(s.sam, tokenId, linkId)).rejects.toThrow()
    })
    And('existing agent proposals, the admin proposal pages and /suggestions work as before', async () => {
      // Dustin (admin) has one agent proposal and one coach-sent proposal (Alex coaches him).
      const linkId = await link(s.alex, s.dustin)
      const coachId = await coachSentProposal(s.dustin, linkId)
      signIn(s.dustin, 'admin')
      const list = (await load('@/app/(app)/admin/proposals/page')) as { default: () => Promise<ReactElement> }
      render(await list.default())
      expect(screen.getAllByText(/Coach Push/).length).toBeGreaterThan(0)
      expect(bodyText()).not.toMatch(/undefined|\bnull\b/)
      cleanup()
      const detail = (await load('@/app/(app)/admin/proposals/[id]/page')) as {
        default: (p: { params: Promise<{ id: string }> }) => Promise<ReactElement>
      }
      render(await detail.default({ params: Promise.resolve({ id: coachId }) }))
      expect(screen.getAllByText(/Coach Push/).length).toBeGreaterThan(0)
      expect(bodyText()).not.toMatch(/undefined|\bnull\b/)
      const apiList = (await load('@/app/api/admin/proposals/route')) as { GET: Handler }
      expect((await apiList.GET(req('/api/admin/proposals', 'GET'))).status).toBe(200)
      const apiOne = (await load('@/app/api/admin/proposals/[id]/route')) as { GET: Handler }
      expect((await apiOne.GET(req(`/api/admin/proposals/${coachId}`, 'GET'), ctx(coachId))).status).toBe(200)
      // /suggestions: the trainee's list and detail include the coach-sent one.
      const detailLib = (await load('@/lib/suggestions/detail')) as typeof import('@/lib/suggestions/detail')
      expect((await detailLib.listPendingSuggestions(s.dustin)).map((p) => p.id)).toContain(coachId)
      expect(await detailLib.getSuggestionDetail(s.dustin, coachId)).not.toBeNull()
    })
  })

  // Invites --------------------------------------------------------------------
  Scenario('Make an invite', ({ When, Then, And }) => {
    When('Dustin opens Settings → Coaching and taps "Invite a trainee"', async () => {
      await renderCoachingPage(s.dustin)
      fireEvent.click(await screen.findByRole('button', { name: /invite a trainee/i }))
      await waitFor(() => expect(s.fetched.some((f) => f.method === 'POST' && f.url === '/api/coaching/invites')).toBe(true))
    })
    Then('he gets a link /coach/invite/<token> with a Copy button and "Expires in 7 days"', async () => {
      await renderCoachingPage(s.dustin)
      fireEvent.click(await screen.findByRole('button', { name: /invite a trainee/i }))
      await screen.findByText(/expires in 7 days/i)
      const row = (await model('coachInvite').findMany({ orderBy: { createdAt: 'desc' } })) as Json[]
      expect(row.length).toBeGreaterThan(0)
      const token = shownTokens()[0]
      expect(token, 'the link is on the page').toBeTruthy()
      expect(await statusOf(String(token), s.sam)).toBe('valid')
      fireEvent.click(screen.getByRole('button', { name: /^copy/i }))
      await waitFor(() => expect(s.clipboard.at(-1) ?? '').toMatch(new RegExp(`/coach/invite/${token}$`)))
      const expiresAt = new Date(String(row[0].expiresAt)).getTime()
      expect(Math.abs(expiresAt - (Date.now() + 7 * DAY))).toBeLessThan(5 * 60_000)
    })
    // work 138: step text follows the amended feature (lead, 2026-11-06).
    And('the token is stored only as a hash, so the link can be copied only now (like agent tokens); open invites later show their expiry and Revoke, and a lost link means making a new invite', async () => {
      const { token } = await makeInvite()
      expect(token.length).toBeGreaterThanOrEqual(32)
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
      const rows = await s.prisma.$queryRawUnsafe<Array<{ j: string }>>(`SELECT row_to_json(t)::text AS j FROM "CoachInvite" t`)
      expect(rows.length).toBeGreaterThan(0)
      for (const r of rows) expect(r.j).not.toContain(token)
      const listed = JSON.stringify(await (await linksLib()).listCoaching(s.prisma, s.dustin))
      expect(listed).not.toContain(token)
      expect(listed).not.toMatch(/tokenHash/)
    })
  })

  Scenario('Revoke an invite', ({ When, Then }) => {
    When('Dustin revokes an unused invite', async () => {
      await makeInvite()
      await renderCoachingPage(s.dustin)
      await tapAndConfirm(rowOf(/expires/i), /^revoke/i, String(s.inviteId))
      await waitFor(async () => expect((await inviteRow()).revokedAt).not.toBeNull())
    })
    Then('the link shows "This invite is no longer valid"', async () => {
      await makeInvite()
      await (await invites()).revokeInvite(s.prisma, s.dustin, String(s.inviteId))
      await renderInvitePage(String(s.token), s.sam)
      expect(await screen.findByText(NO_LONGER_VALID)).toBeTruthy()
      expect(screen.queryByRole('button', { name: /^accept/i })).toBeNull()
      expect((await postAccept(String(s.token))).status).toBeGreaterThanOrEqual(400)
      expect(await links()).toHaveLength(0)
    })
  })

  Scenario('Invalid invites', ({ Then, And }) => {
    Then('an expired, revoked, already used or unknown invite shows "This invite is no longer valid"', async () => {
      const lib = await invites()
      const expired = await lib.createInvite(s.prisma, s.dustin)
      await model('coachInvite').update({ where: { id: expired.id }, data: { expiresAt: new Date(Date.now() - 1000) } })
      const revoked = await lib.createInvite(s.prisma, s.dustin)
      await lib.revokeInvite(s.prisma, s.dustin, revoked.id)
      const used = await lib.createInvite(s.prisma, s.dustin)
      await lib.acceptInvite(s.prisma, used.token, s.alex)
      for (const token of [expired.token, revoked.token, used.token, 'no-such-token-0000000000000000000000']) {
        expect(await statusOf(token, s.sam), token).toBe('invalid')
        await renderInvitePage(token, s.sam)
        expect(await screen.findByText(NO_LONGER_VALID)).toBeTruthy()
      }
    })
    And('Dustin opening his own invite shows "You can\'t coach yourself"', async () => {
      await makeInvite()
      expect(await statusOf(String(s.token), s.dustin)).toBe('self')
      await renderInvitePage(String(s.token), s.dustin)
      expect(await screen.findByText(SELF)).toBeTruthy()
      expect(screen.queryByRole('button', { name: /^accept/i })).toBeNull()
      signIn(s.dustin)
      const res = await postAccept(String(s.token))
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.body.code).toBe('self')
      expect((await links()).filter((l) => l.traineeUserId === s.dustin)).toHaveLength(0)
      expect((await inviteRow()).usedAt).toBeNull()
    })
  })

  // Accepting ------------------------------------------------------------------
  Scenario('Accept while signed in', ({ Given, When, Then }) => {
    Given('Sam is signed in', async () => {
      await makeInvite()
      signIn(s.sam)
    })
    When("Sam opens Dustin's invite", async () => {
      await renderInvitePage(String(s.token), s.sam)
      await screen.findByText(/Dustin wants to coach you/)
    })
    Then(
      'Sam sees "Dustin wants to coach you", what Dustin will see ("only what they send you and whether you accept it"), and Accept / No thanks',
      async () => {
        await renderInvitePage(String(s.token), s.sam)
        expect(await screen.findByText(/Dustin wants to coach you/)).toBeTruthy()
        expect(bodyText()).toContain('only what they send you and whether you accept it')
        expect(screen.getByRole('button', { name: /^accept/i })).toBeTruthy()
        expect(screen.getByRole('button', { name: /no thanks/i })).toBeTruthy()
        fireEvent.click(screen.getByRole('button', { name: /no thanks/i }))
        await new Promise((r) => setTimeout(r, 50))
        expect(await links()).toHaveLength(0)
        expect((await inviteRow()).usedAt).toBeNull()
      }
    )
    When('Sam taps Accept', async () => {
      await renderInvitePage(String(s.token), s.sam)
      fireEvent.click(await screen.findByRole('button', { name: /^accept/i }))
      await waitFor(async () => expect(await activeLinks()).toHaveLength(1))
    })
    Then('Sam and Dustin are linked and the invite is used', async () => {
      const [l] = await activeLinks()
      expect(l.coachUserId).toBe(s.dustin)
      expect(l.traineeUserId).toBe(s.sam)
      expect((await inviteRow()).usedAt).not.toBeNull()
      expect(await statusOf(String(s.token), s.alex)).toBe('invalid')
    })
  })

  Scenario('Accept after signing up', ({ Given, When, Then }) => {
    let onboardingUrl = ''
    Given('Sam has no account', async () => {
      await makeInvite()
      signIn('')
    })
    When('Sam opens the invite, signs up and finishes onboarding', async () => {
      const href = await followAuthLink(/sign up|create account/i)
      routedFetch()
      await renderAuthPage('signup', href)
      await submitSignup()
      expect(landedPath(), 'sign-up still goes to onboarding first').toBe('/onboarding')
      onboardingUrl = String(landed())
    })
    Then('Sam is brought back to the invite to accept it', async () => {
      expect(await finishOnboarding(onboardingUrl)).toBe(`/coach/invite/${s.token}`)
    })
  })

  Scenario('Accept after signing in', ({ Given, When, Then }) => {
    let href = ''
    Given('Sam has an account but is signed out', async () => {
      await makeInvite()
      signIn('')
    })
    When('Sam opens the invite and signs in', async () => {
      href = await followAuthLink(/sign in|log in/i)
      routedFetch()
      await renderAuthPage('login', href)
      await submitLogin()
    })
    Then('Sam is brought back to the invite to accept it', async () => {
      expect(landedPath()).toBe(`/coach/invite/${s.token}`)
      // The same through Google: OAuth lands on its callbackURL, then onboarding sends an onboarded user on.
      await followAuthLink(/sign in|log in/i)
      routedFetch()
      await renderAuthPage('login', href)
      fireEvent.click(screen.getByRole('button', { name: /google/i }))
      await waitFor(() => expect(authClient.social).toHaveBeenCalled())
      const callback = String((authClient.social.mock.calls.at(-1) as unknown as [{ callbackURL: string }])[0].callbackURL)
      const u = new URL(callback, 'http://localhost')
      if (u.pathname === '/onboarding') expect(await finishOnboarding(`${u.pathname}${u.search}`, true)).toBe(`/coach/invite/${s.token}`)
      else expect(u.pathname).toBe(`/coach/invite/${s.token}`)
    })
  })

  Scenario('Already linked', ({ Given, When, Then }) => {
    Given('Sam is already linked to Dustin', async () => {
      await link()
    })
    When('Sam opens a new invite from Dustin', async () => {
      await makeInvite()
      await renderInvitePage(String(s.token), s.sam)
    })
    Then('it says they are already linked, and the invite stays unused', async () => {
      await renderInvitePage(String(s.token), s.sam)
      expect(await screen.findByText(/already linked/i)).toBeTruthy()
      expect(screen.queryByRole('button', { name: /^accept/i })).toBeNull()
      signIn(s.sam)
      const res = await postAccept(String(s.token))
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.body.code).toBe('already_linked')
      expect(await activeLinks()).toHaveLength(1)
      expect((await inviteRow()).usedAt).toBeNull()
    })
  })

  // Coaching page --------------------------------------------------------------
  Scenario("Coach's view", ({ Then }) => {
    // work 138: step text follows the amended feature (lead, 2026-11-06).
    Then("Settings → Coaching (a row in the Account block) lists Dustin's open invites (expiry, Revoke) and his trainees (name, linked date, End)", async () => {
      await link()
      await makeInvite()
      const old = await (await invites()).createInvite(s.prisma, s.dustin)
      await model('coachInvite').update({ where: { id: old.id }, data: { expiresAt: new Date(Date.now() - 1000) } })
      await renderCoachingPage(s.dustin)
      const invitesShown = screen.getAllByRole('button', { name: /^revoke/i })
      expect(invitesShown, 'one open invite (the used and the expired ones are not listed)').toHaveLength(1)
      const row = rowOf('Sam')
      expect(within(row).getByRole('button', { name: /^end/i })).toBeTruthy()
      const year = String(new Date().getFullYear())
      expect(row.textContent ?? '').toMatch(new RegExp(`${year}|today|${new Date().toLocaleString('en-US', { month: 'short' })}`, 'i'))
      expect(bodyText()).not.toMatch(/Your coach/i)
    })
  })

  Scenario("Trainee's view", ({ Then }) => {
    Then('Sam\'s Settings → Coaching lists "Your coach: Dustin" with End', async () => {
      await link()
      await renderCoachingPage(s.sam)
      expect(bodyText()).toMatch(/Your coach:\s*Dustin/)
      const row = rowOf(/Dustin/)
      expect(within(row).getByRole('button', { name: /^end/i })).toBeTruthy()
      expect(screen.queryAllByRole('button', { name: /^revoke/i })).toHaveLength(0)
    })
  })

  Scenario('End the link', ({ When, Then, And }) => {
    When('either side taps End and confirms', async () => {
      // Trainee ends one link through the page; the coach ends another.
      s.linkId = await link()
      s.proposalId = await coachSentProposal(s.sam, s.linkId)
      await renderCoachingPage(s.sam)
      await tapAndConfirm(rowOf(/Dustin/), /^end/i, String(s.linkId), true)
      await waitFor(async () => expect(await activeLinks()).toHaveLength(0))
      const ended = (await links())[0]
      expect(ended.endedBy).toBe(s.sam)
      const alexLink = await link(s.dustin, s.alex)
      signIn(s.dustin)
      expect((await deleteLink(alexLink)).status).toBe(200)
      expect((await links()).find((l) => l.id === alexLink)?.endedBy).toBe(s.dustin)
    })
    Then('the link ends for both, and neither sees the other on Coaching', async () => {
      s.linkId = await link()
      await (await linksLib()).endLink(s.prisma, s.dustin, s.linkId)
      const lib = await linksLib()
      expect((await lib.listCoaching(s.prisma, s.dustin)).trainees).toHaveLength(0)
      expect((await lib.listCoaching(s.prisma, s.sam)).coaches).toHaveLength(0)
      await renderCoachingPage(s.dustin)
      expect(screen.queryByText('Sam')).toBeNull()
      await renderCoachingPage(s.sam)
      expect(bodyText()).not.toMatch(/Your coach/i)
      expect(screen.queryByText(/Dustin/)).toBeNull()
      // Ended is not "already linked": a new invite works again.
      await makeInvite()
      expect(await statusOf(String(s.token), s.sam)).toBe('valid')
    })
    And('proposals already sent stay with Sam, pending ones included, for Sam to accept or decline', async () => {
      s.linkId = await link()
      s.proposalId = await coachSentProposal(s.sam, s.linkId)
      signIn(s.sam)
      expect((await deleteLink(s.linkId)).status).toBe(200)
      const p = await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId } })
      expect(p.status).toBe('pending')
      expect((p as unknown as Json).coachLinkId).toBe(s.linkId)
      const detailLib = (await load('@/lib/suggestions/detail')) as typeof import('@/lib/suggestions/detail')
      expect((await detailLib.listPendingSuggestions(s.sam)).map((x) => x.id)).toContain(s.proposalId)
    })
  })

  // Safety ---------------------------------------------------------------------
  Scenario('Scoped and rate limited', ({ Then, And }) => {
    Then('every coaching route requires sign-in and only touches links the user is part of', async () => {
      await makeInvite()
      const samLink = await link()
      signIn('')
      expect((await postInvite()).status).toBe(401)
      expect((await deleteInvite(String(s.inviteId))).status).toBe(401)
      expect((await postAccept(String(s.token))).status).toBe(401)
      expect((await deleteLink(samLink)).status).toBe(401)
      // Alex is not part of Dustin's invite or Dustin–Sam link.
      signIn(s.alex)
      expect((await deleteInvite(String(s.inviteId))).status).toBe(404)
      expect((await deleteLink(samLink)).status).toBe(404)
      expect((await deleteInvite('no-such-id')).status).toBe(404)
      expect((await deleteLink('no-such-id')).status).toBe(404)
      expect((await inviteRow()).revokedAt).toBeNull()
      expect(await activeLinks()).toHaveLength(1)
      await (await invites()).revokeInvite(s.prisma, s.alex, String(s.inviteId))
      await (await linksLib()).endLink(s.prisma, s.alex, samLink)
      expect((await inviteRow()).revokedAt).toBeNull()
      expect(await activeLinks()).toHaveLength(1)
      const alexView = await (await linksLib()).listCoaching(s.prisma, s.alex)
      expect([...alexView.invites, ...alexView.trainees, ...alexView.coaches]).toHaveLength(0)
    })
    And('making invites, accepting invites and ending links are rate limited and log errors', async () => {
      const { createInvite } = await invites()
      const inv = await createInvite(s.prisma, s.dustin)
      const ownLink = await link(s.dustin, s.alex)
      const actual = (await vi.importActual('@/lib/rate-limit')) as Record<string, unknown>
      const docs = readFileSync(path.resolve('docs/RATE_LIMITING.md'), 'utf8').split('\n')
      const calls: Array<[string, () => Promise<{ status: number }>, () => Promise<number>]> = [
        ['make invite', () => (signIn(s.dustin), postInvite()), async () => ((await model('coachInvite').findMany()) as Json[]).length],
        ['accept invite', () => (signIn(s.sam), postAccept(inv.token)), async () => (await activeLinks()).length],
        ['end link', () => (signIn(s.dustin), deleteLink(ownLink)), async () => (await activeLinks()).length],
      ]
      for (const [what, call, count] of calls) {
        rl.calls.length = 0
        rl.refuse = true
        const before = await count()
        expect((await call()).status, `${what} refused`).toBe(429)
        expect(await count(), `${what}: no change when refused`).toBe(before)
        expect(rl.calls.length, `${what} checks a limiter`).toBeGreaterThan(0)
        const name = rl.calls[0].name
        expect(actual[name], `${what}: ${name} is exported by lib/rate-limit.ts`).toBeTypeOf('function')
        expect(
          docs.some((line) => line.includes(name) && /coach/i.test(line)),
          `${what}: ${name} is in docs/RATE_LIMITING.md on a coaching line`
        ).toBe(true)
        rl.refuse = false
        boom.on = true
        log.error.mockClear()
        const res = await call()
        boom.on = false
        expect(res.status, `${what} on a database failure`).toBe(500)
        expect(log.error, `${what} logs the error`).toHaveBeenCalled()
      }
    })
  })

  Scenario('Phone width', ({ Then }) => {
    Then('Coaching and the invite page fit at 390px with 48px tap targets, in light, dark and E-INK', async () => {
      await link()
      await makeInvite()
      await renderCoachingPage(s.dustin)
      fireEvent.click(await screen.findByRole('button', { name: /invite a trainee/i }))
      await screen.findByText(/expires in 7 days/i)
      expectPhoneFriendly()
      await renderCoachingPage(s.sam)
      expectPhoneFriendly()
      const fresh = await (await invites()).createInvite(s.prisma, s.dustin)
      await renderInvitePage(fresh.token, s.alex)
      await screen.findByRole('button', { name: /^accept/i })
      expectPhoneFriendly()
      await renderInvitePage(fresh.token, null)
      await screen.findByRole('link', { name: /sign in|log in/i })
      expectPhoneFriendly()
    })
  })
// work 143: the two after-review-139 scenarios are tagged @work143 and covered by
// __tests__/app/coaching-names-and-waiver.test.tsx.
}, { excludeTags: ['work143'] })

// ---------------------------------------------------------------------------
// Edges the scenarios don't reach. Labels name the rule or the feared bug.
// ---------------------------------------------------------------------------
describe('Coaching edges', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  describe('invite lifecycle', () => {
    it('expiry: a minute before expiry is valid, a second after is invalid', async () => {
      const inv = await makeInvite()
      await model('coachInvite').update({ where: { id: inv.id }, data: { expiresAt: new Date(Date.now() + 60_000) } })
      expect(await statusOf(inv.token, s.sam)).toBe('valid')
      await model('coachInvite').update({ where: { id: inv.id }, data: { expiresAt: new Date(Date.now() - 1000) } })
      expect(await statusOf(inv.token, s.sam)).toBe('invalid')
      await (await invites()).acceptInvite(s.prisma, inv.token, s.sam)
      expect(await links()).toHaveLength(0)
    })

    it('reuse: a used invite is refused for a second trainee', async () => {
      const inv = await makeInvite()
      await (await invites()).acceptInvite(s.prisma, inv.token, s.sam)
      signIn(s.alex)
      const res = await postAccept(inv.token)
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.body.code).toBe('invalid')
      expect(await links()).toHaveLength(1)
    })

    it('reuse race: two accepts at once make one link', async () => {
      const inv = await makeInvite()
      const lib = await invites()
      await Promise.allSettled([lib.acceptInvite(s.prisma, inv.token, s.sam), lib.acceptInvite(s.prisma, inv.token, s.alex)])
      expect(await links()).toHaveLength(1)
    })

    it('revoke: revoked through the route, then refused', async () => {
      const inv = await makeInvite()
      expect((await deleteInvite(inv.id)).status).toBe(200)
      expect((await inviteRow()).revokedAt).not.toBeNull()
      signIn(s.sam)
      expect((await postAccept(inv.token)).body.code).toBe('invalid')
    })

    it('unknown and empty tokens are invalid, not errors', async () => {
      await makeInvite()
      expect(await statusOf('x', s.sam)).toBe('invalid')
      signIn(s.sam)
      const res = await postAccept('')
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
      expect(await links()).toHaveLength(0)
    })

    it('signed out: a valid invite reads valid with the coach name', async () => {
      const inv = await makeInvite()
      const out = await (await invites()).getInvite(s.prisma, inv.token, null)
      expect(out.status).toBe('valid')
      expect(out.coachName).toBe('Dustin')
    })

    it('route: making an invite returns the token once, 201', async () => {
      const res = await postInvite()
      expect(res.status).toBe(201)
      const invite = res.body.invite as Json
      expect(typeof invite.token).toBe('string')
      expect(await statusOf(String(invite.token), s.sam)).toBe('valid')
    })

    it('route: accepting a valid invite links the signed-in user, not someone named in the body', async () => {
      const inv = await makeInvite()
      signIn(s.sam)
      const res = await (await acceptRoute()).POST(
        req('/api/coaching/invites/accept', 'POST', { token: inv.token, traineeUserId: s.alex, userId: s.alex })
      )
      expect(res.status).toBeLessThan(300)
      const [l] = await activeLinks()
      expect(l.traineeUserId).toBe(s.sam)
    })
  })

  describe('listing', () => {
    it('open invites: used, revoked and expired ones are not listed; another coach\'s never', async () => {
      const lib = await invites()
      const open = await lib.createInvite(s.prisma, s.dustin)
      const used = await lib.createInvite(s.prisma, s.dustin)
      await lib.acceptInvite(s.prisma, used.token, s.sam)
      const revoked = await lib.createInvite(s.prisma, s.dustin)
      await lib.revokeInvite(s.prisma, s.dustin, revoked.id)
      const expired = await lib.createInvite(s.prisma, s.dustin)
      await model('coachInvite').update({ where: { id: expired.id }, data: { expiresAt: new Date(Date.now() - 1000) } })
      await lib.createInvite(s.prisma, s.alex)
      const view = await (await linksLib()).listCoaching(s.prisma, s.dustin)
      expect(view.invites.map((i) => i.id)).toEqual([open.id])
    })

    it('trainees and coaches carry the other side\'s display name', async () => {
      await link()
      await link(s.alex, s.dustin)
      const view = await (await linksLib()).listCoaching(s.prisma, s.dustin)
      expect(view.trainees.map((t) => t.name)).toEqual(['Sam'])
      expect(view.coaches.map((c) => c.name)).toEqual(['Alex'])
      expect(view.trainees[0].linkId).toBeTruthy()
      expect(new Date(String(view.trainees[0].linkedAt)).getTime()).toBeGreaterThan(Date.now() - 60_000)
    })
  })

  describe('ending', () => {
    it('ending twice is harmless and keeps the first endedAt', async () => {
      const id = await link()
      const lib = await linksLib()
      await lib.endLink(s.prisma, s.sam, id)
      const first = (await links())[0].endedAt
      await lib.endLink(s.prisma, s.dustin, id)
      expect((await links())[0].endedAt).toEqual(first)
      expect((await links())[0].endedBy).toBe(s.sam)
    })

    it('ending one trainee leaves the coach\'s other trainees linked', async () => {
      const samLink = await link()
      await link(s.dustin, s.alex)
      await (await linksLib()).endLink(s.prisma, s.dustin, samLink)
      const view = await (await linksLib()).listCoaching(s.prisma, s.dustin)
      expect(view.trainees.map((t) => t.name)).toEqual(['Alex'])
    })
  })

  describe('pages and routing', () => {
    it('the Coaching page needs sign-in', async () => {
      signIn('')
      const mod = (await load('@/app/(app)/settings/coaching/page')) as { default: () => Promise<ReactElement> }
      await expect(mod.default()).rejects.toThrow(/NEXT_REDIRECT \/login/)
    })

    it('Settings has a Coaching row in the Account block', async () => {
      const mod = (await load('@/app/(app)/settings/page')) as { default: () => Promise<ReactElement> }
      routedFetch()
      render(await mod.default())
      const account = screen.getByRole('region', { name: 'Account' })
      const row = within(account).getByRole('link', { name: /^coaching/i })
      expect(row.getAttribute('href')).toBe('/settings/coaching')
      expect(screen.getAllByRole('link', { name: /^coaching/i })).toHaveLength(1)
    })
  })

  describe('return path', () => {
    it.each(['//evil.com', 'https://evil.com/x', '/\\evil.com', 'javascript:alert(1)'])(
      'login ignores ?next=%s and goes home',
      async (next) => {
        await renderAuthPage('login', `/login?next=${encodeURIComponent(next)}`)
        await submitLogin()
        expect(landed()).toBe('/')
      }
    )

    it('onboarding ignores an off-site ?next= and goes home', async () => {
      expect(await finishOnboarding(`/onboarding?next=${encodeURIComponent('//evil.com')}`)).toBe('/')
    })

    it('a plain sign-in with no return path still goes home', async () => {
      await renderAuthPage('login', '/login')
      await submitLogin()
      expect(landed()).toBe('/')
    })

    it('a plain sign-up with no return path still goes to onboarding, then home', async () => {
      await renderAuthPage('signup', '/signup')
      await submitSignup()
      expect(landedPath()).toBe('/onboarding')
      expect(await finishOnboarding(String(landed()))).toBe('/')
    })
  })
})
