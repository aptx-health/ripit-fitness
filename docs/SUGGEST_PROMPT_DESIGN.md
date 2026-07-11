# Suggest Workout Prompt Design

Companion to `lib/llm/prompts/suggest-workout/`. This documents *why* the
prompt is shaped the way it is, so future edits don't quietly undo a
deliberate decision. The locked payload contract lives in the comment on
issue #877 (note: some older references say #876 — the numbering shuffle
documented in Discussion #868 applies). Output UX is issue #880.

## Wiring

```typescript
import {
  assembleSuggestWorkoutPrompt,
  buildSuggestionResponseSchema,
  buildSuggestRetryPrompt,
  summarizeValidationError,
} from '@/lib/llm/prompts/suggest-workout'

const prompt = assembleSuggestWorkoutPrompt(payload)
const schema = buildSuggestionResponseSchema(prompt.candidateIds, prompt.countRange)
const result = await getLLMClient().callWithStructuredOutput(prompt.user, schema, {
  system: prompt.system,
})
```

On `LLMValidationError` (thrown after the client's internal retry), make
one worker-level retry:

```typescript
const retryPrompt = buildSuggestRetryPrompt({
  errorSummary: summarizeValidationError(err.issues),
  previousOutput: err.rawResponse,
  candidateIds: prompt.candidateIds,
  countRange: prompt.countRange,
})
const retried = await getLLMClient().callWithStructuredOutput(retryPrompt, schema, {
  system: prompt.system,
})
```

If that also fails, mark the `Suggestion` row `failed` — do not loop.

## Design rationale, section by section

### Static system prompt, dynamic user message

Everything user-specific lives in the user message. The system prompt is
a single constant, byte-identical across all users and requests. Two
reasons:

1. **Prompt caching.** Anthropic and OpenAI cache by prefix. A static
   system prompt is cached after the first call; a system prompt with
   even one interpolated value never is.
2. **Iteration discipline.** When behavior changes, you know it was the
   payload or the model — not an interpolation bug in instructions.

### The payload is rendered as text, not passed as JSON

The builder produces JSON (locked contract, #877), but the prompt
renders it into compact labeled sections. Three reasons:

1. **Tokens.** Key names repeated across 100 candidate objects
   (`"movement_pattern":` × 100) are pure waste. The pipe-table format
   costs roughly 60% of the equivalent JSON.
2. **Input/output separation.** If the input is a wall of JSON, cheap
   models blur "JSON I read" with "JSON I write" and echo input
   structure into output. In this design the only JSON the model ever
   sees is shaped exactly like what it must produce (skeleton +
   example output).
3. **Nested-object confusion.** Cheap models lose track of deeply
   nested payloads. Flat labeled sections with one fact per line don't
   have that failure mode.

Two payload fields are deliberately **not rendered**:

- `banned_exercise_ids` — bans are enforced upstream by candidate
  filtering. Telling the model about exercises it cannot see invites it
  to reason about (and name) exercises outside the candidate list.
- `ratio_targets` — fully expressed by the per-FAU `target`/`deficit`
  columns. Rendering the raw dict would be the same information twice,
  and duplicated signals get double-counted by small models.

### Candidate table: id first, one line per exercise

```
id | name | muscles | equipment | pattern | intensity | preference
exr_abc123 | Incline Dumbbell Press | chest,front-delts +triceps | dumbbells | horizontal_push | moderate | 0.78
```

Hallucinated ids are the primary failure mode (#880). The mitigations,
in order of effect:

1. The id is the **first token of each line** — models copy
   line-leading tokens far more reliably than values buried in prose.
2. The header says "the only N exercise ids that exist" — a positive
   framing ("these exist") rather than a prohibition ("never invent"),
   which cheap models handle better.
3. The output requires `name` **next to** `id`. Writing the name forces
   the model's attention through the actual candidate row instead of
   pattern-completing a plausible id. The name is validated for
   presence only — the transform step reads the canonical name from the
   DB — so a paraphrased name can never fail a correct id.
4. zod refinement rejects unknown ids **listing the offenders** in the
   message, which the client feeds back on retry.

Item 3 is an addition to the locked output shape in #877 (which had
`{ id, rationale }`). It is additive and costs ~80 output tokens per
response. Treat it as a proposed amendment to the contract; if it's
rejected, delete `name` from `suggestedExerciseSchema` and the skeleton
— nothing else depends on it.

### TODAY'S REQUEST is the last content section

Long-context models attend most strongly to the beginning and end of a
prompt; cheap models mostly the end. The ephemeral input is the one
section that must never be ignored (a suggestion that ignores "legs
sore" is worse than useless), so it gets the recency slot — after the
candidate list, immediately before the final instruction. The section
header also binds it to an option by name ("user_preference must be
built around this"), so the instruction survives even if the model
skims the middle.

### Exercise counts are precomputed

The model never converts minutes to exercise counts. `exerciseCountRange`
maps the time budget to a min–max range which appears (a) in the
request section, (b) in the final instruction, and (c) in the zod
refinement — all from the same function, so instruction and check
cannot drift. LLM arithmetic is a known reliability sink on
Haiku/8B-tier models; don't reintroduce it.

### Option distinctness: recipes, not adjectives

"Make the options distinct" does not survive contact with a small
model. What works is giving each option a different *procedure* with a
different *input*:

- `user_preference` reads TODAY'S REQUEST.
- `data_driven` reads TRAINING STATE and is explicitly told the request
  does not steer it (safety inputs excepted).
- `wild_card` is defined by rotation away from logged history, with an
  anchor rule (≥ half the exercises still serve goals/deficits) so it
  stays defensible rather than random.

The convergence case (request already matches the data) gets an explicit
tie-breaking rule in the system prompt. The schema backstops collapse:
identical `user_preference`/`data_driven` sets are rejected, and
`wild_card` must contain ≥ 2 exercises absent from both others (≥ 1 for
very short sessions — see `wildCardNoveltyFloor`).

### Counteracting training bias

Models trained on general fitness content over-recommend bodyweight and
band work "to be safe." The system prompt states the house position
("bands and bodyweight are fillers, not defaults") as a **positive
selection principle**, not a prohibition. Same technique for readiness
(heavy 1–2 days ago → not ready) and safety (stated pain beats every
deficit signal). Cheap models follow "do X when Y" far better than
"never do Z" walls — that's why the system prompt contains exactly four
HARD RULES and everything else is procedure.

### Rationale voice

The rationale copy is a product surface (#880: users pick an option
partly on the explanation). Constraints that matter:

- "One sentence each" — a hard, checkable shape beats "be concise."
- "Use only numbers that appear in the input" — small models fabricate
  impressive-sounding stats; a rationale citing a number the user can't
  find in their history destroys trust in exactly the way the
  "what the AI sees" panel (#879) is meant to build it.
- Banned styles are named concretely (emoji, exclamation points, hype
  words) instead of vaguely ("professional tone").

### One few-shot example, archetype-matched

Five to ten examples in-context would cost 4–8k tokens and — worse —
teach the model to reuse example exercise ids. So:

- The library (`few-shot-examples.ts`) holds six archetypes; exactly
  **one** is included per request, chosen by structural signals first
  (no calibration → beginner; everything ≥ 14 days stale → returning;
  ≤ 25 minutes → short-session) and keyword match second.
- Example ids use a `demo_` prefix. If one ever leaks into output, the
  validation error is self-evident in logs.
- The example opens with "the exercises below are NOT in today's
  candidate list; never reuse their ids."
- Example output is rendered as **compact JSON** (no whitespace).
  Models imitate the format they see; compact output roughly halves
  output-token cost and parses identically.
- If the payload is large, the example is dropped automatically
  (`maxTotalTokens`, default 6000 estimated). A big payload means a
  data-rich user — precisely the case where the example adds least.

The examples do double duty as regression fixtures: the test suite
validates every example's output against the real per-request schema,
so the "ground truth" in the prompt can never drift out of sync with
validation. If you edit an example, run
`npm test suggest-workout-prompt`.

## Failure modes and mitigations

| Failure mode | Seen in | Mitigation | Where |
|---|---|---|---|
| Hallucinated exercise ids | All cheap models | id-first table, name echo, positive framing, refinement message lists offenders | candidates renderer, output schema |
| Example ids leak into output | Few-shot prompts generally | one example max, `demo_` prefix, explicit "not available today" framing | few-shot-examples.ts |
| Three near-identical options | Any "give me N variants" prompt | per-option procedures with different inputs, convergence tie-breaker, set-equality + novelty refinements | system prompt, schema |
| Ephemeral input ignored | Large payloads, small models | request rendered last, bound to `user_preference` by name, restated in final instruction | assembly order |
| Markdown fences / prose preamble | JSON-mode-less providers | `cleanLLMOutput` (shipped), HARD RULE 4, no-schema variant appends first/last-char rule | client, provider-variants |
| Missing `warnings` key | Optional fields on cheap models | prompt says "always present"; schema `.default([])` so absence never burns a retry | schema |
| Wrong option order | 8B-tier models | order stated in three places; refinement message names the expected id per index | schema |
| Invented statistics in rationales | All models | "only numbers that appear in the input" | system prompt |
| Set/rep prescriptions sneaking in | Models' training prior (workouts have sets) | output shape has nowhere to put them; system prompt says the user logs sets live | schema |
| Bodyweight/band over-recommendation | General-fitness training bias | equipment hierarchy stated as selection principle | system prompt |
| Count arithmetic errors | Small models | precomputed range, shared function for instruction + check | `exerciseCountRange` |
| First-JSON extraction grabs reasoning fragment | Thinking models | "no braces in reasoning" instruction; focused retry | provider-variants |

## Provider matrix

| Provider | Variant | Notes |
|---|---|---|
| Anthropic | `buildAnthropicToolRequest` | Forced tool call — the model *cannot* return prose. Strongest option. Requires native Messages API (or a proxy that forwards tools). |
| OpenAI | `buildOpenAIStructuredRequest` | `json_schema` strict mode. The shared JSON schema intentionally uses only the keyword subset strict mode accepts (no min/max constraints). |
| DeepInfra / Groq / Together | `buildJsonModeRequest` | What `LLMClient` does today (`response_format: json_object`). |
| Anything else (incl. raw Ollama) | `buildNoSchemaRequest` | Prompt-only. Leans on `cleanLLMOutput` + retry. Expect a higher retry rate; still workable. |
| DeepSeek-R1 class / o-series | `buildThinkingModelRequest` | No `response_format`; 180s timeout; "no braces in reasoning" guard. On validation failure prefer the focused retry — the model understood the task, the extraction failed. |

Provider-side schemas **never replace** zod validation: they cannot
check candidate-id membership, counts, ordering, or distinctness. Every
variant's output goes through `buildSuggestionResponseSchema`.

## Retry design

Two layers, different jobs:

1. **Client-internal retry** (shipped, `lib/llm/client.ts`): re-sends
   the full prompt with zod issues appended. This works here because
   every refinement message in `buildSuggestionResponseSchema` is
   written as a repair instruction ("Replace each with an id copied
   exactly from the CANDIDATE EXERCISES list"), not as a developer
   assertion. **The schema messages are part of the prompt design.**
2. **Worker-level focused retry** (`retry-prompt.ts`): if the client
   still throws, one more call with error + rules + valid ids +
   previous output — no profile, no training state. About a quarter of
   the tokens, and a simpler task ("fix this JSON") that cheap models
   complete more reliably than a full re-plan.

After that: `Suggestion.status = 'failed'`. Never loop.

## Token budget

Estimates via `estimateTokens` (chars/4 — overestimates English prose by
~20%, which is the safe direction):

| Part | Estimated tokens |
|---|---|
| System prompt | ~1,100 |
| Few-shot example (largest) | ~1,000 |
| Profile + training state (typical) | ~500–700 |
| Candidates (100 × ~22) | ~2,200 |
| Request + final instruction | ~150 |
| **Typical total** | **~5,000–5,300** |

The 6,000 ceiling (`maxTotalTokens`) sheds the example first. If
payloads grow past that, cut candidate count in the builder (the
deterministic filter should get more aggressive) before cutting prompt
sections here.

## Deviations from / amendments to the locked #877 contract

Flagging explicitly since the contract says changes require agreement:

1. **`exercises[].name` added to the output shape** — anti-hallucination
   grounding (see above). Additive; transform ignores it.
2. **`per_movement_calibration[].typical_rpe` is nullable** — RPE/RIR
   logging is opt-in, so the builder cannot always produce it. The spec
   sample showed a bare number; the schema accepts `null` and the
   renderer omits the RPE clause.
3. **Exercise-count enforcement band** — #877 left "count fits time
   budget" undefined; `exerciseCountRange` defines it (~8 min/exercise,
   generous bands). This is now load-bearing for validation.
4. **Distinctness refinements** — set-inequality between
   `user_preference`/`data_driven` and the wild-card novelty floor are
   new validation semantics not in #877.

## Anti-pattern lint checklist for future edits

Before merging any change to this module, check:

- [ ] No new "you must NEVER…" walls in the system prompt. State the
      desired behavior positively; reserve HARD RULES for the four
      structural invariants.
- [ ] System prompt is still a static constant — no interpolation.
- [ ] Any new instruction that has a numeric threshold gets the number
      computed in TypeScript and injected, never left for the model to
      derive.
- [ ] The output skeleton in the system prompt, the JSON schema in
      `provider-variants.ts`, and `suggestionResponseBaseSchema` still
      describe the same shape (three sources — keep them in sync, and
      keep the test green).
- [ ] New payload fields are either rendered by a section renderer or
      explicitly listed as not-rendered with a reason (see
      `renderDurableProfile` comments). Silent drops are how payload
      work gets wasted.
- [ ] Few-shot example edits still pass
      `npm test suggest-workout-prompt` (schema validity, novelty
      floor, count ranges).
- [ ] No instruction assumes the model shares our bias (e.g. "pick
      safe exercises" — its notion of safe is bands and bodyweight).
- [ ] Refinement messages still read as instructions to the model, not
      assertions for developers.
- [ ] `TODAY'S REQUEST` is still the last content section.
- [ ] Estimated typical total still ≤ 6,000 tokens (check the test).

## What to change vs. what to leave alone when iterating

**Cheap to change, iterate freely:**

- Selection principles wording (readiness windows, equipment hierarchy)
- Rationale voice rules
- Warning trigger conditions
- Few-shot example content (keep the test green)
- Archetype selection heuristics
- `exerciseCountRange` bands

**Change only with evidence from real failures:**

- Section ordering (the request-last position is the mitigation for the
  single worst failure mode)
- The candidate table format (id-first is load-bearing)
- One-example policy (more examples = id bleed + budget blowout)
- HARD RULES count and phrasing (four is deliberate; every addition
  dilutes the others)

**Don't change here at all:**

- The payload contract — that's #877, change it there first
- Validation semantics the UI depends on (three options, fixed ids) —
  that's #880's contract
- Retry counts — the two-layer, one-each design is a cost ceiling;
  looping retries turns a bad model day into a bill
