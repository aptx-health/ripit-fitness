/**
 * Backfill exercise tags for the top-100 most-used ExerciseDefinitions.
 *
 * Usage:
 *   doppler run --config dev_personal -- npx tsx scripts/backfill-exercise-tags.ts
 *
 * Requires an LLM client. Until #872 lands, plug a tagger in by editing
 * `createLLMTagger()` below or set `ANTHROPIC_API_KEY` to use the
 * default Anthropic-backed implementation.
 */

import { PrismaClient } from '@prisma/client';
import {
  type ExerciseTagInput,
  type ExerciseTagResult,
  type LLMTagger,
  MOVEMENT_PATTERNS,
  INTENSITY_CLASSES,
  buildTaggingPrompt,
  tagExercises,
} from '../lib/exercises/auto-tag';

const BATCH_SIZE = 20;
const TOP_N = 100;

const prisma = new PrismaClient();

function createLLMTagger(): LLMTagger {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.TAGGER_MODEL ?? 'claude-3-5-sonnet-20241022';

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY not set. Either export it or wire up the project LLM client (#872).',
    );
  }

  return {
    modelId: model,
    async tag(exercises: ExerciseTagInput[]): Promise<ExerciseTagResult[]> {
      const prompt = buildTaggingPrompt(exercises);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\nRespond ONLY with the JSON array, no prose.`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Anthropic API ${response.status}: ${body}`);
      }

      const data = (await response.json()) as {
        content: Array<{ type: string; text?: string }>;
      };
      const text = data.content.find((c) => c.type === 'text')?.text ?? '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error(`No JSON array found in LLM response: ${text.slice(0, 200)}`);
      }
      const parsed = JSON.parse(jsonMatch[0]) as ExerciseTagResult[];
      // Drop anything malformed; downstream validateTagResult will re-check.
      return parsed.filter(
        (r) =>
          r &&
          typeof r.id === 'string' &&
          (MOVEMENT_PATTERNS as readonly string[]).includes(r.movementPattern) &&
          (INTENSITY_CLASSES as readonly string[]).includes(r.intensityClass),
      );
    },
  };
}

async function getTopExerciseIds(limit: number): Promise<string[]> {
  // Rank by number of Exercise rows referencing each definition (proxy for usage).
  const rows = await prisma.exercise.groupBy({
    by: ['exerciseDefinitionId'],
    _count: { exerciseDefinitionId: true },
    orderBy: [{ _count: { exerciseDefinitionId: 'desc' } }, { exerciseDefinitionId: 'asc' }],
    take: limit,
  });
  return rows.map((r) => r.exerciseDefinitionId);
}

async function main(): Promise<void> {
  const llm = createLLMTagger();
  console.log(`[backfill] selecting top ${TOP_N} exercise definitions by usage...`);
  const ids = await getTopExerciseIds(TOP_N);
  console.log(`[backfill] found ${ids.length} exercises, batching by ${BATCH_SIZE}`);

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    console.log(`[backfill] batch ${i / BATCH_SIZE + 1} (${batch.length} ids)`);
    try {
      await tagExercises(batch, { llm, db: prisma });
    } catch (error) {
      console.error('[backfill] batch failed, continuing:', error);
    }
  }

  console.log('[backfill] done');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
