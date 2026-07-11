/**
 * TuningConfig persistence — the singleton-row read path (issue #937).
 *
 * DEPENDENCY BOUNDARY (see #942): this module is reachable from the clone-worker
 * image via the aggregates recompute path. It MUST stay zod-free. It reads the
 * one-row TuningConfig table and delegates coercion to `parseTuningConfig`,
 * which applies per-field code-default fallback. Any read failure (missing
 * table, missing row, malformed JSON) degrades to DEFAULT_TUNING_CONFIG so the
 * pipeline is never broken by config state.
 *
 * The WRITE path (with zod range validation) lives in the admin API route.
 */

import type { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'
import {
  DEFAULT_TUNING_CONFIG,
  parseTuningConfig,
  type TuningConfig,
} from './config'

/** Fixed primary key for the single TuningConfig row. */
export const TUNING_CONFIG_SINGLETON_ID = 'singleton'

/**
 * Load the effective tuning config. Returns code defaults when no row exists or
 * on any read error. Callers pass the result down through the pipeline's options
 * objects; they never read raw knob values directly.
 */
export async function loadTuningConfig(prisma: PrismaClient): Promise<TuningConfig> {
  try {
    const row = await prisma.tuningConfig.findUnique({
      where: { id: TUNING_CONFIG_SINGLETON_ID },
      select: { values: true },
    })
    return parseTuningConfig(row?.values ?? null)
  } catch (error) {
    // A malformed/missing config must never break the pipeline — fall back.
    logger.warn({ error }, 'Failed to load TuningConfig; using code defaults')
    return DEFAULT_TUNING_CONFIG
  }
}
