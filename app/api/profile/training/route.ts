import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  checkRateLimitWithHeaders,
  programManagementLimiter,
} from '@/lib/rate-limit'
import {
  getOrCreateUserTrainingProfile,
  type UserTrainingProfileUpdate,
  updateUserTrainingProfile,
} from '@/lib/user-training-profile'

/**
 * Fields the Goals Wizard is allowed to write. Deliberately excludes
 * interview-owned (`goalSentences`, `weeklyIntent`) and separately-owned
 * fields (`equipmentAvailable` -> #927, `ratioTargets` -> #928,
 * `bannedExerciseIds`). Keeping `goalSentences` empty here is what lets the
 * training-state builder synthesize cold-start sentences from these fields
 * (see docs/SUGGEST_PAYLOAD_SPEC.md § Goal-sentence synthesis).
 */
const WRITABLE_FIELDS = [
  'goalCategories',
  'otherActivities',
  'fauImportance',
  'defaultIntensityPreference',
  'targetSessionsPerWeek',
  'targetMinutesPerSession',
  'patternPreference',
  'preferredDays',
  'injuryAreas',
  'birthYear',
  'biologicalSex',
  'heightCm',
  'weightKg',
] as const satisfies readonly (keyof UserTrainingProfileUpdate)[]

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getOrCreateUserTrainingProfile(prisma, user.id)
    return NextResponse.json({ success: true, profile })
  } catch (error) {
    logger.error(
      { error, context: 'profile-training-get' },
      'Failed to fetch training profile'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimitWithHeaders(
      programManagementLimiter,
      user.id,
      { endpoint: 'profile/training' }
    )
    if (limited.response) return limited.response

    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400, headers: limited.headers }
      )
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Body must be an object of training-profile fields' },
        { status: 400, headers: limited.headers }
      )
    }

    // Whitelist: only pass through fields the wizard owns. Values are trusted
    // to the accessor, which normalizes/clamps invalid input to null/empty
    // rather than throwing (so a skipped step just nulls its fields).
    const update: UserTrainingProfileUpdate = {}
    for (const field of WRITABLE_FIELDS) {
      if (field in body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(update as any)[field] = body[field]
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: 'No writable fields provided' },
        { status: 400, headers: limited.headers }
      )
    }

    const profile = await updateUserTrainingProfile(prisma, user.id, update)
    return NextResponse.json(
      { success: true, profile },
      { headers: limited.headers }
    )
  } catch (error) {
    logger.error(
      { error, context: 'profile-training-patch' },
      'Failed to update training profile'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
