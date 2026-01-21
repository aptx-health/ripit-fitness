import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getMetricsForEquipment, isValidEquipment } from '@/lib/cardio'
import type { CardioEquipment } from '@/lib/cardio'

/**
 * GET /api/cardio/metrics/[equipment]
 * Get metric profile for equipment (custom preferences or defaults)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ equipment: string }> }
) {
  try {
    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Await params (Next.js 15 pattern)
    const { equipment } = await params

    // Validate equipment
    if (!isValidEquipment(equipment)) {
      return NextResponse.json(
        { success: false, error: 'Invalid equipment type' },
        { status: 400 }
      )
    }

    // Check for user custom preferences
    const preferences = await prisma.userCardioMetricPreferences.findUnique({
      where: {
        userId_equipment: {
          userId: user.id,
          equipment
        }
      }
    })

    // Get metrics (custom or default)
    const metrics = getMetricsForEquipment(
      equipment as CardioEquipment,
      preferences?.customMetrics as any
    )

    return NextResponse.json({
      success: true,
      equipment,
      metrics,
      isCustom: !!preferences
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
