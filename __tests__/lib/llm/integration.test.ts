import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { LLMClient } from '@/lib/llm/client'

/**
 * Integration test that hits a real LLM provider. Gated behind the
 * `LLM_INTEGRATION_TEST=true` env var so it does not run in CI by default.
 *
 * To run locally:
 *   LLM_INTEGRATION_TEST=true \
 *   LLM_PROVIDER_URL=... LLM_API_KEY=... LLM_MODEL=... \
 *   npm test integration
 */
const enabled = process.env.LLM_INTEGRATION_TEST === 'true'

describe.skipIf(!enabled)('LLMClient (real provider)', () => {
  it('returns a valid structured response', async () => {
    const client = new LLMClient()
    const schema = z.object({
      capital: z.string(),
      country: z.string(),
    })
    const result = await client.callWithStructuredOutput(
      'Return JSON with keys "country" and "capital" for France.',
      schema,
      { timeoutMs: 30_000 },
    )
    expect(result.data.country.toLowerCase()).toContain('france')
    expect(result.data.capital.toLowerCase()).toContain('paris')
  }, 60_000)
})
