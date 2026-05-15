import type { PrismaClient, WorkoutCompletion } from '@prisma/client'
import { prisma as defaultPrisma } from '@/lib/db'

type Tx = PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

export type AdHocCompletionLookupResult =
  | { ok: true; completion: WorkoutCompletion }
  | { ok: false; status: 404 | 403 | 400; error: string }

/**
 * Look up an ad-hoc WorkoutCompletion by id and verify it belongs to the
 * given user. Returns a structured result so callers can map to the
 * appropriate HTTP status without scattering ownership checks.
 */
export async function findAdHocCompletion(
  completionId: string,
  userId: string,
  client: Tx = defaultPrisma
): Promise<AdHocCompletionLookupResult> {
  const completion = await client.workoutCompletion.findUnique({
    where: { id: completionId },
  })

  if (!completion) {
    return { ok: false, status: 404, error: 'Workout not found' }
  }
  if (completion.userId !== userId) {
    return { ok: false, status: 403, error: 'Unauthorized' }
  }
  if (!completion.isAdHoc) {
    return { ok: false, status: 400, error: 'Not an ad-hoc workout' }
  }
  return { ok: true, completion }
}
