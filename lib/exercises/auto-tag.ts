/**
 * LLM-bootstrapped exercise tagger.
 *
 * Tags ExerciseDefinitions with `movementPattern` and `intensityClass`
 * by calling an LLM and caching the result to the database. Used by
 * the Suggest Workout feature (Milestone #868) so candidate filtering
 * can reason about movement patterns and fatigue cost.
 *
 * Downstream consumers MUST treat untagged exercises (null fields) as
 * "include" / no constraint — never filter them out.
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';

export const MOVEMENT_PATTERNS = [
  'squat',
  'hinge',
  'vertical_push',
  'horizontal_push',
  'vertical_pull',
  'horizontal_pull',
  'lunge',
  'carry',
  'isolation',
  'accessory',
] as const;

export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

export const INTENSITY_CLASSES = ['heavy', 'moderate', 'light'] as const;
export type IntensityClass = (typeof INTENSITY_CLASSES)[number];

export interface ExerciseTagInput {
  id: string;
  name: string;
  category?: string | null;
  primaryFAUs?: string[];
  secondaryFAUs?: string[];
  equipment?: string[];
  mechanic?: string | null;
  force?: string | null;
}

export interface ExerciseTagResult {
  id: string;
  movementPattern: MovementPattern;
  intensityClass: IntensityClass;
}

/**
 * Pluggable LLM caller. Production code injects an implementation that
 * hits the project's LLM client wrapper (#872). Tests inject a mock.
 */
export interface LLMTagger {
  /** Identifier of the model used — written to `taggedBy` for auditability. */
  readonly modelId: string;
  tag(exercises: ExerciseTagInput[]): Promise<ExerciseTagResult[]>;
}

export interface TagDeps {
  llm: LLMTagger;
  db?: typeof prisma;
}

export function buildTaggingPrompt(exercises: ExerciseTagInput[]): string {
  const lines = exercises.map((e) => {
    const parts = [
      `id=${e.id}`,
      `name="${e.name}"`,
      e.category ? `category=${e.category}` : null,
      e.mechanic ? `mechanic=${e.mechanic}` : null,
      e.force ? `force=${e.force}` : null,
      e.equipment?.length ? `equipment=[${e.equipment.join(',')}]` : null,
      e.primaryFAUs?.length ? `primary=[${e.primaryFAUs.join(',')}]` : null,
    ].filter(Boolean);
    return `- ${parts.join(' ')}`;
  });

  return [
    'Classify each strength-training exercise.',
    '',
    `movementPattern must be one of: ${MOVEMENT_PATTERNS.join(', ')}`,
    `intensityClass must be one of: ${INTENSITY_CLASSES.join(', ')} (typical systemic fatigue cost)`,
    '',
    'Return a JSON array of objects: { "id": string, "movementPattern": string, "intensityClass": string }',
    '',
    'Exercises:',
    ...lines,
  ].join('\n');
}

/** Validate a single tag result; throw on unknown labels. */
export function validateTagResult(r: unknown): ExerciseTagResult {
  if (!r || typeof r !== 'object') throw new Error('tag result not an object');
  const obj = r as Record<string, unknown>;
  if (typeof obj.id !== 'string') throw new Error('tag result missing id');
  if (!MOVEMENT_PATTERNS.includes(obj.movementPattern as MovementPattern)) {
    throw new Error(`invalid movementPattern: ${obj.movementPattern}`);
  }
  if (!INTENSITY_CLASSES.includes(obj.intensityClass as IntensityClass)) {
    throw new Error(`invalid intensityClass: ${obj.intensityClass}`);
  }
  return {
    id: obj.id,
    movementPattern: obj.movementPattern as MovementPattern,
    intensityClass: obj.intensityClass as IntensityClass,
  };
}

/** Tag a single exercise by id. */
export async function tagExercise(exerciseId: string, deps: TagDeps): Promise<void> {
  await tagExercises([exerciseId], deps);
}

/** Tag many exercises in a single LLM call; writes back per-row. */
export async function tagExercises(ids: string[], deps: TagDeps): Promise<void> {
  if (ids.length === 0) return;
  const db = deps.db ?? prisma;

  const defs = await db.exerciseDefinition.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      category: true,
      primaryFAUs: true,
      secondaryFAUs: true,
      equipment: true,
      mechanic: true,
      force: true,
    },
  });

  if (defs.length === 0) return;

  let results: ExerciseTagResult[];
  try {
    const raw = await deps.llm.tag(defs);
    results = raw.map(validateTagResult);
  } catch (error) {
    logger.error({ error, ids }, 'auto-tag: LLM call failed');
    throw error;
  }

  const now = new Date();
  const taggedBy = deps.llm.modelId;

  await Promise.all(
    results.map((r) =>
      db.exerciseDefinition.update({
        where: { id: r.id },
        data: {
          movementPattern: r.movementPattern,
          intensityClass: r.intensityClass,
          taggedAt: now,
          taggedBy,
        },
      }),
    ),
  );

  logger.info(
    { count: results.length, taggedBy },
    'auto-tag: tagged exercises',
  );
}

/**
 * Fire-and-forget lazy tagging — call this when candidate filtering
 * encounters an untagged exercise. Errors are swallowed (logged only)
 * so the request never blocks on the LLM.
 */
export function queueLazyTag(exerciseId: string, deps: TagDeps): void {
  void tagExercise(exerciseId, deps).catch((error) => {
    logger.warn({ error, exerciseId }, 'auto-tag: lazy tag failed');
  });
}
