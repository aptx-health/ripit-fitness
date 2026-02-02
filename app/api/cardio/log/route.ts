import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import type { LogCardioSessionRequest } from '@/lib/cardio/types'
import { isValidEquipment, isValidIntensityZone } from '@/lib/cardio/validation'
import { recordCardioPerformance } from '@/lib/stats/exercise-performance'

/**
 * POST /api/cardio/log
 * Log a cardio session (ad-hoc or linked to prescribed session)
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
    const body: LogCardioSessionRequest = await request.json()

    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Session name is required' },
        { status: 400 }
      )
    }

    if (!body.equipment || !isValidEquipment(body.equipment)) {
      return NextResponse.json(
        { success: false, error: 'Valid equipment is required' },
        { status: 400 }
      )
    }

    if (!body.duration || body.duration < 1) {
      return NextResponse.json(
        { success: false, error: 'Duration must be at least 1 minute' },
        { status: 400 }
      )
    }

    // Validate optional intensity zone
    if (body.intensityZone && !isValidIntensityZone(body.intensityZone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid intensity zone' },
        { status: 400 }
      )
    }

    // If prescribedSessionId provided, verify it exists and belongs to user
    if (body.prescribedSessionId) {
      const prescribedSession = await prisma.prescribedCardioSession.findFirst({
        where: {
          id: body.prescribedSessionId,
          week: {
            cardioProgram: {
              userId: user.id
            }
          }
        }
      })

      if (!prescribedSession) {
        return NextResponse.json(
          { success: false, error: 'Prescribed session not found or unauthorized' },
          { status: 404 }
        )
      }
    }

    // Create logged cardio session
    const session = await prisma.loggedCardioSession.create({
      data: {
        prescribedSessionId: body.prescribedSessionId || null,
        userId: user.id,
        name: body.name.trim(),
        equipment: body.equipment,
        duration: body.duration,
        status: body.status || 'completed',

        // Optional metrics
        avgHR: body.avgHR,
        peakHR: body.peakHR,
        avgPower: body.avgPower,
        peakPower: body.peakPower,
        distance: body.distance,
        elevationGain: body.elevationGain,
        elevationLoss: body.elevationLoss,
        avgPace: body.avgPace,
        cadence: body.cadence,
        strokeRate: body.strokeRate,
        strokeCount: body.strokeCount,
        calories: body.calories,

        // Context
        intensityZone: body.intensityZone,
        intervalStructure: body.intervalStructure,
        notes: body.notes
      }
    })

    // Record performance metrics for brag strip
    await recordCardioPerformance(prisma, session.id, user.id)

    return NextResponse.json({
      success: true,
      session
    })
  } catch (error) {
    console.error('Error logging cardio session:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
