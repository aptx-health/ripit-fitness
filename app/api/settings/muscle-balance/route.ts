import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  getMuscleBalanceSnapshot,
  isFAUKey,
  type MuscleBalanceTargets,
  updateMuscleBalanceSettings,
} from '@/lib/muscle-balance'
import {
  checkRateLimitWithHeaders,
  programManagementLimiter,
} from '@/lib/rate-limit'

type UpdateMuscleBalanceRequest = {
  targets?: Record<string, unknown>
  lookbackWorkouts?: unknown
  lookbackDays?: unknown
  includeSecondary?: unknown
  secondaryWeight?: unknown
  excludeWarmups?: unknown
}

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const snapshot = await getMuscleBalanceSnapshot(prisma, user.id)
    return NextResponse.json({ success: true, snapshot })
  } catch (error) {
    logger.error(
      { error, context: 'muscle-balance-get' },
      'Failed to fetch muscle balance settings'
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
      { endpoint: 'settings/muscle-balance' }
    )
    if (limited.response) return limited.response

    const body = (await request.json()) as UpdateMuscleBalanceRequest
    const validationError = validateUpdateRequest(body)
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400, headers: limited.headers }
      )
    }

    await updateMuscleBalanceSettings(prisma, user.id, {
      targets: body.targets as MuscleBalanceTargets | undefined,
      lookbackWorkouts: body.lookbackWorkouts as number | undefined,
      lookbackDays: body.lookbackDays as number | undefined,
      includeSecondary: body.includeSecondary as boolean | undefined,
      secondaryWeight: body.secondaryWeight as number | undefined,
      excludeWarmups: body.excludeWarmups as boolean | undefined,
    })

    const snapshot = await getMuscleBalanceSnapshot(prisma, user.id)
    return NextResponse.json(
      { success: true, snapshot },
      { headers: limited.headers }
    )
  } catch (error) {
    logger.error(
      { error, context: 'muscle-balance-update' },
      'Failed to update muscle balance settings'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function validateUpdateRequest(body: UpdateMuscleBalanceRequest): string | null {
  if (body.targets !== undefined) {
    if (!body.targets || typeof body.targets !== 'object' || Array.isArray(body.targets)) {
      return 'Targets must be an object keyed by muscle group'
    }
    for (const [fau, value] of Object.entries(body.targets)) {
      if (!isFAUKey(fau)) return `Invalid muscle group: ${fau}`
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return `Target for ${fau} must be a number`
      }
      if (value < 0 || value > 2) {
        return `Target for ${fau} must be between 0 and 2`
      }
    }
  }

  if (
    body.lookbackWorkouts !== undefined &&
    (!Number.isInteger(body.lookbackWorkouts) ||
      (body.lookbackWorkouts as number) < 1 ||
      (body.lookbackWorkouts as number) > 52)
  ) {
    return 'Lookback workouts must be an integer between 1 and 52'
  }

  if (
    body.lookbackDays !== undefined &&
    (!Number.isInteger(body.lookbackDays) ||
      (body.lookbackDays as number) < 1 ||
      (body.lookbackDays as number) > 365)
  ) {
    return 'Lookback days must be an integer between 1 and 365'
  }

  if (
    body.secondaryWeight !== undefined &&
    (typeof body.secondaryWeight !== 'number' ||
      !Number.isFinite(body.secondaryWeight) ||
      body.secondaryWeight < 0 ||
      body.secondaryWeight > 1)
  ) {
    return 'Secondary weight must be between 0 and 1'
  }

  if (
    body.includeSecondary !== undefined &&
    typeof body.includeSecondary !== 'boolean'
  ) {
    return 'includeSecondary must be a boolean'
  }

  if (body.excludeWarmups !== undefined && typeof body.excludeWarmups !== 'boolean') {
    return 'excludeWarmups must be a boolean'
  }

  return null
}
