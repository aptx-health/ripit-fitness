import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

type UpdateSettingsRequest = {
  displayName?: string
  defaultWeightUnit?: 'lbs' | 'kg'
  defaultIntensityRating?: 'rpe' | 'rir'
  dismissedPrimer?: boolean
  dismissedWarmup?: boolean
  dismissedStickNudge?: boolean
  completedTours?: string
  postSessionPromptCount?: number
  lastPostSessionPromptAt?: string
}

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch or create user settings — retry on race condition (P2002)
    let settings: Awaited<ReturnType<typeof prisma.userSettings.upsert>> | undefined
    try {
      settings = await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          displayName: null,
          defaultWeightUnit: 'lbs',
          defaultIntensityRating: 'rir'
        }
      })
    } catch (upsertError: unknown) {
      if (upsertError && typeof upsertError === 'object' && 'code' in upsertError && upsertError.code === 'P2002') {
        settings = await prisma.userSettings.findUniqueOrThrow({
          where: { userId: user.id }
        })
      } else {
        throw upsertError
      }
    }

    return NextResponse.json({
      success: true,
      settings
    })
  } catch (error) {
    logger.error({ error, context: 'settings-get' }, 'Failed to fetch user settings')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as UpdateSettingsRequest
    const { displayName, defaultWeightUnit, defaultIntensityRating, dismissedPrimer, dismissedWarmup, dismissedStickNudge, completedTours, postSessionPromptCount, lastPostSessionPromptAt } = body

    // Validate weight unit
    if (defaultWeightUnit && !['lbs', 'kg'].includes(defaultWeightUnit)) {
      return NextResponse.json(
        { error: 'Invalid weight unit. Must be "lbs" or "kg"' },
        { status: 400 }
      )
    }

    // Validate intensity rating
    if (defaultIntensityRating && !['rpe', 'rir'].includes(defaultIntensityRating)) {
      return NextResponse.json(
        { error: 'Invalid intensity rating. Must be "rpe" or "rir"' },
        { status: 400 }
      )
    }

    // Validate postSessionPromptCount
    if (postSessionPromptCount !== undefined && (typeof postSessionPromptCount !== 'number' || postSessionPromptCount < 0 || !Number.isInteger(postSessionPromptCount))) {
      return NextResponse.json(
        { error: 'Invalid postSessionPromptCount. Must be a non-negative integer' },
        { status: 400 }
      )
    }

    // Update or create settings
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        ...(displayName !== undefined && { displayName: displayName?.trim() || null }),
        ...(defaultWeightUnit && { defaultWeightUnit }),
        ...(defaultIntensityRating && { defaultIntensityRating }),
        ...(dismissedPrimer !== undefined && { dismissedPrimer }),
        ...(dismissedWarmup !== undefined && { dismissedWarmup }),
        ...(dismissedStickNudge !== undefined && { dismissedStickNudge }),
        ...(completedTours !== undefined && { completedTours }),
        ...(postSessionPromptCount !== undefined && { postSessionPromptCount }),
        ...(lastPostSessionPromptAt !== undefined && { lastPostSessionPromptAt: new Date(lastPostSessionPromptAt) }),
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        displayName: displayName?.trim() || null,
        defaultWeightUnit: defaultWeightUnit || 'lbs',
        defaultIntensityRating: defaultIntensityRating || 'rir'
      }
    })

    return NextResponse.json({
      success: true,
      settings
    })
  } catch (error) {
    logger.error({ error, context: 'settings-update' }, 'Failed to update user settings')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
