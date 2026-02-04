import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { applyIntensityAdjustment, applyVolumeAdjustment } from '@/lib/transformations/week-transform'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    // Get authenticated user
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { weekId } = await params
    const body = await request.json()
    const { intensityAdjustment, volumeAdjustment } = body

    // Validate: at least one adjustment must be present
    if (intensityAdjustment === undefined && volumeAdjustment === undefined) {
      return NextResponse.json(
        { error: 'At least one adjustment (intensity or volume) is required' },
        { status: 400 }
      )
    }

    // Fetch week with full nested structure
    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        program: true,
        workouts: {
          include: {
            exercises: {
              include: {
                prescribedSets: {
                  orderBy: { setNumber: 'asc' }
                }
              },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { dayNumber: 'asc' }
        }
      }
    })

    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 })
    }

    // Authorization: verify user owns this week's program
    if (week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Apply transformations in transaction
    const stats = await prisma.$transaction(async (tx) => {
      let intensityUpdatedCount = 0
      let volumeAddedCount = 0
      let volumeRemovedCount = 0
      let skippedExercises = 0

      // Apply intensity adjustment if present
      if (intensityAdjustment !== undefined) {
        intensityUpdatedCount = await applyIntensityAdjustment(
          tx,
          week,
          intensityAdjustment
        )
      }

      // Apply volume adjustment if present
      if (volumeAdjustment !== undefined) {
        const volumeResult = await applyVolumeAdjustment(
          tx,
          week,
          volumeAdjustment,
          user.id
        )
        volumeAddedCount = volumeResult.addedCount
        volumeRemovedCount = volumeResult.removedCount
        skippedExercises = volumeResult.skippedCount
      }

      return {
        intensityUpdatedCount,
        volumeAddedCount,
        volumeRemovedCount,
        skippedExercises
      }
    }, { timeout: 30000 })

    // Fetch updated week for response
    const updatedWeek = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        workouts: {
          include: {
            exercises: {
              include: {
                prescribedSets: {
                  orderBy: { setNumber: 'asc' }
                }
              },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { dayNumber: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      week: updatedWeek,
      stats
    })
  } catch (error) {
    console.error('Week transform error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
