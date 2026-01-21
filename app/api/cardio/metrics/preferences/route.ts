import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { isValidEquipment, getAllMetrics } from '@/lib/cardio'
import type { SaveMetricPreferencesRequest } from '@/lib/cardio/types'

/**
 * POST /api/cardio/metrics/preferences
 * Save user's custom metric preferences for equipment
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: SaveMetricPreferencesRequest = await request.json()

    // Validate equipment
    if (!body.equipment || !isValidEquipment(body.equipment)) {
      return NextResponse.json(
        { success: false, error: 'Valid equipment is required' },
        { status: 400 }
      )
    }

    // Validate metrics array
    if (!Array.isArray(body.metrics) || body.metrics.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Metrics array is required' },
        { status: 400 }
      )
    }

    // Validate all metrics are valid
    const allMetrics = getAllMetrics()
    const invalidMetrics = body.metrics.filter(m => !allMetrics.includes(m))
    if (invalidMetrics.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid metrics: ${invalidMetrics.join(', ')}` },
        { status: 400 }
      )
    }

    // Upsert preferences
    const preferences = await prisma.userCardioMetricPreferences.upsert({
      where: {
        userId_equipment: {
          userId: user.id,
          equipment: body.equipment
        }
      },
      update: {
        customMetrics: body.metrics,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        equipment: body.equipment,
        customMetrics: body.metrics
      }
    })

    return NextResponse.json({
      success: true,
      preferences
    })
  } catch (error) {
    console.error('Error saving metric preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
