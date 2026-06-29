# LLM Client

A thin provider-agnostic wrapper around the `openai` SDK so we can swap
LLM providers by changing environment variables. Used by the Suggest
Workout worker, the onboarding agent, and the exercise tagger.

## Configuration

The client reads three env vars via Doppler:

| Var                | Example                                                    |
| ------------------ | ---------------------------------------------------------- |
| `LLM_PROVIDER_URL` | `https://api.deepinfra.com/v1/openai`                      |
| `LLM_API_KEY`      | Provider API key                                           |
| `LLM_MODEL`        | `meta-llama/Meta-Llama-3.1-70B-Instruct` (provider-scoped) |

Any OpenAI-compatible endpoint works: DeepInfra, Together, Groq, Ollama
(`http://localhost:11434/v1`), or Anthropic via a proxy. There is **no
multi-provider fallback** — one provider per environment.

Optional:

- `LLM_DEBUG=true` — emit full prompt/response payloads at `debug` level
  via the shared `lib/logger.ts`.

## Basic usage

```ts
import { z } from 'zod'

import { getLLMClient } from '@/lib/llm/client'

const schema = z.object({
  exercises: z.array(
    z.object({
      name: z.string(),
      sets: z.number().int().positive(),
      reps: z.number().int().positive(),
    }),
  ),
})

const client = getLLMClient()
const { data, model, latencyMs, retries } = await client.callWithStructuredOutput(
  'Suggest a 4-exercise upper-body workout as JSON with keys "exercises".',
  schema,
  {
    system: 'You are a strength coach. Respond with JSON only.',
    temperature: 0.2,
    timeoutMs: 30_000,
  },
)
```

`data` is fully typed from the Zod schema. `model`, `latencyMs`, and
`retries` are useful for the Suggestion table audit trail.

## Output cleanup

Cheap models routinely return malformed JSON. `cleanLLMOutput`
(`lib/llm/clean-output.ts`) normalizes the common failure modes before
`JSON.parse`:

1. Strip markdown code fences (` ```json `, ` ```JSON `, plain ` ``` `).
2. Use depth-counted brace matching to extract the first balanced
   `{ ... }` or `[ ... ]` from arbitrary surrounding prose
   (e.g. `"Here's your workout: { ... } let me know!"`).
3. Try `JSON.parse`; on failure, apply repairs:
   - Remove trailing commas (`{"a":1,}` → `{"a":1}`)
   - Convert single-quoted JSON delimiters to double-quoted
4. Return the cleaned string. The caller is responsible for the final
   `JSON.parse`.

The function is pure and heavily unit-tested
(`__tests__/lib/llm/clean-output.test.ts`).

## Validation + retry

`callWithStructuredOutput` runs the cleaned response through Zod
`safeParse`. On failure it retries **once** with the original prompt plus
the Zod error message and a truncated copy of the bad response, then
gives up.

Outcomes:

| Outcome                                  | Result                                |
| ---------------------------------------- | ------------------------------------- |
| Valid JSON, valid schema                 | `{ data, model, latencyMs, retries }` |
| Cleanup fixes JSON, valid schema         | `retries=0`, `validationFailures=0`   |
| Invalid first time, valid after retry    | `retries=1`, `validationFailures=1`   |
| Invalid both times                       | throws `LLMValidationError`           |
| Provider error / empty content           | throws `LLMProviderError`             |
| Call exceeds `timeoutMs` (default 60 s)  | throws `LLMTimeoutError`              |

## Error types

```ts
import {
  LLMProviderError,
  LLMValidationError,
  LLMTimeoutError,
} from '@/lib/llm/client'

try {
  await client.callWithStructuredOutput(prompt, schema)
} catch (err) {
  if (err instanceof LLMValidationError) {
    // err.rawResponse, err.issues
  } else if (err instanceof LLMTimeoutError) {
    // err.timeoutMs
  } else if (err instanceof LLMProviderError) {
    // err.cause, err.status
  }
}
```

## Testing

- **Unit tests**: `npm test clean-output` and `npm test llm/client`
  (mock-based, no network).
- **Integration test**: gated behind `LLM_INTEGRATION_TEST=true`. Set
  the three `LLM_*` env vars and run:

  ```bash
  LLM_INTEGRATION_TEST=true \
    LLM_PROVIDER_URL=... LLM_API_KEY=... LLM_MODEL=... \
    npm test llm/integration
  ```

## Out of scope (deferred)

- Streaming responses (v2).
- Per-call cost tracking — sum costs from the `Suggestion` table.
- Per-call response caching — that's the consumer's concern.
- Multi-provider fallback.
