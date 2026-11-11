import type { PrismaClient } from '@prisma/client'

/**
 * The user's effort scale (UserSettings.defaultIntensityRating). Effort maths
 * stays in RPE (a set's RIR reads as 10 − RIR); only the words and numbers
 * shown to the user follow the scale. Agents get the raw numbers as logged.
 */

export type EffortScale = 'rpe' | 'rir'

/** The setting as a scale; RIR (the schema default) unless it is 'rpe'. */
export function effortScaleOf(setting: string | null | undefined): EffortScale {
  return setting === 'rpe' ? 'rpe' : 'rir'
}

/** An RPE-scale effort in the given scale: RIR = 10 − RPE. */
export function inScale(rpe: number, scale: EffortScale): number {
  return scale === 'rir' ? 10 - rpe : rpe
}

/** The user's scale from their settings; RIR when they have none. */
export async function loadEffortScale(db: PrismaClient, userId: string): Promise<EffortScale> {
  const settings = await db.userSettings.findUnique({ where: { userId }, select: { defaultIntensityRating: true } })
  return effortScaleOf(settings?.defaultIntensityRating)
}
