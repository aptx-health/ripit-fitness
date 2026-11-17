/**
 * Step definitions for features/admin/bug-report-screenshot.feature (work 222).
 *
 * The full pinned contract (routes, fields, MCP tool, client modules, UI names) is at the top of
 * ./bug-report-support.ts. Edge cases live in __tests__/api/bug-report-feedback.test.ts,
 * __tests__/lib/bug-report-client.test.ts and __tests__/lib/mcp-bug-report-screenshot.test.ts.
 *
 * The admin quick panel is rendered on its own with fetch routed to the real feedback routes and the
 * test DB. captureScreen() (lib/feedback/capture-screen.ts) is mocked: it records whether the admin
 * drawer or the sheet was showing when it ran, and returns a synthetic PNG (or fails when told to).
 * shrinkImage() (lib/feedback/shrink-image.ts) is mocked: anything over the limit becomes a 300 KB JPEG.
 *
 * vitest-cucumber runs every step as its own test, so state lives in `s`/`ui`/`cap` and is reset in
 * the first Background step, never in afterEach. The screen is kept between steps
 * (testing-library/react/pure) and cleared when each scenario starts.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react/pure'
import { NextRequest } from 'next/server'
import { createElement } from 'react'
import { expect, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'
import {
  base64,
  blobBytes,
  bugReport,
  type Fields,
  type FilePart,
  gifBytes,
  jpeg,
  multipart,
  multipartRequest,
  png,
  pngBytes,
  sameBytes,
  sampleContext,
  textBytes,
  webp,
  withNodeFile,
} from './bug-report-support'

const auth = vi.hoisted(() => ({ userId: '', role: 'admin' }))
const nav = vi.hoisted(() => ({ params: '' }))
const discord = vi.hoisted(() => ({ send: (() => {}) as (...a: unknown[]) => void, calls: [] as unknown[] }))
const cap = vi.hoisted(() => ({
  next: [] as Array<'fail' | Uint8Array<ArrayBuffer>>,
  calls: 0,
  during: [] as Array<{ admin: boolean; sheet: boolean }>,
  returned: [] as Uint8Array<ArrayBuffer>[],
}))
const shrunk = vi.hoisted(() => ({ inputs: [] as number[] }))
const ui = vi.hoisted(() => ({
  posts: [] as Array<{ fields: Record<string, string>; files: Record<string, { bytes: Uint8Array<ArrayBuffer>; type: string }> }>,
  fail: [] as Array<'reject' | number>,
}))

// Keep console.error quiet (and stable) for the whole file: the panel wraps it to record errors.
console.error = () => {}

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  const prisma = (await db()).getPrismaClient()
  return { prisma, default: prisma }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    auth.userId
      ? { user: { id: auth.userId, role: auth.role, email: `${auth.userId}@x.test` }, error: null }
      : { user: null, error: null },
}))
vi.mock('@/lib/discord', () => ({
  sendDiscordNotification: (embed: unknown) => {
    discord.calls.push(embed)
  },
}))
vi.mock('@/lib/rate-limit', async (orig) => ({
  ...(await orig<object>()),
  checkRateLimit: async () => null,
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  usePathname: () => '/training',
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(nav.params),
}))
vi.mock('@/lib/feedback/capture-screen', () => ({
  captureScreen: async () => {
    const { screen: sc } = await import('@testing-library/react/pure')
    const { pngBytes: make } = await import('./bug-report-support')
    cap.calls++
    cap.during.push({
      admin: sc.queryByRole('dialog', { name: 'Admin' }) !== null,
      sheet: sc.queryByRole('dialog', { name: 'Report a bug' }) !== null,
    })
    const next = cap.next.shift() ?? make(3000, cap.calls)
    if (next === 'fail') throw new Error('capture failed')
    cap.returned.push(next)
    return new Blob([next], { type: 'image/png' })
  },
}))
vi.mock('@/lib/feedback/shrink-image', async (orig) => ({
  ...(await orig<object>()),
  shrinkImage: async (blob: Blob) => {
    const spec = '@/lib/feedback/screenshot'
    const { MAX_SCREENSHOT_BYTES } = (await import(/* @vite-ignore */ spec)) as { MAX_SCREENSHOT_BYTES: number }
    const { jpegBytes } = await import('./bug-report-support')
    shrunk.inputs.push(blob.size)
    return blob.size > MAX_SCREENSHOT_BYTES ? new Blob([jpegBytes(300_000, 9)], { type: 'image/jpeg' }) : blob
  },
}))
// (app) layout seams, for the non-admin scenario.
vi.mock('@/lib/auth/waiver', () => ({ hasCurrentWaiver: async () => true }))
vi.mock('@/lib/contexts/DraftWorkoutContext', () => ({
  DraftWorkoutProvider: ({ children }: { children: unknown }) => children,
}))
vi.mock('@/components/AppScrollContainer', () => ({ default: ({ children }: { children: unknown }) => children }))
vi.mock('@/components/BottomNav', () => ({ default: () => null }))
vi.mock('@/components/Header', () => ({ default: () => null }))
vi.mock('@/components/features/FeedbackButton', () => ({ default: () => null }))
vi.mock('@/components/features/PwaInstallButton', () => ({ PwaInstallButton: () => null }))
vi.mock('@/components/features/SessionContextTracker', () => ({ SessionContextTracker: () => null }))
vi.mock('@/components/features/SignupCompletedTracker', () => ({ SignupCompletedTracker: () => null }))
vi.mock('@/components/features/admin-quick-panel/AdminQuickPanelLoader', async () => {
  const mod = await import('@/components/features/admin-quick-panel/AdminQuickPanel')
  return { default: mod.default }
})

const feature = await loadFeature('features/admin/bug-report-screenshot.feature')

// ---------------------------------------------------------------------------
const load = (spec: string) => import(/* @vite-ignore */ spec)
type Handler = (r: NextRequest, c?: unknown) => Promise<Response>
type Json = Record<string, unknown>
type Content = { type: string; text?: string; data?: string; mimeType?: string }
type ToolResult = { content: Content[]; isError?: boolean }

interface State {
  prisma: PrismaClient
  admin: string
  other: string
  previewSrc: string
  reportId: string
  reportFile: FilePart
  errors: string[]
}
let s: State

async function freshState() {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  const db = await getTestDatabase()
  await db.reset()
  const prisma = db.getPrismaClient()
  s = {
    prisma,
    admin: (await createTestUser()).id,
    other: (await createTestUser()).id,
    previewSrc: '',
    reportId: '',
    reportFile: png(),
    errors: [],
  }
  auth.userId = s.admin
  auth.role = 'admin'
  nav.params = ''
  discord.calls.length = 0
  cap.next.length = 0
  cap.calls = 0
  cap.during.length = 0
  cap.returned.length = 0
  shrunk.inputs.length = 0
  ui.posts.length = 0
  ui.fail.length = 0
  window.localStorage.clear()
  browserBits()
  routedFetch()
}

function browserBits() {
  const g = globalThis as Record<string, unknown>
  if (!g.ResizeObserver) g.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  if (!window.matchMedia)
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  let n = 0
  URL.createObjectURL = (() => `blob:preview-${++n}`) as typeof URL.createObjectURL
  URL.revokeObjectURL = () => {}
}

// --- fetch → real routes ---------------------------------------------------------------
async function formFields(fd: FormData) {
  const fields: Record<string, string> = {}
  const files: Record<string, { bytes: Uint8Array<ArrayBuffer>; type: string }> = {}
  for (const [k, v] of fd.entries()) {
    if (typeof v === 'string') fields[k] = v
    else files[k] = { bytes: await blobBytes(v), type: v.type }
  }
  return { fields, files }
}

function routedFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: { method?: string; body?: unknown; headers?: unknown }) => {
      const url = String(input instanceof Request ? input.url : input).replace(/^https?:\/\/[^/]+/, '')
      const method = (init?.method ?? 'GET').toUpperCase()
      const path = url.split('?')[0]
      const feedback = (await load('@/app/api/feedback/route')) as { GET: Handler; POST: Handler }

      if (path === '/api/feedback' && method === 'POST') {
        let req: NextRequest
        if (init?.body instanceof FormData) {
          const { fields, files } = await formFields(init.body)
          ui.posts.push({ fields, files })
          const parts: Fields = { ...fields }
          for (const [k, f] of Object.entries(files)) parts[k] = { ...f, filename: k }
          const { body, contentType } = multipart(parts)
          req = new NextRequest(`http://localhost${url}`, { method, headers: { 'content-type': contentType }, body })
        } else {
          ui.posts.push({ fields: JSON.parse(String(init?.body ?? '{}')), files: {} })
          req = new NextRequest(`http://localhost${url}`, {
            method,
            headers: { 'content-type': 'application/json' },
            body: String(init?.body ?? ''),
          })
        }
        const failure = ui.fail.shift()
        if (failure === 'reject') throw new TypeError('Failed to fetch')
        if (typeof failure === 'number')
          return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: failure,
            headers: { 'content-type': 'application/json' },
          })
        return withNodeFile(() => feedback.POST(req))
      }
      if (path === '/api/feedback' && method === 'GET') return feedback.GET(new NextRequest(`http://localhost${url}`))
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    })
  )
}

// --- direct route and tool calls --------------------------------------------------------
async function postAs(userId: string, role: string, fields: Fields) {
  const prev = { ...auth }
  auth.userId = userId
  auth.role = role
  try {
    const { POST } = (await load('@/app/api/feedback/route')) as { POST: Handler }
    const res = await withNodeFile(() => POST(multipartRequest(fields)))
    return { status: res.status, json: (await res.json().catch(() => ({}))) as Json }
  } finally {
    Object.assign(auth, prev)
  }
}

async function screenshotOf(feedbackId: string) {
  const { GET } = (await load('@/app/api/feedback/[feedbackId]/screenshot/route')) as { GET: Handler }
  const res = await GET(new NextRequest(`http://localhost/api/feedback/${feedbackId}/screenshot`), {
    params: Promise.resolve({ feedbackId }),
  })
  return { status: res.status, bytes: res.status === 200 ? await blobBytes(await res.blob()) : new Uint8Array() }
}

async function listed(): Promise<Json[]> {
  const { GET } = (await load('@/app/api/feedback/route')) as { GET: Handler }
  const res = await GET(new NextRequest('http://localhost/api/feedback?limit=100'))
  return ((await res.json()) as { feedback: Json[] }).feedback
}

async function tool(userId: string, role: string, name: string, args: Json): Promise<ToolResult> {
  const { callTool } = (await load('@/lib/mcp/tools')) as typeof import('@/lib/mcp/tools')
  const ctx = { userId, tokenId: `token-${userId}`, role, notify: async () => {} }
  return (await callTool(s.prisma, ctx as never, name, args as never)) as unknown as ToolResult
}
const toolText = (r: ToolResult) => r.content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n')

async function maxBytes(): Promise<number> {
  return ((await load('@/lib/feedback/screenshot')) as { MAX_SCREENSHOT_BYTES: number }).MAX_SCREENSHOT_BYTES
}

async function seedReport() {
  s.reportFile = png(7000, 31)
  const { status, json } = await postAs(s.admin, 'admin', bugReport(s.reportFile))
  expect(status, JSON.stringify(json)).toBe(200)
  s.reportId = json.id as string
}

// --- UI helpers ---------------------------------------------------------------------------
async function renderPanel() {
  const { ToastProvider } = await import('@/components/ToastProvider')
  const { default: AdminQuickPanel } = await import('@/components/features/admin-quick-panel/AdminQuickPanel')
  render(createElement(ToastProvider, null, createElement(AdminQuickPanel)))
}

async function renderAppLayout() {
  const { default: AppLayout } = await import('@/app/(app)/layout')
  const tree = await AppLayout({ children: createElement('p', null, 'page content') })
  render(tree)
}

const sheet = () => screen.getByRole('dialog', { name: 'Report a bug' })
const querySheet = () => screen.queryByRole('dialog', { name: 'Report a bug' })
const preview = () => within(sheet()).queryByRole('img', { name: 'Screenshot preview' }) as HTMLImageElement | null
const messageBox = () => within(sheet()).getByRole('textbox') as HTMLTextAreaElement
const sendButton = () => within(sheet()).getByRole('button', { name: 'Send' }) as HTMLButtonElement

async function openReport() {
  fireEvent.click(screen.getByRole('button', { name: 'Open admin panel', hidden: true }))
  const panel = screen.getByRole('dialog', { name: 'Admin' })
  fireEvent.click(within(panel).getByRole('button', { name: 'Report a bug' }))
  await screen.findByRole('dialog', { name: 'Report a bug' }, { timeout: 4000 })
}

async function previewSrc(): Promise<string> {
  let src = ''
  await waitFor(() => {
    src = preview()?.getAttribute('src') ?? ''
    expect(src).not.toBe('')
  })
  return src
}

function typeMessage(text: string) {
  fireEvent.change(messageBox(), { target: { value: text } })
}

async function tapSendAndWait(attempts = 1) {
  await waitFor(() => expect(sendButton().disabled).toBe(false))
  fireEvent.click(sendButton())
  await waitFor(() => expect(ui.posts).toHaveLength(attempts), { timeout: 4000 })
}

async function sentAndClosed() {
  await waitFor(() => expect(querySheet()).toBeNull(), { timeout: 4000 })
  await screen.findByText(/Bug report sent/i, {}, { timeout: 4000 })
}

const lastPost = () => ui.posts[ui.posts.length - 1]

// ---------------------------------------------------------------------------
describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given, And }) => {
    Given('I am signed in as an admin', async () => {
      await freshState()
    })
    And('I am on an app page', async () => {
      window.history.pushState({}, '', '/training')
      await renderPanel()
    })
  })

  // --- Capture ---

  Scenario('Report a bug captures the current screen', ({ When, Then, And }) => {
    When('I open the admin panel and tap "Report a bug"', async () => {
      await openReport()
    })
    Then("the panel closes before the capture, so it isn't in the screenshot", () => {
      expect(cap.calls).toBe(1)
      expect(cap.during[0].admin).toBe(false)
      expect(screen.queryByRole('dialog', { name: 'Admin' })).toBeNull()
    })
    And('a "Report a bug" sheet opens with a preview of the screen I was on', async () => {
      expect(sheet()).toBeTruthy()
      expect(await previewSrc()).not.toBe('')
    })
  })

  Scenario('Retake or use a photo instead', ({ Given, When, Then }) => {
    Given('the "Report a bug" sheet shows a captured preview', async () => {
      await openReport()
      s.previewSrc = await previewSrc()
    })
    When('I tap "Retake"', async () => {
      fireEvent.click(within(sheet()).getByRole('button', { name: 'Retake' }))
      await waitFor(() => expect(cap.calls).toBe(2), { timeout: 4000 })
    })
    Then('the sheet hides, the screen is captured again, and the preview updates', async () => {
      expect(cap.during[1].sheet).toBe(false)
      expect(cap.during[1].admin).toBe(false)
      await waitFor(() => expect(querySheet()).not.toBeNull(), { timeout: 4000 })
      await waitFor(() => expect(preview()?.getAttribute('src') ?? s.previewSrc).not.toBe(s.previewSrc))
      s.previewSrc = await previewSrc()
    })
    When('I tap "Use a photo" and pick an image', async () => {
      fireEvent.click(within(sheet()).getByRole('button', { name: 'Use a photo' }))
      const input = sheet().querySelector('input[type="file"]') as HTMLInputElement
      expect(input).toBeTruthy()
      const photo = new File([pngBytes(5000, 77)], 'photo.png', { type: 'image/png' })
      fireEvent.change(input, { target: { files: [photo] } })
    })
    Then('the preview shows that image instead', async () => {
      await waitFor(() => expect(preview()?.getAttribute('src') ?? s.previewSrc).not.toBe(s.previewSrc))
      // Sending now uploads the photo, not the earlier capture.
      typeMessage('Photo of the bug')
      await tapSendAndWait()
      const file = lastPost().files.screenshot
      expect(file).toBeTruthy()
      expect(sameBytes(file.bytes, pngBytes(5000, 77))).toBe(true)
    })
  })

  Scenario('Capture fails', ({ Given, When, Then, And }) => {
    Given("the screen can't be captured", () => {
      cap.next.push('fail')
    })
    When('I tap "Report a bug"', async () => {
      await openReport()
    })
    Then('the sheet still opens, says the capture didn\'t work, and offers "Use a photo"', async () => {
      await within(sheet()).findByText(/capture didn.t work/i, {}, { timeout: 4000 })
      expect(within(sheet()).getByRole('button', { name: 'Use a photo' })).toBeTruthy()
    })
    And('I can send the report without an image', async () => {
      typeMessage('No picture this time')
      await tapSendAndWait()
      expect(lastPost().files.screenshot).toBeUndefined()
      await sentAndClosed()
      const row = await s.prisma.feedback.findFirst({ where: { userId: s.admin } })
      expect(row).toMatchObject({ category: 'bug', message: 'No picture this time' })
    })
  })

  Scenario('Big images are shrunk before sending', ({ Given, Then }) => {
    Given('the image is larger than the limit', async () => {
      cap.next.push(pngBytes(2_000_000, 5))
    })
    Then('it is scaled down and compressed as a JPEG to fit under 500 KB before upload', async () => {
      await openReport()
      typeMessage('Big screen')
      await tapSendAndWait()
      expect(shrunk.inputs).toContain(2_000_000)
      const file = lastPost().files.screenshot
      expect(file.type).toBe('image/jpeg')
      expect(file.bytes.length).toBeLessThanOrEqual(await maxBytes())
      await sentAndClosed()
    })
  })

  // --- Sending ---

  Scenario('Send a bug report', ({ Given, When, Then, And }) => {
    Given('I typed "Rest timer didn\'t start" and have a screenshot', async () => {
      await openReport()
      await previewSrc()
      typeMessage("Rest timer didn't start")
    })
    When('I tap "Send"', async () => {
      await tapSendAndWait()
    })
    Then('a feedback item with category "bug" and that message is saved with its screenshot', async () => {
      await waitFor(async () => expect(await s.prisma.feedback.count()).toBe(1), { timeout: 4000 })
      const row = await s.prisma.feedback.findFirst({ where: { userId: s.admin } })
      expect(row).toMatchObject({ category: 'bug', message: "Rest timer didn't start" })
      const got = await screenshotOf(row?.id as string)
      expect(got.status).toBe(200)
      expect(sameBytes(got.bytes, cap.returned[0])).toBe(true)
    })
    And('the sheet closes with a confirmation', async () => {
      await sentAndClosed()
    })
    And('the Discord feedback notice says it has a screenshot', () => {
      expect(discord.calls).toHaveLength(1)
      expect(JSON.stringify(discord.calls[0])).toMatch(/screenshot/i)
    })
  })

  Scenario('The report carries context', ({ When, Then, And }) => {
    When('I send a bug report', async () => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 412 })
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 915 })
      const { saveThemePreference } = await import('@/lib/theme')
      saveThemePreference({ themeName: 'cyber', mode: 'dark' })
      vi.stubEnv('NEXT_PUBLIC_BUILD_VERSION', 'build-ctx9')
      s.errors = ['ctx error one', 'ctx error two', 'ctx error three']
      for (const e of s.errors) console.error(e)
      await openReport()
      typeMessage('Context check')
      await tapSendAndWait()
      await sentAndClosed()
    })
    Then('it records the page URL, the screen size, the theme, the build version,', async () => {
      const item = (await listed()).find((f) => f.message === 'Context check')
      const ctx = item?.context as Record<string, unknown>
      expect(ctx).toBeTruthy()
      expect(String(ctx.pageUrl)).toContain('/training')
      expect(String(item?.pageUrl)).toContain('/training')
      expect(ctx.viewport).toEqual({ width: 412, height: 915 })
      expect(ctx.theme).toEqual({ themeName: 'cyber', mode: 'dark' })
      expect(ctx.buildVersion).toBe('build-ctx9')
    })
    And('the last few console errors from this session (up to 10, newest last)', async () => {
      const item = (await listed()).find((f) => f.message === 'Context check')
      const errors = (item?.context as { consoleErrors: string[] }).consoleErrors
      expect(errors.length).toBeLessThanOrEqual(10)
      expect(errors.length).toBeGreaterThanOrEqual(3)
      const tail = errors.slice(-3)
      for (const [i, e] of s.errors.entries()) expect(tail[i]).toContain(e)
    })
  })

  Scenario('A message is required', ({ Given, Then }) => {
    Given('the message is empty', async () => {
      await openReport()
      expect(messageBox().value).toBe('')
    })
    Then('"Send" is disabled', () => {
      expect(sendButton().disabled).toBe(true)
      typeMessage('Now there is one')
      expect(sendButton().disabled).toBe(false)
    })
  })

  Scenario('A failed send keeps my report', ({ Given, When, Then }) => {
    Given('the upload fails', async () => {
      ui.fail.push('reject')
      await openReport()
      s.previewSrc = await previewSrc()
      typeMessage('Keep me')
    })
    When('I tap "Send"', async () => {
      await tapSendAndWait()
    })
    Then("I see that it didn't send, my message and image are kept, and I can try again", async () => {
      await within(sheet()).findByText(/didn.t send/i, {}, { timeout: 4000 })
      expect(messageBox().value).toBe('Keep me')
      expect(preview()?.getAttribute('src')).toBe(s.previewSrc)
      expect(await s.prisma.feedback.count()).toBe(0)

      await tapSendAndWait(2)
      await sentAndClosed()
      expect(ui.posts[1].fields.message).toBe('Keep me')
      expect(sameBytes(ui.posts[1].files.screenshot.bytes, cap.returned[0])).toBe(true)
      expect(await s.prisma.feedback.count()).toBe(1)
    })
  })

  // --- Who can do what ---

  Scenario('Only admins can attach screenshots', ({ Given, Then, And }) => {
    Given('I am not an admin', async () => {
      cleanup()
      auth.userId = s.other
      auth.role = 'user'
      await renderAppLayout()
    })
    Then('I never see "Report a bug"', () => {
      expect(screen.getByText('page content')).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Report a bug', hidden: true })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Open admin panel', hidden: true })).toBeNull()
    })
    And('the server refuses a screenshot on feedback from me', async () => {
      const { status } = await postAs(s.other, 'user', bugReport(png()))
      expect(status).toBe(403)
      expect(await s.prisma.feedback.count()).toBe(0)
    })
  })

  Scenario('The server checks the image', ({ Then, And }) => {
    Then('the server accepts only JPEG, PNG or WebP images up to 500 KB', async () => {
      const max = await maxBytes()
      expect(max).toBeGreaterThanOrEqual(500_000)
      expect(max).toBeLessThanOrEqual(512_000)
      for (const file of [png(max, 1), jpeg(4000, 2), webp(4000, 3)]) {
        const { status, json } = await postAs(s.admin, 'admin', bugReport(file))
        expect(status, `${file.type}: ${JSON.stringify(json)}`).toBe(200)
      }
      expect(await s.prisma.feedback.count()).toBe(3)
    })
    And('refuses anything else without saving the feedback', async () => {
      const max = await maxBytes()
      const bad: FilePart[] = [
        { bytes: gifBytes(), type: 'image/gif', filename: 'a.gif' },
        { bytes: textBytes('hello'), type: 'text/plain', filename: 'a.txt' },
        { bytes: textBytes('not really a png'), type: 'image/png', filename: 'a.png' },
        jpeg(max + 1, 4),
      ]
      for (const file of bad) {
        const { status } = await postAs(s.admin, 'admin', bugReport(file, { message: `bad ${file.type}` }))
        expect([400, 413], file.type).toContain(status)
      }
      expect(await s.prisma.feedback.count()).toBe(3)
    })
  })

  // --- Reading it back ---

  Scenario('The admin feedback page shows the screenshot', ({ Given, When, Then }) => {
    Given('a bug report with a screenshot', async () => {
      await seedReport()
    })
    When('I open it on the admin feedback page', async () => {
      cleanup()
      nav.params = `expand=${s.reportId}`
      const { default: Page } = await load('@/app/(app)/admin/feedback/page')
      render(createElement(Page as () => null))
    })
    Then('I see the screenshot (tap to see it full size) and its context', async () => {
      const src = `/api/feedback/${s.reportId}/screenshot`
      let thumb: HTMLImageElement | null = null
      await waitFor(
        () => {
          thumb = document.querySelector(`img[src*="${src}"]`)
          expect(thumb).toBeTruthy()
        },
        { timeout: 4000 }
      )
      fireEvent.click(thumb as unknown as HTMLImageElement)
      const full = await screen.findByRole('dialog', {}, { timeout: 4000 })
      expect(full.querySelector(`img[src*="${src}"]`)).toBeTruthy()

      const text = document.body.textContent ?? ''
      const ctx = sampleContext()
      expect(text).toContain(String(ctx.viewport.width))
      expect(text).toContain(String(ctx.viewport.height))
      expect(text).toContain(ctx.theme.themeName)
      expect(text).toContain(ctx.buildVersion)
      for (const e of ctx.consoleErrors) expect(text).toContain(e)
    })
  })

  Scenario('Agents can see the screenshot', ({ Given, Then, And }) => {
    Given('a bug report with a screenshot', async () => {
      await seedReport()
    })
    Then('the MCP feedback list says which items have a screenshot', async () => {
      const r = await tool(s.admin, 'admin', 'list_feedback', {})
      expect(r.isError).toBeFalsy()
      const { feedback } = JSON.parse(toolText(r)) as { feedback: Json[] }
      expect(feedback.find((f) => f.id === s.reportId)?.hasScreenshot).toBe(true)
    })
    And('an agent can fetch that screenshot as an image, with its context', async () => {
      const r = await tool(s.admin, 'admin', 'get_feedback_screenshot', { feedbackId: s.reportId })
      expect(r.isError, toolText(r)).toBeFalsy()
      const image = r.content.find((c) => c.type === 'image')
      expect(image?.mimeType).toBe('image/png')
      expect(image?.data).toBe(base64(s.reportFile.bytes))
      expect((JSON.parse(toolText(r)) as Json).context).toEqual(sampleContext())
    })
    And("only for feedback the agent's user can see", async () => {
      const r = await tool(s.other, 'user', 'get_feedback_screenshot', { feedbackId: s.reportId })
      expect(r.isError).toBe(true)
      expect(r.content.some((c) => c.type === 'image')).toBe(false)
    })
  })
})
