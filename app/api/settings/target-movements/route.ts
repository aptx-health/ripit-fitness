import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import {
  isAnchorPattern,
  MAX_ANCHOR_EXERCISES,
  type TargetMovements,
} from '@/lib/exercises/anchor-patterns'
import { logger } from '@/lib/logger'
import {
  checkRateLimitWithHeaders,
  programManagementLimiter,
} from '@/lib/rate-limit'
import {
  getOrCreateUserTrainingProfile,
  updateUserTrainingProfile,
} from '@/lib/user-training-profile'

/** Lightweight exercise shape the editor renders as selected chips. */
type AnchorExercise = {
  id: string
  name: string
  primaryFAUs: string[]
  secondaryFAUs: string[]
  equipment: string[]
}

type UpdateTargetMovementsRequest = {
  targetMovements?: Record<string, unknown>
}

/** Fetch id -> definition for every id referenced by the anchor map. */
async function resolveAnchorExercises(
  targetMovements: TargetMovements
): Promise<AnchorExercise[]> {
  const ids = Array.from(
    new Set(Object.values(targetMovements).flat().filter(Boolean))
  ) as string[]
  if (ids.length === 0) return []
  return prisma.exerciseDefinition.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      primaryFAUs: true,
      secondaryFAUs: true,
      equipment: true,
    },
  })
}

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getOrCreateUserTrainingProfile(prisma, user.id)
    const exercises = await resolveAnchorExercises(profile.targetMovements)

    return NextResponse.json({
      success: true,
      targetMovements: profile.targetMovements,
      exercises,
    })
  } catch (error) {
    logger.error(
      { error, context: 'target-movements-get' },
      'Failed to fetch target movements'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimitWithHeaders(
      programManagementLimiter,
      user.id,
      { endpoint: 'settings/target-movements' }
    )
    if (limited.response) return limited.response

    const body = (await request.json()) as UpdateTargetMovementsRequest
    const validationError = validateUpdateRequest(body)
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400, headers: limited.headers }
      )
    }

    // Drop ids that don't reference a real exercise definition so deleted /
    // bogus ids never persist. Structural normalization (valid patterns, dedupe,
    // cap 5) then happens inside updateUserTrainingProfile.
    const cleaned = await filterToExistingExercises(
      body.targetMovements as Record<string, string[]>
    )

    const profile = await updateUserTrainingProfile(prisma, user.id, {
      targetMovements: cleaned,
    })
    const exercises = await resolveAnchorExercises(profile.targetMovements)

    return NextResponse.json(
      { success: true, targetMovements: profile.targetMovements, exercises },
      { headers: limited.headers }
    )
  } catch (error) {
    logger.error(
      { error, context: 'target-movements-update' },
      'Failed to update target movements'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function validateUpdateRequest(
  body: UpdateTargetMovementsRequest
): string | null {
  const map = body.targetMovements
  if (map === undefined) {
    return 'targetMovements is required'
  }
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    return 'targetMovements must be an object keyed by movement pattern'
  }
  for (const [pattern, value] of Object.entries(map)) {
    if (!isAnchorPattern(pattern)) {
      return `Invalid movement pattern: ${pattern}`
    }
    if (!Array.isArray(value)) {
      return `Exercises for ${pattern} must be an array`
    }
    if (value.length > MAX_ANCHOR_EXERCISES) {
      return `Pick at most ${MAX_ANCHOR_EXERCISES} exercises for ${pattern}`
    }
    if (value.some((id) => typeof id !== 'string')) {
      return `Exercise ids for ${pattern} must be strings`
    }
  }
  return null
}

/** Keep only ids that exist in ExerciseDefinition, preserving per-pattern order. */
async function filterToExistingExercises(
  map: Record<string, string[]>
): Promise<TargetMovements> {
  const ids = Array.from(new Set(Object.values(map).flat().filter(Boolean)))
  if (ids.length === 0) return {}

  const existing = await prisma.exerciseDefinition.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  })
  const valid = new Set(existing.map((e) => e.id))

  const cleaned: TargetMovements = {}
  for (const [pattern, value] of Object.entries(map)) {
    if (!isAnchorPattern(pattern)) continue
    const kept = value.filter((id) => valid.has(id))
    if (kept.length > 0) cleaned[pattern] = kept
  }
  return cleaned
}
