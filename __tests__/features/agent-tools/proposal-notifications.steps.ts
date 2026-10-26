/**
 * Step definitions for features/agent-tools/proposal-notifications.feature.
 * Codes strictly against initiatives/agent-tools/docs/spec.md ("Notifications").
 *
 * The module under test is loaded lazily inside steps so that, while it is
 * missing, each scenario fails on its own rather than the whole file at load.
 * No real network: webhookUrl and fetch are injected through opts.
 */
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect, vi } from 'vitest'
import { logger } from '@/lib/logger'
import type { NotifyPayload } from '@/lib/notify/bark'

const feature = await loadFeature('features/agent-tools/proposal-notifications.feature')

const WEBHOOK = 'https://discord.test/api/webhooks/123/abc'
const MAX_TITLE = 256
const MAX_DESCRIPTION = 4096

const PAYLOAD: NotifyPayload = {
  proposalId: 'prop_abc123',
  title: 'Proposal: add Larsen Press',
  body: 'Create exercise "Larsen Press" (barbell, chest)',
  url: 'https://ripit.test/admin/proposals/prop_abc123',
}

interface State {
  webhookUrl: string | undefined
  fetchMock: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.spyOn>
  payload: NotifyPayload
  rejects: boolean
  threw?: unknown
  resolved: boolean
}

let s = {} as State

function fresh() {
  // vitest-cucumber runs each step as its own test, so mocks are reset here,
  // once per scenario (every scenario's first step calls fresh()), rather than
  // in afterEach, which would wipe recorded calls between When and Then.
  vi.restoreAllMocks()
  s = {
    webhookUrl: undefined,
    fetchMock: vi.fn(async (_url: unknown, _init?: unknown) => {
      if (s.rejects) return new Response('rate limited', { status: 429 })
      return new Response(null, { status: 204 })
    }),
    warn: vi.spyOn(logger, 'warn').mockImplementation((() => {}) as never),
    payload: { ...PAYLOAD },
    rejects: false,
    resolved: false,
  }
  delete process.env.DISCORD_PROPOSALS_WEBHOOK_URL
}

const load = (spec: string) => import(/* @vite-ignore */ spec)

async function send() {
  const mod = (await load('@/lib/notify/discord')) as typeof import('@/lib/notify/discord')
  try {
    await mod.sendProposalToDiscord(s.payload, { webhookUrl: s.webhookUrl, fetch: s.fetchMock as unknown as typeof fetch })
    s.resolved = true
  } catch (e) {
    s.threw = e
  }
}

function postedBody(): {
  allowed_mentions: { parse: unknown[] }
  embeds: Array<{ title: string; description: string; url: string }>
} {
  expect(s.threw, `send threw: ${String(s.threw)}`).toBeUndefined()
  expect(s.fetchMock).toHaveBeenCalledTimes(1)
  const [url, init] = s.fetchMock.mock.calls[0] as [string, RequestInit]
  expect(url).toBe(WEBHOOK)
  expect(init.method).toBe('POST')
  expect(String((init.headers as Record<string, string>)['Content-Type'])).toMatch(/application\/json/)
  return JSON.parse(String(init.body))
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('A new proposal posts to the proposals channel', ({ Given, When, Then, And }) => {
    Given('the proposals webhook is configured', () => {
      fresh()
      s.webhookUrl = WEBHOOK
    })
    When('a proposal notification is sent', send)
    Then('one message is posted to the proposals webhook', () => {
      const body = postedBody()
      expect(body.embeds).toHaveLength(1)
    })
    And("the message links to the proposal's review page", () => {
      const embed = postedBody().embeds[0]
      expect(embed.url).toBe(PAYLOAD.url)
      expect(embed.url.endsWith(`/admin/proposals/${PAYLOAD.proposalId}`)).toBe(true)
    })
    And("the message shows the proposal's title and summary", () => {
      const embed = postedBody().embeds[0]
      expect(embed.title).toBe(PAYLOAD.title)
      expect(embed.description).toContain(PAYLOAD.body)
    })
  })

  Scenario('Agent text cannot ping anyone', ({ Given, When, Then }) => {
    Given('the proposals webhook is configured', () => {
      fresh()
      s.webhookUrl = WEBHOOK
    })
    When('a proposal notification is sent whose summary contains "@everyone"', async () => {
      s.payload = { ...PAYLOAD, body: 'ping @everyone and @here <@123456789> now' }
      await send()
    })
    Then('the posted message allows no mentions', () => {
      const body = postedBody()
      expect(body.allowed_mentions).toEqual({ parse: [] })
      expect(body.embeds[0].description).toContain('@everyone')
    })
  })

  Scenario('Long agent text is shortened', ({ Given, When, Then }) => {
    Given('the proposals webhook is configured', () => {
      fresh()
      s.webhookUrl = WEBHOOK
    })
    When('a proposal notification is sent with a 5000-character summary', async () => {
      s.payload = { ...PAYLOAD, title: 'T'.repeat(400), body: `x${'y'.repeat(4998)}z\u0000\u0007` }
      expect(s.payload.body.length).toBeGreaterThanOrEqual(5000)
      await send()
    })
    Then("the posted summary fits within Discord's limits", () => {
      const embed = postedBody().embeds[0]
      expect(embed.description.length).toBeGreaterThan(0)
      expect(embed.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION)
      expect(embed.title.length).toBeGreaterThan(0)
      expect(embed.title.length).toBeLessThanOrEqual(MAX_TITLE)
      // Control characters are stripped.
      // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting they are gone
      expect(embed.description).not.toMatch(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/)
      expect(embed.url).toBe(PAYLOAD.url)
    })
  })

  Scenario('No webhook configured', ({ Given, When, Then }) => {
    Given('the proposals webhook is not configured', () => {
      fresh()
      s.webhookUrl = undefined
    })
    When('a proposal notification is sent', send)
    Then('nothing is posted to Discord', () => {
      expect(s.threw, `send threw: ${String(s.threw)}`).toBeUndefined()
      expect(s.resolved).toBe(true)
      expect(s.fetchMock).not.toHaveBeenCalled()
    })
  })

  Scenario('Discord is down', ({ Given, And, When, Then }) => {
    Given('the proposals webhook is configured', () => {
      fresh()
      s.webhookUrl = WEBHOOK
    })
    And('Discord rejects the message', () => {
      s.rejects = true
    })
    When('a proposal notification is sent', send)
    Then('the failure is logged and not thrown', () => {
      expect(s.threw, `send threw: ${String(s.threw)}`).toBeUndefined()
      expect(s.resolved).toBe(true)
      expect(s.fetchMock).toHaveBeenCalledTimes(1)
      expect(s.warn).toHaveBeenCalled()
    })
  })
})
