import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

type UpdateSettingsRequest = {
  displayName?: string
  defaultWeightUnit?: 'lbs' | 'kg'
  defaultIntensityRating?: 'rpe' | 'rir'
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch or create user settings using upsert to avoid race conditions
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        displayName: null,
        defaultWeightUnit: 'lbs',
        defaultIntensityRating: 'rpe'
      }
    })

    return NextResponse.json({
      success: true,
      settings
    })
  } catch (error) {
    console.error('Error fetching user settings:', error)
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
    const { displayName, defaultWeightUnit, defaultIntensityRating } = body

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

    // Update or create settings
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        ...(displayName !== undefined && { displayName: displayName?.trim() || null }),
        ...(defaultWeightUnit && { defaultWeightUnit }),
        ...(defaultIntensityRating && { defaultIntensityRating }),
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        displayName: displayName?.trim() || null,
        defaultWeightUnit: defaultWeightUnit || 'lbs',
        defaultIntensityRating: defaultIntensityRating || 'rpe'
      }
    })

    return NextResponse.json({
      success: true,
      settings
    })
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
