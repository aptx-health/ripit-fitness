import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { isValidEquipment } from '@/lib/cardio'

/**
 * DELETE /api/cardio/metrics/preferences/[equipment]
 * Reset user's metric preferences to defaults for equipment
 */
export async function DELETE(
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

    // Delete preferences (will revert to defaults)
    await prisma.userCardioMetricPreferences.deleteMany({
      where: {
        userId: user.id,
        equipment
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Preferences reset to defaults'
    })
  } catch (error) {
    console.error('Error resetting preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
