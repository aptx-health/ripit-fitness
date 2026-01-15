import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { isValidEquipment, isValidIntensityZone } from '@/lib/cardio'

/**
 * PUT /api/cardio/programs/[id]/builder
 * Update entire program structure (weeks and sessions)
 * This is the main endpoint for building/editing cardio programs
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Await params
    const { id: programId } = await params

    // Parse request body
    const body = await request.json()

    // Verify program belongs to user
    const program = await prisma.cardioProgram.findFirst({
      where: { id: programId, userId: user.id }
    })

    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      )
    }

    // Validate weeks structure
    if (!Array.isArray(body.weeks)) {
      return NextResponse.json(
        { success: false, error: 'Weeks must be an array' },
        { status: 400 }
      )
    }

    // Use transaction to update entire program structure
    await prisma.$transaction(async (tx) => {
      // Delete all existing weeks and sessions (cascade will handle sessions)
      await tx.cardioWeek.deleteMany({
        where: { cardioProgramId: programId }
      })

      // Create new weeks and sessions
      for (const week of body.weeks) {
        const createdWeek = await tx.cardioWeek.create({
          data: {
            cardioProgramId: programId,
            weekNumber: week.weekNumber,
            userId: user.id
          }
        })

        // Create sessions for this week
        if (Array.isArray(week.sessions)) {
          for (const session of week.sessions) {
            // Validate session data
            if (!session.name || !session.targetDuration) {
              throw new Error(`Session on day ${session.dayNumber} missing required fields`)
            }

            if (session.equipment && !isValidEquipment(session.equipment)) {
              throw new Error(`Invalid equipment: ${session.equipment}`)
            }

            if (session.intensityZone && !isValidIntensityZone(session.intensityZone)) {
              throw new Error(`Invalid intensity zone: ${session.intensityZone}`)
            }

            await tx.prescribedCardioSession.create({
              data: {
                weekId: createdWeek.id,
                dayNumber: session.dayNumber,
                name: session.name.trim(),
                description: session.description?.trim() || null,
                targetDuration: session.targetDuration,
                intensityZone: session.intensityZone || null,
                equipment: session.equipment || null,
                targetHRRange: session.targetHRRange?.trim() || null,
                targetPowerRange: session.targetPowerRange?.trim() || null,
                intervalStructure: session.intervalStructure?.trim() || null,
                notes: session.notes?.trim() || null,
                userId: user.id
              }
            })
          }
        }
      }
    })

    // Fetch updated program
    const updatedProgram = await prisma.cardioProgram.findUnique({
      where: { id: programId },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            sessions: {
              orderBy: { dayNumber: 'asc' }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      program: updatedProgram
    })
  } catch (error) {
    console.error('Error updating program structure:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
