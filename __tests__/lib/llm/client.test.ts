import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  LLMClient,
  LLMProviderError,
  LLMTimeoutError,
  LLMValidationError,
} from '@/lib/llm/client'

/**
 * Unit tests for `callWithStructuredOutput` using a mocked OpenAI client.
 *
 * We construct an LLMClient with explicit config, then monkeypatch the
 * underlying `openai.chat.completions.create` method on the instance.
 */

interface FakeChoice {
  content: string | null
}

function makeClient(responses: FakeChoice[]) {
  const client = new LLMClient({
    apiKey: 'test-key',
    baseURL: 'http://example.invalid',
    model: 'test-model',
  })

  // Reach into the private openai instance and replace the create fn.
  // biome-ignore lint/suspicious/noExplicitAny: test-only access
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openai = (client as any).openai as {
    chat: { completions: { create: (...args: unknown[]) => Promise<unknown> } }
  }
  let call = 0
  openai.chat.completions.create = vi.fn(async () => {
    const r = responses[call++] ?? { content: null }
    return {
      choices: [{ message: { content: r.content } }],
    }
  })

  return { client, createSpy: openai.chat.completions.create as ReturnType<typeof vi.fn> }
}

const schema = z.object({
  name: z.string(),
  reps: z.number(),
})

describe('LLMClient.callWithStructuredOutput', () => {
  it('parses valid JSON and returns data', async () => {
    const { client } = makeClient([
      { content: '{"name":"squat","reps":5}' },
    ])
    const result = await client.callWithStructuredOutput('go', schema)
    expect(result.data).toEqual({ name: 'squat', reps: 5 })
    expect(result.retries).toBe(0)
    expect(result.validationFailures).toBe(0)
    expect(result.model).toBe('test-model')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('cleans markdown fences before parsing', async () => {
    const { client } = makeClient([
      { content: '```json\n{"name":"squat","reps":5}\n```' },
    ])
    const result = await client.callWithStructuredOutput('go', schema)
    expect(result.data).toEqual({ name: 'squat', reps: 5 })
  })

  it('retries once on schema validation failure and succeeds', async () => {
    const { client, createSpy } = makeClient([
      { content: '{"name":"squat"}' }, // missing reps
      { content: '{"name":"squat","reps":5}' },
    ])
    const result = await client.callWithStructuredOutput('go', schema)
    expect(result.data).toEqual({ name: 'squat', reps: 5 })
    expect(result.retries).toBe(1)
    expect(result.validationFailures).toBe(1)
    expect(createSpy).toHaveBeenCalledTimes(2)
  })

  it('throws LLMValidationError after retry also fails', async () => {
    const { client } = makeClient([
      { content: '{"name":"squat"}' },
      { content: '{"name":"squat"}' },
    ])
    await expect(
      client.callWithStructuredOutput('go', schema),
    ).rejects.toBeInstanceOf(LLMValidationError)
  })

  it('throws LLMValidationError on unparseable JSON after retry', async () => {
    const { client } = makeClient([
      { content: 'not json at all' },
      { content: 'still not json' },
    ])
    await expect(
      client.callWithStructuredOutput('go', schema),
    ).rejects.toBeInstanceOf(LLMValidationError)
  })

  it('throws LLMProviderError on empty response', async () => {
    const { client } = makeClient([{ content: null }])
    await expect(
      client.callWithStructuredOutput('go', schema),
    ).rejects.toBeInstanceOf(LLMProviderError)
  })

  it('respects timeout', async () => {
    const client = new LLMClient({
      apiKey: 'k',
      baseURL: 'http://x.invalid',
      model: 'm',
    })
    // biome-ignore lint/suspicious/noExplicitAny: test-only access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openai = (client as any).openai as {
      chat: {
        completions: { create: (...args: unknown[]) => Promise<unknown> }
      }
    }
    openai.chat.completions.create = vi.fn(
      () => new Promise(() => {}), // never resolves
    )
    await expect(
      client.callWithStructuredOutput('go', schema, { timeoutMs: 20 }),
    ).rejects.toBeInstanceOf(LLMTimeoutError)
  })

  it('throws on missing API key', () => {
    const prev = process.env.LLM_API_KEY
    delete process.env.LLM_API_KEY
    try {
      expect(() => new LLMClient({ model: 'm' })).toThrow(LLMProviderError)
    } finally {
      if (prev !== undefined) process.env.LLM_API_KEY = prev
    }
  })

  it('throws on missing model', () => {
    const prev = process.env.LLM_MODEL
    delete process.env.LLM_MODEL
    try {
      expect(() => new LLMClient({ apiKey: 'k' })).toThrow(LLMProviderError)
    } finally {
      if (prev !== undefined) process.env.LLM_MODEL = prev
    }
  })

  it('passes system prompt into messages', async () => {
    const { client, createSpy } = makeClient([
      { content: '{"name":"squat","reps":5}' },
    ])
    await client.callWithStructuredOutput('go', schema, {
      system: 'you are a coach',
    })
    const args = createSpy.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>
    }
    expect(args.messages[0]).toEqual({
      role: 'system',
      content: 'you are a coach',
    })
    expect(args.messages[1]).toEqual({ role: 'user', content: 'go' })
  })

  it('includes retry context in the second-attempt prompt', async () => {
    const { client, createSpy } = makeClient([
      { content: '{"name":"squat"}' },
      { content: '{"name":"squat","reps":5}' },
    ])
    await client.callWithStructuredOutput('please return JSON', schema)
    const secondArgs = createSpy.mock.calls[1][0] as {
      messages: Array<{ role: string; content: string }>
    }
    const userMsg = secondArgs.messages.find((m) => m.role === 'user')
    expect(userMsg?.content).toContain('please return JSON')
    expect(userMsg?.content).toContain('failed validation')
  })
})
