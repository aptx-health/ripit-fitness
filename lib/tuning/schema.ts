/**
 * WRITE-PATH validation for TuningConfig (issue #937).
 *
 * This is the ONLY place zod touches the tuning feature. It is imported solely
 * by the admin write route (`app/api/admin/tuning-config`), never by the read
 * path — the clone-worker's aggregates compute must stay zod-free (#942). Ranges
 * are derived from the same TUNING_KNOBS table the read-path fallback uses, so
 * write validation and read coercion can never drift.
 */

import { z } from 'zod'
import { TUNING_KNOBS, type TuningConfig } from './config'

/** Build a zod object schema enforcing each knob's range + integer constraint. */
function buildTuningConfigSchema() {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const meta of TUNING_KNOBS) {
    let field = z
      .number({ error: `${meta.label} must be a number` })
      .min(meta.min, `${meta.label} must be ≥ ${meta.min}`)
      .max(meta.max, `${meta.label} must be ≤ ${meta.max}`)
    if (meta.integer) {
      field = field.int(`${meta.label} must be a whole number`)
    }
    shape[meta.key] = field
  }
  // strictObject rejects unknown keys — resist silently persisting stray knobs.
  return z.strictObject(shape)
}

/** Full-config schema: every knob required and in range. Rejects unknown keys. */
export const tuningConfigWriteSchema = buildTuningConfigSchema()

/**
 * Validate a candidate config for persistence. Returns the typed config on
 * success or a flat list of human-readable errors on failure.
 */
export function validateTuningConfigWrite(
  input: unknown,
): { ok: true; config: TuningConfig } | { ok: false; errors: string[] } {
  const result = tuningConfigWriteSchema.safeParse(input)
  if (result.success) {
    return { ok: true, config: result.data as unknown as TuningConfig }
  }
  const errors = result.error.issues.map((issue) =>
    issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
  )
  return { ok: false, errors }
}
