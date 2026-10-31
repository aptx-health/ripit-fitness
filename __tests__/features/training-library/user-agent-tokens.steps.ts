/**
 * Step definitions for features/training-library/user-agent-tokens.feature.
 * Codes strictly against initiatives/training-library/docs/spec.md
 * ("TL5b User agent tokens and scoped notifications").
 *
 * Seams (all new unless marked; names are the contract):
 *
 *   app/api/agent-tokens/route.ts   GET, POST  (signed-in user, own tokens only)
 *     GET  200 { tokens: [{ id, name, createdAt, revokedAt }] } newest first,
 *          exactly those four keys (never the hash, the secret or lastUsedAt).
 *     POST { name } -> 201 { token: { id, name, createdAt }, secret }; `secret`
 *          is the plain token (prefix ripit_at_), returned only here.
 *          name: a string, trimmed, 1-50 characters, else 400. At 5 active
 *          (unrevoked) tokens: 409 { code: 'TOKEN_LIMIT' }. Revoked tokens free
 *          a slot; other users' tokens never count.
 *   app/api/agent-tokens/[id]/route.ts   DELETE
 *     200 { token } (the safe four-key shape, revokedAt set). Revoking twice is
 *     fine. Another user's or an unknown id: 404. Reuses revokeAgentToken.
 *     Every route: 401 with no user; 429 when the (mocked) limiter refuses.
 *     The admin routes under /api/admin/agent-tokens stay as they are.
 *
 *   lib/mcp/tools.ts   (existing)
 *     ToolContext gains `role: string` (the token owner's role, 'admin' or
 *       another). listTools(role) hides propose_exercise_create and
 *       propose_exercise_update from non-admins. callTool refuses those two for a
 *       non-admin with isError and payload { error: 'Exercise library changes are
 *       admin-only.', code: 'forbidden' }: no proposal, no notification.
 *       Every other tool works for every role. A proposal notifies (ctx.notify)
 *       only when ctx.role is 'admin'; a non-admin's never does.
 *   app/api/mcp/route.ts   (existing)
 *     resolves the token owner's role (BetterAuth table "user", columns id and
 *     role; no row means 'user') and builds that context, so tools/list and
 *     tools/call follow the role, and the module-level notify is skipped for
 *     non-admins. The tests below create that table in the test database.
 *
 *   components/features/agent-access/AgentAccess.tsx   default export,
 *     props { mcpUrl: string }, see the Agent access describe at the end.
 *
 * vitest-cucumber runs every step as its own test and Testing Library cleans
 * up between tests, so UI scenarios render in a helper called from each step.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextRequest } from 'next/server'
import { type ComponentType, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const auth = vi.hoisted(() => ({ userId: '' }))
const rl = vi.hoisted(() => ({ refuse: false }))
const sent = vi.hoisted(() => ({ notify: vi.fn(async () => {}) }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    auth.userId ? { user: { id: auth.userId, role: 'user' }, error: null } : { user: null, error: null },
}))
vi.mock(
  '@/lib/rate-limit',
  () =>
    new Proxy(
      {},
      {
        has: () => true,
        get: (_t, key) => {
          if (key === 'checkRateLimit')
            return async () => (rl.refuse ? new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }) : null)
          if (key === 'checkRateLimitWithHeaders')
            return async () => ({
              response: rl.refuse ? new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }) : null,
              headers: {},
            })
          if (key === 'then' || key === '__esModule') return undefined
          return {}
        },
      }
    )
)
vi.mock('@/lib/events', () => ({ recordEvent: () => {} }))
vi.mock('@/lib/notify', () => ({ notify: sent.notify }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/settings/agent-access',
  useSearchParams: () => new URLSearchParams(),
}))

const feature = await loadFeature('features/training-library/user-agent-tokens.feature')

// ---------------------------------------------------------------------------
const load = (spec: string) => import(/* @vite-ignore */ spec)
type Json = Record<string, unknown>

interface State {
  prisma: PrismaClient
  userId: string
  otherUserId: string
  adminId: string
  bench: { id: string }
  secrets: Record<string, string>
  last?: { status: number; body: Json }
  notified?: number
  fetched: Array<{ url: string; method: string }>
}
let s: State
const MCP_URL = 'https://ripit.test/api/mcp'
const MIN = 60_000
const ago = (m: number) => new Date(Date.now() - m * MIN)

async function freshState(): Promise<State> {
  const db = await getTestDatabase()
  await db.reset()
  const prisma = db.getPrismaClient()
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "user" (id text PRIMARY KEY, role text, email text)')
  const user = await createTestUser()
  const other = await createTestUser()
  const admin = await createTestUser()
  await prisma.$executeRaw`INSERT INTO "user" (id, role, email) VALUES (${user.id}, 'user', 'u@x.test'), (${other.id}, 'user', 'o@x.test'), (${admin.id}, 'admin', 'a@x.test')`
  auth.userId = user.id
  const bench = await createTestExerciseDefinition(prisma, { name: 'Barbell Bench Press' })
  return { prisma, userId: user.id, otherUserId: other.id, adminId: admin.id, bench, secrets: {}, fetched: [] }
}

// --- routes ---------------------------------------------------------------
type Ctx = { params: Promise<{ id: string }> }
async function listRoute() {
  return (await load('@/app/api/agent-tokens/route')) as { GET: (r: NextRequest) => Promise<Response>; POST: (r: NextRequest) => Promise<Response> }
}
async function idRoute() {
  return (await load('@/app/api/agent-tokens/[id]/route')) as { DELETE: (r: NextRequest, c: Ctx) => Promise<Response> }
}
async function result(res: Response) {
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Json }
}
async function listTokens(userId = s.userId) {
  auth.userId = userId
  const res = await (await listRoute()).GET(new NextRequest('http://localhost/api/agent-tokens'))
  auth.userId = s.userId
  return result(res)
}
async function createToken(name: unknown, userId = s.userId, raw?: string) {
  auth.userId = userId
  const body = raw ?? JSON.stringify({ name })
  const res = await (await listRoute()).POST(
    new NextRequest('http://localhost/api/agent-tokens', { method: 'POST', headers: { 'content-type': 'application/json' }, body })
  )
  auth.userId = s.userId
  const out = await result(res)
  const secret = out.body.secret
  if (res.status === 201 && typeof secret === 'string' && typeof name === 'string') s.secrets[name.trim()] = secret
  return out
}
async function revokeToken(id: string, userId = s.userId) {
  auth.userId = userId
  const res = await (await idRoute()).DELETE(new NextRequest(`http://localhost/api/agent-tokens/${id}`, { method: 'DELETE' }), {
    params: Promise.resolve({ id }),
  })
  auth.userId = s.userId
  return result(res)
}
const idOf = async (name: string, userId = s.userId) =>
  (await s.prisma.agentToken.findFirstOrThrow({ where: { userId, name }, orderBy: { createdAt: 'desc' } })).id
const revokedAt = async (id: string) => (await s.prisma.agentToken.findUniqueOrThrow({ where: { id } })).revokedAt

async function seedActive(userId: string, n: number, prefix = 'T') {
  const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
  const out = []
  for (let i = 1; i <= n; i++) out.push(await createAgentToken(s.prisma, userId, `${prefix}${i}`))
  return out
}

// --- MCP --------------------------------------------------------------------
async function mcp(bearer: string | null, method: string, params: Json = {}) {
  const mod = (await load('@/app/api/mcp/route')) as { POST: (r: Request) => Promise<Response> }
  const res = await mod.POST(
    new Request(MCP_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })
  )
  const body = (await res.json().catch(() => ({}))) as { result?: { tools?: Array<{ name: string }>; content?: Array<{ text: string }>; isError?: boolean } }
  return { status: res.status, body }
}
const toolNames = (r: Awaited<ReturnType<typeof mcp>>) => (r.body.result?.tools ?? []).map((t) => t.name)
const callPayload = (r: Awaited<ReturnType<typeof mcp>>) => {
  const text = r.body.result?.content?.[0]?.text
  try {
    return JSON.parse(text ?? '{}') as Json
  } catch {
    return { raw: text } as Json
  }
}
const EXERCISE_TOOLS = ['propose_exercise_create', 'propose_exercise_update']
const WORKOUT_ARGS = () => ({
  name: 'Push day',
  exercises: [{ exerciseDefinitionId: s.bench.id, sets: [{ reps: '8' }] }],
  rationale: 'Your pressing volume is low',
})
const EXERCISE_ARGS = () => ({
  definition: { name: 'Larsen Press', equipment: ['barbell'], primaryFAUs: ['chest'], secondaryFAUs: ['triceps'] },
  rationale: 'A bench variation',
})

// --- UI ----------------------------------------------------------------------
/** fetch that runs the real token routes. */
function routedFetch() {
  s.fetched.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: { method?: string; body?: string }) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      s.fetched.push({ url, method })
      const done = (res: Response) => ({ ok: res.ok, status: res.status, json: () => res.json() })
      if (url === '/api/agent-tokens' && method === 'GET') return done(await (await listRoute()).GET(new NextRequest(`http://localhost${url}`)))
      if (url === '/api/agent-tokens' && method === 'POST')
        return done(
          await (await listRoute()).POST(
            new NextRequest(`http://localhost${url}`, { method, headers: { 'content-type': 'application/json' }, body: init?.body })
          )
        )
      const del = /^\/api\/agent-tokens\/([^/]+)$/.exec(url)?.[1]
      if (del && method === 'DELETE')
        return done(await (await idRoute()).DELETE(new NextRequest(`http://localhost${url}`, { method }), { params: Promise.resolve({ id: del }) }))
      return { ok: true, status: 200, json: async () => ({}) }
    })
  )
}
async function renderPage() {
  cleanup()
  routedFetch()
  const mod = (await load('@/components/features/agent-access/AgentAccess')) as { default: ComponentType<{ mcpUrl: string }> }
  return render(createElement(mod.default, { mcpUrl: MCP_URL }))
}
const nameBox = () => screen.getByRole('textbox', { name: /name/i }) as HTMLInputElement
const createButton = () => screen.getByRole('button', { name: /^create/i }) as HTMLButtonElement
async function createViaUi(name: string) {
  fireEvent.change(nameBox(), { target: { value: name } })
  fireEvent.click(createButton())
  await waitFor(() => expect(s.fetched.some((c) => c.method === 'POST')).toBe(true))
  await screen.findByText(/copy it now/i)
}
const secretShown = (secret: string) => !!(screen.queryByDisplayValue(secret) ?? screen.queryByText(secret))
const rowOf = (name: string) => screen.getByText(name).closest('li') as HTMLElement

beforeEach(() => {
  rl.refuse = false
  sent.notify.mockClear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------
describeFeature(feature, ({ Rule }) => {
  Rule('Users manage their own tokens', ({ RuleScenario }) => {
    RuleScenario('Creating a token shows it once', ({ When, Then, And }) => {
      When('a user creates an agent token named "Hermes"', async () => {
        s = await freshState()
        await renderPage()
        await screen.findByRole('textbox', { name: /name/i })
        await createViaUi('Hermes')
        s.secrets.Hermes = (screen.queryByDisplayValue(/^ripit_at_/) as HTMLInputElement | null)?.value ?? screen.getByText(/^ripit_at_/).textContent ?? ''
      })
      Then('the token is shown once to copy', async () => {
        await renderPage()
        await screen.findByRole('textbox', { name: /name/i })
        await createViaUi('Hermes copy')
        expect(screen.getByText(/copy it now; you won't see it again/i)).toBeTruthy()
        expect(screen.getByDisplayValue(/^ripit_at_/) ?? screen.getByText(/^ripit_at_/)).toBeTruthy()
        expect(s.secrets.Hermes).toMatch(/^ripit_at_/)
      })
      And('"Hermes" is listed in Agent access', async () => {
        await renderPage()
        expect(await screen.findByText('Hermes')).toBeTruthy()
        const rows = (await listTokens()).body.tokens as Array<{ name: string }>
        expect(rows.map((r) => r.name)).toContain('Hermes')
      })
      And('reloading the page no longer shows the token', async () => {
        await renderPage()
        await screen.findByText('Hermes')
        expect(secretShown(s.secrets.Hermes)).toBe(false)
        expect(screen.queryByText(/copy it now/i)).toBeNull()
        expect(screen.queryByDisplayValue(/^ripit_at_/)).toBeNull()
      })
    })

    RuleScenario('A token lets the agent in', ({ Given, When, Then }) => {
      Given('a user created an agent token', async () => {
        s = await freshState()
        const out = await createToken('Hermes')
        expect(out.status).toBe(201)
      })
      When('their agent connects to the MCP server with it', async () => {
        s.last = { status: (await mcp(s.secrets.Hermes, 'tools/list')).status, body: {} }
      })
      Then('it can read that user\'s training data', async () => {
        expect(s.last?.status).toBe(200)
        const call = await mcp(s.secrets.Hermes, 'tools/call', { name: 'get_anchors', arguments: {} })
        expect(call.status).toBe(200)
        expect(call.body.result?.isError).not.toBe(true)
        const { resolveAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
        expect((await resolveAgentToken(s.prisma, s.secrets.Hermes))?.userId).toBe(s.userId)
      })
    })

    RuleScenario('Revoking a token', ({ Given, When, Then, And }) => {
      Given('a user has an agent token "Hermes"', async () => {
        s = await freshState()
        expect((await createToken('Hermes')).status).toBe(201)
      })
      When('they revoke "Hermes"', async () => {
        await renderPage()
        await screen.findByText('Hermes')
        fireEvent.click(within(rowOf('Hermes')).getByRole('button', { name: /^revoke/i }))
        const question = await screen.findByText('Revoke Hermes?')
        fireEvent.click(within(question.parentElement as HTMLElement).getByRole('button', { name: /^revoke$/i }))
        await waitFor(async () => expect(await revokedAt(await idOf('Hermes'))).not.toBeNull())
      })
      Then('"Hermes" is listed as revoked', async () => {
        await renderPage()
        await screen.findByText('Hermes')
        expect(within(rowOf('Hermes')).getByText(/revoked/i)).toBeTruthy()
        expect(within(rowOf('Hermes')).queryByRole('button', { name: /revoke/i })).toBeNull()
        const rows = (await listTokens()).body.tokens as Array<{ name: string; revokedAt: string | null }>
        expect(rows.find((r) => r.name === 'Hermes')?.revokedAt).not.toBeNull()
      })
      And('the agent can no longer connect with it', async () => {
        expect((await mcp(s.secrets.Hermes, 'tools/list')).status).toBe(401)
        const { resolveAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
        expect(await resolveAgentToken(s.prisma, s.secrets.Hermes)).toBeNull()
      })
    })

    RuleScenario('At most five active tokens', ({ Given, When, Then }) => {
      Given('a user has 5 active agent tokens', async () => {
        s = await freshState()
        for (const n of ['A', 'B', 'C', 'D', 'E']) expect((await createToken(n)).status).toBe(201)
      })
      When('they try to create another', async () => {
        s.last = await createToken('F')
      })
      Then('it is refused because of the limit', async () => {
        expect(s.last?.status).toBe(409)
        expect(s.last?.body.code).toBe('TOKEN_LIMIT')
        expect(await s.prisma.agentToken.count({ where: { userId: s.userId } })).toBe(5)
        await renderPage()
        await screen.findByText('A')
        expect(createButton().disabled).toBe(true)
      })
    })

    RuleScenario("Another user's token can't be revoked", ({ When, Then }) => {
      When("a user revokes another user's token", async () => {
        s = await freshState()
        const [theirs] = await seedActive(s.otherUserId, 1, 'Theirs')
        s.last = await revokeToken(theirs.record.id)
        s.secrets.theirsId = theirs.record.id
      })
      Then('it is not found', async () => {
        expect(s.last?.status).toBe(404)
        expect(await revokedAt(s.secrets.theirsId)).toBeNull()
      })
    })

    RuleScenario('The token itself is never listed', ({ Given, When, Then }) => {
      Given('a user has agent tokens', async () => {
        s = await freshState()
        await createToken('One')
        await createToken('Two')
      })
      When('their tokens are listed', async () => {
        s.last = await listTokens()
      })
      Then('no token value or hash is included', async () => {
        expect(s.last?.status).toBe(200)
        const tokens = s.last?.body.tokens as Array<Json>
        expect(tokens).toHaveLength(2)
        for (const t of tokens) expect(Object.keys(t).sort()).toEqual(['createdAt', 'id', 'name', 'revokedAt'])
        const text = JSON.stringify(s.last?.body)
        expect(text).not.toContain('ripit_at_')
        expect(text).not.toMatch(/tokenHash|hash/i)
        for (const secret of Object.values(s.secrets)) expect(text).not.toContain(secret)
      })
    })
  })

  Rule('Non-admin agents stay out of the exercise library', ({ RuleScenario }) => {
    RuleScenario('Exercise-library tools are hidden and refused', ({ Given, When, Then, And }) => {
      Given("a regular user's agent is connected", async () => {
        s = await freshState()
        expect((await createToken('Hermes')).status).toBe(201)
      })
      When('it lists the tools', async () => {
        s.last = { status: 200, body: { names: toolNames(await mcp(s.secrets.Hermes, 'tools/list')) } }
      })
      Then('the exercise-library propose tools are not listed', async () => {
        const names = s.last?.body.names as string[]
        expect(names.length).toBeGreaterThan(5)
        for (const t of EXERCISE_TOOLS) expect(names).not.toContain(t)
        expect(names).toContain('propose_workout_create')
        expect(names).toContain('get_anchors')
      })
      And('calling one is refused as admin-only', async () => {
        for (const [name, args] of [
          ['propose_exercise_create', EXERCISE_ARGS()],
          ['propose_exercise_update', { id: s.bench.id, changes: { notes: 'x' }, rationale: 'x' }],
        ] as const) {
          const r = await mcp(s.secrets.Hermes, 'tools/call', { name, arguments: args })
          expect(r.body.result?.isError).toBe(true)
          const payload = callPayload(r)
          expect(payload.code).toBe('forbidden')
          expect(payload.error).toBe('Exercise library changes are admin-only.')
        }
        s.notified = sent.notify.mock.calls.length
      })
      And('no proposal is created', async () => {
        expect(await s.prisma.proposal.count()).toBe(0)
        expect(s.notified).toBe(0)
      })
    })

    RuleScenario('Other suggestions work', ({ Given, When, Then }) => {
      Given("a regular user's agent is connected", async () => {
        s = await freshState()
        expect((await createToken('Hermes')).status).toBe(201)
      })
      When('it proposes a saved workout', async () => {
        const r = await mcp(s.secrets.Hermes, 'tools/call', { name: 'propose_workout_create', arguments: WORKOUT_ARGS() })
        expect(r.body.result?.isError).not.toBe(true)
      })
      Then('the user sees it as a suggestion', async () => {
        const mod = (await load('@/app/api/suggestions/route')) as { GET: (r?: NextRequest) => Promise<Response> }
        const res = await mod.GET(new NextRequest('http://localhost/api/suggestions'))
        const body = (await res.json()) as { suggestions: Array<{ summary: string }> }
        expect(body.suggestions).toHaveLength(1)
        expect(body.suggestions[0].summary).toContain('Push day')
      })
    })
  })

  Rule('Only admin proposals notify', ({ RuleScenario }) => {
    RuleScenario("A regular user's suggestion sends no notification", ({ Given, When, Then }) => {
      Given("a regular user's agent is connected", async () => {
        s = await freshState()
        expect((await createToken('Hermes')).status).toBe(201)
      })
      When('it proposes a saved workout', async () => {
        const r = await mcp(s.secrets.Hermes, 'tools/call', { name: 'propose_workout_create', arguments: WORKOUT_ARGS() })
        expect(r.body.result?.isError).not.toBe(true)
        s.notified = sent.notify.mock.calls.length
      })
      Then('no Discord or Bark notification is sent', async () => {
        expect(await s.prisma.proposal.count({ where: { userId: s.userId } })).toBe(1)
        expect(s.notified).toBe(0)
      })
    })

    RuleScenario("An admin's proposal still notifies", ({ Given, When, Then }) => {
      Given("an admin's agent is connected", async () => {
        s = await freshState()
        const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
        s.secrets.Admin = (await createAgentToken(s.prisma, s.adminId, 'Admin agent')).token
      })
      When('it proposes a saved workout', async () => {
        const r = await mcp(s.secrets.Admin, 'tools/call', { name: 'propose_workout_create', arguments: WORKOUT_ARGS() })
        expect(r.body.result?.isError).not.toBe(true)
        s.notified = sent.notify.mock.calls.length
      })
      Then('a notification is sent as before', async () => {
        expect(await s.prisma.proposal.count({ where: { userId: s.adminId } })).toBe(1)
        expect(s.notified).toBe(1)
      })
    })
  })
})

// ---------------------------------------------------------------------------
// Edges: the token routes
// ---------------------------------------------------------------------------
describe('agent tokens: POST /api/agent-tokens', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  it('creates a token: 201 with the safe token and the secret', async () => {
    const { status, body } = await createToken('Hermes')
    expect(status).toBe(201)
    expect(body.secret).toMatch(/^ripit_at_/)
    const token = body.token as Json
    expect(Object.keys(token).sort()).toEqual(['createdAt', 'id', 'name'])
    expect(token.name).toBe('Hermes')
    const row = await s.prisma.agentToken.findUniqueOrThrow({ where: { id: token.id as string } })
    expect(row.userId).toBe(s.userId)
    expect(row.revokedAt).toBeNull()
  })

  it('stores only the hash of the secret', async () => {
    const { body } = await createToken('Hermes')
    const { hashAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
    const row = await s.prisma.agentToken.findFirstOrThrow({ where: { userId: s.userId } })
    expect(row.tokenHash).toBe(hashAgentToken(body.secret as string))
    expect(JSON.stringify(row)).not.toContain(body.secret as string)
  })

  it('the secret is in the POST response only: never in the list, never in the response a second time', async () => {
    const { body } = await createToken('Hermes')
    const secret = body.secret as string
    expect(JSON.stringify((await listTokens()).body)).not.toContain(secret)
    expect(JSON.stringify(body.token)).not.toContain(secret)
    expect(JSON.stringify(body)).not.toMatch(/tokenHash/i)
  })

  it('the new secret works at once, for its owner', async () => {
    const { body } = await createToken('Hermes')
    const { resolveAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
    expect(await resolveAgentToken(s.prisma, body.secret as string)).toMatchObject({ userId: s.userId })
  })

  it('trims the name', async () => {
    const { status, body } = await createToken('  Hermes  ')
    expect(status).toBe(201)
    expect((body.token as Json).name).toBe('Hermes')
  })

  it('accepts a 50-character name', async () => {
    expect((await createToken('x'.repeat(50))).status).toBe(201)
  })

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['51 characters', 'x'.repeat(51)],
    ['51 characters after trimming', ` ${'x'.repeat(51)} `],
    ['a number', 7],
    ['null', null],
    ['an object', {}],
  ])('a bad name (%s) is 400 and creates nothing', async (_n, name) => {
    const { status } = await createToken(name)
    expect(status).toBe(400)
    expect(await s.prisma.agentToken.count()).toBe(0)
  })

  it('a missing name, an empty body and invalid JSON are 400', async () => {
    expect((await createToken(undefined, s.userId, '{}')).status).toBe(400)
    expect((await createToken(undefined, s.userId, '')).status).toBe(400)
    expect((await createToken(undefined, s.userId, 'not json')).status).toBe(400)
    expect(await s.prisma.agentToken.count()).toBe(0)
  })

  it('the sixth active token is 409 TOKEN_LIMIT and creates nothing', async () => {
    await seedActive(s.userId, 5)
    const { status, body } = await createToken('Sixth')
    expect([status, body.code]).toEqual([409, 'TOKEN_LIMIT'])
    expect(await s.prisma.agentToken.count({ where: { userId: s.userId } })).toBe(5)
    expect(body.secret).toBeUndefined()
  })

  it('the fifth is allowed', async () => {
    await seedActive(s.userId, 4)
    expect((await createToken('Fifth')).status).toBe(201)
  })

  it('revoked tokens do not count toward the limit', async () => {
    const tokens = await seedActive(s.userId, 5)
    expect((await createToken('Blocked')).status).toBe(409)
    expect((await revokeToken(tokens[0].record.id)).status).toBe(200)
    expect((await createToken('Fits')).status).toBe(201)
    expect(await s.prisma.agentToken.count({ where: { userId: s.userId } })).toBe(6)
    expect((await createToken('Blocked again')).status).toBe(409)
  })

  it('five active plus several revoked is still blocked', async () => {
    const tokens = await seedActive(s.userId, 8)
    for (const t of tokens.slice(0, 3)) await revokeToken(t.record.id)
    expect((await createToken('Over')).status).toBe(409)
  })

  it("another user's tokens do not count", async () => {
    await seedActive(s.otherUserId, 5, 'Theirs')
    expect((await createToken('Mine')).status).toBe(201)
  })

  it('needs a signed-in user', async () => {
    auth.userId = ''
    const res = await (await listRoute()).POST(
      new NextRequest('http://localhost/api/agent-tokens', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"name":"x"}' })
    )
    auth.userId = s.userId
    expect(res.status).toBe(401)
    expect(await s.prisma.agentToken.count()).toBe(0)
  })

  it('a refusing limiter gives 429 and creates nothing', async () => {
    rl.refuse = true
    expect((await createToken('Hermes')).status).toBe(429)
    expect(await s.prisma.agentToken.count()).toBe(0)
  })
})

describe('agent tokens: GET /api/agent-tokens', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  it('lists only the user\'s own tokens, newest first, with exactly four keys', async () => {
    const [a, b, c] = await seedActive(s.userId, 3)
    await s.prisma.agentToken.update({ where: { id: a.record.id }, data: { createdAt: ago(30) } })
    await s.prisma.agentToken.update({ where: { id: b.record.id }, data: { createdAt: ago(10) } })
    await s.prisma.agentToken.update({ where: { id: c.record.id }, data: { createdAt: ago(20) } })
    await seedActive(s.otherUserId, 2, 'Theirs')
    const { status, body } = await listTokens()
    expect(status).toBe(200)
    const tokens = body.tokens as Array<Json>
    expect(tokens.map((t) => t.id)).toEqual([b.record.id, c.record.id, a.record.id])
    for (const t of tokens) expect(Object.keys(t).sort()).toEqual(['createdAt', 'id', 'name', 'revokedAt'])
    expect(tokens.every((t) => t.revokedAt === null)).toBe(true)
  })

  it('shows revoked tokens with their revokedAt', async () => {
    const [a] = await seedActive(s.userId, 1)
    await revokeToken(a.record.id)
    const tokens = (await listTokens()).body.tokens as Array<{ revokedAt: string | null }>
    expect(tokens[0].revokedAt).not.toBeNull()
  })

  it('is an empty list for a user with none', async () => {
    expect((await listTokens()).body.tokens).toEqual([])
  })

  it('needs a signed-in user, and a refusing limiter gives 429', async () => {
    auth.userId = ''
    expect((await (await listRoute()).GET(new NextRequest('http://localhost/api/agent-tokens'))).status).toBe(401)
    auth.userId = s.userId
    rl.refuse = true
    expect((await listTokens()).status).toBe(429)
  })
})

describe('agent tokens: DELETE /api/agent-tokens/[id]', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  it('revokes the token and answers { token }', async () => {
    const [a] = await seedActive(s.userId, 1)
    const { status, body } = await revokeToken(a.record.id)
    expect(status).toBe(200)
    const token = body.token as Json
    expect(token.id).toBe(a.record.id)
    expect(token.revokedAt).not.toBeNull()
    expect(Object.keys(token).sort()).toEqual(['createdAt', 'id', 'name', 'revokedAt'])
    expect(await revokedAt(a.record.id)).not.toBeNull()
  })

  it('revoking twice is fine and keeps the first revokedAt', async () => {
    const [a] = await seedActive(s.userId, 1)
    await revokeToken(a.record.id)
    const first = await revokedAt(a.record.id)
    const again = await revokeToken(a.record.id)
    expect(again.status).toBe(200)
    expect((await revokedAt(a.record.id))?.getTime()).toBe(first?.getTime())
  })

  it('a revoked token can no longer be resolved, others still can', async () => {
    const [a, b] = await seedActive(s.userId, 2)
    const { resolveAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
    expect(await resolveAgentToken(s.prisma, a.token)).not.toBeNull()
    await revokeToken(a.record.id)
    expect(await resolveAgentToken(s.prisma, a.token)).toBeNull()
    expect(await resolveAgentToken(s.prisma, b.token)).not.toBeNull()
  })

  it('a revoked token is refused by the MCP server at once', async () => {
    const [a] = await seedActive(s.userId, 1)
    expect((await mcp(a.token, 'tools/list')).status).toBe(200)
    await revokeToken(a.record.id)
    expect((await mcp(a.token, 'tools/list')).status).toBe(401)
  })

  it('an unknown id is 404', async () => {
    expect((await revokeToken('does-not-exist')).status).toBe(404)
  })

  it("another user's token is 404 and stays active, even if already revoked or at the limit", async () => {
    const [theirs] = await seedActive(s.otherUserId, 1, 'Theirs')
    expect((await revokeToken(theirs.record.id)).status).toBe(404)
    expect(await revokedAt(theirs.record.id)).toBeNull()
    const { resolveAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
    expect(await resolveAgentToken(s.prisma, theirs.token)).not.toBeNull()
  })

  it('needs a signed-in user, and a refusing limiter gives 429 with nothing revoked', async () => {
    const [a] = await seedActive(s.userId, 1)
    auth.userId = ''
    const res = await (await idRoute()).DELETE(new NextRequest('http://localhost/x', { method: 'DELETE' }), { params: Promise.resolve({ id: a.record.id }) })
    auth.userId = s.userId
    expect(res.status).toBe(401)
    rl.refuse = true
    expect((await revokeToken(a.record.id)).status).toBe(429)
    expect(await revokedAt(a.record.id)).toBeNull()
  })

  it('the admin token routes still work as before', async () => {
    const admin = (await load('@/app/api/admin/agent-tokens/route')) as { GET: () => Promise<Response> }
    expect(typeof admin.GET).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// Edges: MCP tools by role
// ---------------------------------------------------------------------------
describe('agent tokens: tools by role', () => {
  beforeEach(async () => {
    s = await freshState()
  })
  // a real token row, because a proposal points at its token
  const ctx = async (role: string, userId = s.userId) => {
    const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
    return { userId, tokenId: (await createAgentToken(s.prisma, userId, 'ctx')).record.id, role, notify: sent.notify }
  }
  async function tools() {
    return (await load('@/lib/mcp/tools')) as typeof import('@/lib/mcp/tools') & {
      listTools: (role: string) => Array<{ name: string }>
      callTool: (p: PrismaClient, c: Awaited<ReturnType<typeof ctx>>, n: string, a: unknown) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>
    }
  }

  it('listTools hides the two exercise tools from a regular user and shows them to an admin', async () => {
    const { listTools } = await tools()
    const user = listTools('user').map((t) => t.name)
    const admin = listTools('admin').map((t) => t.name)
    for (const t of EXERCISE_TOOLS) {
      expect(user).not.toContain(t)
      expect(admin).toContain(t)
    }
    expect(admin.filter((n) => !EXERCISE_TOOLS.includes(n)).sort()).toEqual(user.sort())
  })

  it('every other tool is listed to everyone', async () => {
    const { listTools } = await tools()
    const user = listTools('user').map((t) => t.name)
    for (const name of ['propose_workout_create', 'propose_workout_update', 'propose_program_create', 'propose_anchor_update', 'propose_target_update', 'get_anchors', 'search_exercises']) {
      expect(user).toContain(name)
    }
  })

  it.each(EXERCISE_TOOLS)('callTool refuses %s for a regular user: forbidden, nothing written, nobody notified', async (name) => {
    const { callTool } = await tools()
    const args = name === 'propose_exercise_create' ? EXERCISE_ARGS() : { id: s.bench.id, changes: { notes: 'x' }, rationale: 'x' }
    const r = await callTool(s.prisma, await ctx('user'), name, args)
    expect(r.isError).toBe(true)
    expect(JSON.parse(r.content[0].text)).toMatchObject({ code: 'forbidden', error: 'Exercise library changes are admin-only.' })
    expect(await s.prisma.proposal.count()).toBe(0)
    expect(sent.notify).not.toHaveBeenCalled()
  })

  it('callTool lets an admin propose an exercise, and notifies', async () => {
    const { callTool } = await tools()
    const r = await callTool(s.prisma, await ctx('admin', s.adminId), 'propose_exercise_create', EXERCISE_ARGS())
    expect(r.isError).not.toBe(true)
    expect(await s.prisma.proposal.count()).toBe(1)
    expect(sent.notify).toHaveBeenCalledTimes(1)
  })

  it('a regular user\'s proposals of other kinds work and notify nobody', async () => {
    const { callTool } = await tools()
    const r = await callTool(s.prisma, await ctx('user'), 'propose_workout_create', WORKOUT_ARGS())
    expect(r.isError).not.toBe(true)
    expect(await s.prisma.proposal.count({ where: { userId: s.userId } })).toBe(1)
    expect(sent.notify).not.toHaveBeenCalled()
  })

  it('an admin\'s proposals of other kinds notify exactly once', async () => {
    const { callTool } = await tools()
    await callTool(s.prisma, await ctx('admin', s.adminId), 'propose_workout_create', WORKOUT_ARGS())
    expect(sent.notify).toHaveBeenCalledTimes(1)
  })

  it('a regular user\'s failed proposal (bad arguments) notifies nobody and writes nothing', async () => {
    const { callTool } = await tools()
    const r = await callTool(s.prisma, await ctx('user'), 'propose_workout_create', { name: '' })
    expect(r.isError).toBe(true)
    expect(await s.prisma.proposal.count()).toBe(0)
    expect(sent.notify).not.toHaveBeenCalled()
  })

  it('the MCP server shows an admin the exercise tools and a regular user not', async () => {
    const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
    const user = (await createAgentToken(s.prisma, s.userId, 'u')).token
    const admin = (await createAgentToken(s.prisma, s.adminId, 'a')).token
    const userTools = toolNames(await mcp(user, 'tools/list'))
    const adminTools = toolNames(await mcp(admin, 'tools/list'))
    for (const t of EXERCISE_TOOLS) {
      expect(userTools).not.toContain(t)
      expect(adminTools).toContain(t)
    }
  })

  it('a token whose owner has no user row is treated as a regular user', async () => {
    const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
    const ghost = (await createAgentToken(s.prisma, 'no-such-user', 'g')).token
    const names = toolNames(await mcp(ghost, 'tools/list'))
    expect(names).not.toContain('propose_exercise_create')
    expect(names).toContain('get_anchors')
  })

  it('the MCP server refuses unknown and missing tokens', async () => {
    expect((await mcp('ripit_at_nope', 'tools/list')).status).toBe(401)
    expect((await mcp(null, 'tools/list')).status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Agent access page (component)
// ---------------------------------------------------------------------------
describe('Agent access page', () => {
  /*
   * AgentAccess (components/features/agent-access/AgentAccess.tsx, props { mcpUrl }):
   *   - a back link "← Settings" to /settings; a title; one or two lines of
   *     explanation; the MCP address text (the mcpUrl prop).
   *   - the tokens, newest first, as list items: name, created date, and either
   *     "Revoked" or a Revoke button.
   *   - Create: a textbox named like "Name" and a "Create…" button. After creating
   *     the new secret is in a copyable box (an input value or text) with "Copy it
   *     now; you won't see it again." and the box is gone after a remount.
   *   - Revoke: the row asks "Revoke <name>?" with "Revoke" and "Cancel".
   *   - at 5 active tokens Create is disabled and a line says why (mentions the
   *     limit); revoked tokens don't count.
   */
  beforeEach(async () => {
    s = await freshState()
  })

  it('shows the MCP address, a back link to Settings, and the explanation', async () => {
    await renderPage()
    await screen.findByRole('textbox', { name: /name/i })
    expect(screen.getAllByText(MCP_URL).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /settings/i }).getAttribute('href')).toBe('/settings')
    expect(document.body.textContent).toMatch(/suggest/i)
    expect(document.body.textContent).not.toMatch(/proposal/i)
  })

  it('lists tokens newest first with their dates and Revoke buttons', async () => {
    const [a, b] = await seedActive(s.userId, 2, 'Tok')
    await s.prisma.agentToken.update({ where: { id: a.record.id }, data: { createdAt: ago(60 * 24 * 3) } })
    await s.prisma.agentToken.update({ where: { id: b.record.id }, data: { createdAt: ago(5) } })
    await renderPage()
    await screen.findByText('Tok1')
    const items = screen.getAllByRole('listitem').map((li) => li.textContent ?? '')
    expect(items[0]).toContain('Tok2')
    expect(items[1]).toContain('Tok1')
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    expect(items[1]).toContain(fmt(ago(60 * 24 * 3)))
    expect(within(rowOf('Tok1')).getByRole('button', { name: /^revoke/i })).toBeTruthy()
  })

  it('shows revoked tokens as Revoked with no Revoke button', async () => {
    const [a] = await seedActive(s.userId, 2, 'Tok')
    await revokeToken(a.record.id)
    await renderPage()
    await screen.findByText('Tok1')
    expect(within(rowOf('Tok1')).getByText(/revoked/i)).toBeTruthy()
    expect(within(rowOf('Tok1')).queryByRole('button', { name: /revoke/i })).toBeNull()
    expect(within(rowOf('Tok2')).queryByText(/^revoked$/i)).toBeNull()
  })

  it("never shows another user's tokens", async () => {
    await seedActive(s.otherUserId, 2, 'Theirs')
    await seedActive(s.userId, 1, 'Mine')
    await renderPage()
    await screen.findByText('Mine1')
    expect(screen.queryByText('Theirs1')).toBeNull()
  })

  it('create shows the secret once in a copy box with the warning, and clears the name field', async () => {
    await renderPage()
    await screen.findByRole('textbox', { name: /name/i })
    await createViaUi('Hermes')
    const secret = (screen.queryByDisplayValue(/^ripit_at_/) as HTMLInputElement | null)?.value ?? screen.getByText(/^ripit_at_/).textContent ?? ''
    expect(secret).toMatch(/^ripit_at_/)
    expect(screen.getByText(/copy it now; you won't see it again/i)).toBeTruthy()
    expect(nameBox().value).toBe('')
    expect(await screen.findByText('Hermes')).toBeTruthy()
    const stored = await s.prisma.agentToken.findFirstOrThrow({ where: { name: 'Hermes' } })
    const { hashAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
    expect(stored.tokenHash).toBe(hashAgentToken(secret))
  })

  it('the copy box is gone after a reload (remount) and the token is never in the list', async () => {
    const first = await renderPage()
    await screen.findByRole('textbox', { name: /name/i })
    await createViaUi('Hermes')
    const secret = (screen.queryByDisplayValue(/^ripit_at_/) as HTMLInputElement | null)?.value ?? ''
    first.unmount()
    await renderPage()
    await screen.findByText('Hermes')
    expect(secretShown(secret)).toBe(false)
    expect(screen.queryByText(/copy it now/i)).toBeNull()
  })

  it('a second create replaces the shown secret', async () => {
    await renderPage()
    await screen.findByRole('textbox', { name: /name/i })
    await createViaUi('One')
    const first = (screen.queryByDisplayValue(/^ripit_at_/) as HTMLInputElement).value
    fireEvent.change(nameBox(), { target: { value: 'Two' } })
    fireEvent.click(createButton())
    await waitFor(() => expect((screen.queryByDisplayValue(/^ripit_at_/) as HTMLInputElement | null)?.value).not.toBe(first))
    expect(secretShown(first)).toBe(false)
  })

  it('an empty or blank name sends nothing', async () => {
    await renderPage()
    await screen.findByRole('textbox', { name: /name/i })
    fireEvent.click(createButton())
    fireEvent.change(nameBox(), { target: { value: '   ' } })
    fireEvent.click(createButton())
    await new Promise((r) => setTimeout(r, 20))
    expect(s.fetched.filter((c) => c.method === 'POST')).toEqual([])
    expect(await s.prisma.agentToken.count()).toBe(0)
  })

  it('a server error on create is shown and no secret appears', async () => {
    await renderPage()
    await screen.findByRole('textbox', { name: /name/i })
    rl.refuse = true
    fireEvent.change(nameBox(), { target: { value: 'Hermes' } })
    fireEvent.click(createButton())
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.queryByDisplayValue(/^ripit_at_/)).toBeNull()
  })

  it('asks before revoking, and Cancel revokes nothing', async () => {
    await seedActive(s.userId, 1, 'Hermes')
    await renderPage()
    await screen.findByText('Hermes1')
    fireEvent.click(within(rowOf('Hermes1')).getByRole('button', { name: /^revoke/i }))
    const question = await screen.findByText('Revoke Hermes1?')
    expect(s.fetched.filter((c) => c.method === 'DELETE')).toEqual([])
    fireEvent.click(within(question.parentElement as HTMLElement).getByRole('button', { name: /^cancel$/i }))
    await waitFor(() => expect(screen.queryByText('Revoke Hermes1?')).toBeNull())
    expect(s.fetched.filter((c) => c.method === 'DELETE')).toEqual([])
    expect(await revokedAt(await idOf('Hermes1'))).toBeNull()
  })

  it('confirming revokes it: the row says Revoked and the DELETE went to that id', async () => {
    await seedActive(s.userId, 2, 'Hermes')
    await renderPage()
    await screen.findByText('Hermes1')
    fireEvent.click(within(rowOf('Hermes1')).getByRole('button', { name: /^revoke/i }))
    const question = await screen.findByText('Revoke Hermes1?')
    fireEvent.click(within(question.parentElement as HTMLElement).getByRole('button', { name: /^revoke$/i }))
    await waitFor(() => expect(within(rowOf('Hermes1')).getByText(/revoked/i)).toBeTruthy())
    expect(s.fetched.filter((c) => c.method === 'DELETE')).toHaveLength(1)
    expect(await revokedAt(await idOf('Hermes2'))).toBeNull()
  })

  it('at five active tokens Create is disabled and says why; revoking one enables it', async () => {
    await seedActive(s.userId, 5, 'T')
    await renderPage()
    await screen.findByText('T1')
    expect(createButton().disabled).toBe(true)
    expect(document.body.textContent).toMatch(/limit|at most 5|5 active/i)
    fireEvent.click(within(rowOf('T1')).getByRole('button', { name: /^revoke/i }))
    const question = await screen.findByText('Revoke T1?')
    fireEvent.click(within(question.parentElement as HTMLElement).getByRole('button', { name: /^revoke$/i }))
    await waitFor(() => expect(createButton().disabled).toBe(false))
  })

  it('revoked tokens do not disable Create', async () => {
    const tokens = await seedActive(s.userId, 5, 'T')
    for (const t of tokens.slice(0, 2)) await revokeToken(t.record.id)
    await renderPage()
    await screen.findByText('T1')
    expect(createButton().disabled).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Review 058 gaps
// ---------------------------------------------------------------------------
describe('agent tokens: an editor owner is a regular user', () => {
  beforeEach(async () => {
    s = await freshState()
    await s.prisma.$executeRaw`UPDATE "user" SET role = 'editor' WHERE id = ${s.userId}`
    const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
    s.secrets.Editor = (await createAgentToken(s.prisma, s.userId, 'Editor agent')).token
  })

  it('the MCP server hides the exercise-library tools from an editor', async () => {
    const names = toolNames(await mcp(s.secrets.Editor, 'tools/list'))
    for (const t of EXERCISE_TOOLS) expect(names).not.toContain(t)
    expect(names).toContain('propose_workout_create')
  })

  it.each([
    ['propose_exercise_create', () => EXERCISE_ARGS()],
    ['propose_exercise_update', () => ({ id: s.bench.id, changes: { notes: 'x' }, rationale: 'x' })],
  ])('an editor calling %s is refused as admin-only, with nothing created or notified', async (name, args) => {
    const r = await mcp(s.secrets.Editor, 'tools/call', { name, arguments: args() })
    expect(r.body.result?.isError).toBe(true)
    expect(callPayload(r)).toMatchObject({ code: 'forbidden', error: 'Exercise library changes are admin-only.' })
    expect(await s.prisma.proposal.count()).toBe(0)
    expect(sent.notify).not.toHaveBeenCalled()
  })

  it("an editor's other proposals work and notify nobody", async () => {
    const r = await mcp(s.secrets.Editor, 'tools/call', { name: 'propose_workout_create', arguments: WORKOUT_ARGS() })
    expect(r.body.result?.isError).not.toBe(true)
    expect(await s.prisma.proposal.count({ where: { userId: s.userId } })).toBe(1)
    expect(sent.notify).not.toHaveBeenCalled()
  })

  it('callTool and listTools agree for the editor role', async () => {
    const mod = (await load('@/lib/mcp/tools')) as {
      listTools: (role: string) => Array<{ name: string }>
      callTool: (p: PrismaClient, c: Json, n: string, a: unknown) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>
    }
    expect(mod.listTools('editor').map((t) => t.name)).not.toContain('propose_exercise_create')
    const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
    const tokenId = (await createAgentToken(s.prisma, s.userId, 'ctx')).record.id
    const ctx = { userId: s.userId, tokenId, role: 'editor', notify: sent.notify }
    const refused = await mod.callTool(s.prisma, ctx, 'propose_exercise_create', EXERCISE_ARGS())
    expect(refused.isError).toBe(true)
    await mod.callTool(s.prisma, ctx, 'propose_workout_create', WORKOUT_ARGS())
    expect(sent.notify).not.toHaveBeenCalled()
  })
})

describe('agent tokens: when the role cannot be read', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  async function tokenFor(userId: string, name: string) {
    const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
    return (await createAgentToken(s.prisma, userId, name)).token
  }

  it("the MCP server treats even an admin's token as a regular user when the lookup throws", async () => {
    const admin = await tokenFor(s.adminId, 'Admin agent')
    expect(toolNames(await mcp(admin, 'tools/list'))).toContain('propose_exercise_create')
    await s.prisma.$executeRawUnsafe('DROP TABLE "user"')
    const names = toolNames(await mcp(admin, 'tools/list'))
    expect(names.length).toBeGreaterThan(5)
    for (const t of EXERCISE_TOOLS) expect(names).not.toContain(t)
  })

  it('and refuses the exercise tools and notifies nobody', async () => {
    const admin = await tokenFor(s.adminId, 'Admin agent')
    await s.prisma.$executeRawUnsafe('DROP TABLE "user"')
    const refused = await mcp(admin, 'tools/call', { name: 'propose_exercise_create', arguments: EXERCISE_ARGS() })
    expect(refused.body.result?.isError).toBe(true)
    expect(callPayload(refused).code).toBe('forbidden')
    const ok = await mcp(admin, 'tools/call', { name: 'propose_workout_create', arguments: WORKOUT_ARGS() })
    expect(ok.body.result?.isError).not.toBe(true)
    expect(await s.prisma.proposal.count()).toBe(1)
    expect(sent.notify).not.toHaveBeenCalled()
  })

  it('the connection itself still works: reads succeed and the token still resolves', async () => {
    const user = await tokenFor(s.userId, 'User agent')
    await s.prisma.$executeRawUnsafe('DROP TABLE "user"')
    const r = await mcp(user, 'tools/call', { name: 'get_anchors', arguments: {} })
    expect(r.status).toBe(200)
    expect(r.body.result?.isError).not.toBe(true)
  })
})

describe('agent tokens: a context with no role is a regular user', () => {
  beforeEach(async () => {
    s = await freshState()
  })
  type Mod = {
    listTools: (role?: string) => Array<{ name: string }>
    callTool: (p: PrismaClient, c: Json, n: string, a: unknown) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>
  }
  const tools = async () => (await load('@/lib/mcp/tools')) as Mod
  async function noRoleCtx(userId = s.userId) {
    const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
    return { userId, tokenId: (await createAgentToken(s.prisma, userId, 'ctx')).record.id, notify: sent.notify }
  }

  it('callTool refuses the exercise tools, writing and notifying nothing', async () => {
    const { callTool } = await tools()
    const r = await callTool(s.prisma, await noRoleCtx(), 'propose_exercise_create', EXERCISE_ARGS())
    expect(r.isError).toBe(true)
    expect(JSON.parse(r.content[0].text)).toMatchObject({ code: 'forbidden' })
    expect(await s.prisma.proposal.count()).toBe(0)
    expect(sent.notify).not.toHaveBeenCalled()
  })

  it('callTool still makes other proposals, without notifying', async () => {
    const { callTool } = await tools()
    const r = await callTool(s.prisma, await noRoleCtx(), 'propose_workout_create', WORKOUT_ARGS())
    expect(r.isError).not.toBe(true)
    expect(await s.prisma.proposal.count()).toBe(1)
    expect(sent.notify).not.toHaveBeenCalled()
  })

  it('listTools with no role hides the exercise tools', async () => {
    const { listTools } = await tools()
    const names = listTools().map((t) => t.name)
    for (const t of EXERCISE_TOOLS) expect(names).not.toContain(t)
    expect(names).toContain('propose_workout_create')
  })
})

describe('agent tokens: the CSV export honours revocation', () => {
  beforeEach(async () => {
    s = await freshState()
  })
  async function exportCsv(bearer: string | null) {
    const mod = (await load('@/app/api/agent/export.csv/route')) as { GET: (r: Request) => Promise<Response> }
    return mod.GET(
      new Request('http://localhost/api/agent/export.csv?since=2026-01-01&until=2026-01-31', {
        headers: bearer ? { authorization: `Bearer ${bearer}` } : {},
      })
    )
  }

  it('an active token gets the file', async () => {
    const [a] = await seedActive(s.userId, 1)
    const res = await exportCsv(a.token)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/csv/)
  })

  it('a revoked token gets 401 and no data', async () => {
    const [a] = await seedActive(s.userId, 1)
    expect((await exportCsv(a.token)).status).toBe(200)
    expect((await revokeToken(a.record.id)).status).toBe(200)
    const res = await exportCsv(a.token)
    expect(res.status).toBe(401)
    expect(res.headers.get('content-type') ?? '').not.toMatch(/csv/)
  })

  it('a missing or unknown token gets 401', async () => {
    expect((await exportCsv(null)).status).toBe(401)
    expect((await exportCsv('ripit_at_nope')).status).toBe(401)
  })
})

describe('agent tokens: the limit holds under concurrent creates', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  it('10 parallel creates leave exactly 5 active tokens, and the rest are refused', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => createToken(`Parallel ${i}`)))
    const created = results.filter((r) => r.status === 201)
    const refused = results.filter((r) => r.status === 409)
    expect(created).toHaveLength(5)
    expect(refused).toHaveLength(5)
    expect(refused.every((r) => r.body.code === 'TOKEN_LIMIT')).toBe(true)
    expect(await s.prisma.agentToken.count({ where: { userId: s.userId, revokedAt: null } })).toBe(5)
    expect(await s.prisma.agentToken.count({ where: { userId: s.userId } })).toBe(5)
  })

  it('parallel creates with some tokens already there still stop at 5', async () => {
    await seedActive(s.userId, 3, 'Pre')
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => createToken(`Parallel ${i}`)))
    expect(results.filter((r) => r.status === 201)).toHaveLength(2)
    expect(await s.prisma.agentToken.count({ where: { userId: s.userId, revokedAt: null } })).toBe(5)
  })

  it("one user's race does not block another user", async () => {
    await Promise.all(Array.from({ length: 8 }, (_, i) => createToken(`Mine ${i}`)))
    expect((await createToken('Theirs', s.otherUserId)).status).toBe(201)
  })

  it('the refused creates return no secret and store nothing', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => createToken(`P${i}`)))
    for (const r of results.filter((x) => x.status === 409)) expect(r.body.secret).toBeUndefined()
    const hashes = await s.prisma.agentToken.findMany({ where: { userId: s.userId } })
    expect(hashes).toHaveLength(5)
  })
})
