import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const { exerciseId } = await params

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { notes, prescribedSets } = body

    // Verify exercise exists and user owns it (through the program)
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        workout: {
          include: {
            week: {
              include: {
                program: true
              }
            }
          }
        }
      }
    })

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    if (exercise.workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update exercise and prescribed sets in transaction
    const updatedExercise = await prisma.$transaction(async (tx) => {
      // Update exercise notes
      const exercise = await tx.exercise.update({
        where: { id: exerciseId },
        data: {
          notes: notes || null,
        }
      })

      // Delete existing prescribed sets
      await tx.prescribedSet.deleteMany({
        where: { exerciseId }
      })

      // Create new prescribed sets
      if (prescribedSets && prescribedSets.length > 0) {
        await tx.prescribedSet.createMany({
          data: prescribedSets.map((set: any) => ({
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight || null,
            rpe: set.rpe || null,
            rir: set.rir || null,
            exerciseId: exercise.id,
          }))
        })
      }

      // Return exercise with all relations
      return await tx.exercise.findUnique({
        where: { id: exercise.id },
        include: {
          prescribedSets: {
            orderBy: { setNumber: 'asc' }
          },
          exerciseDefinition: {
            select: {
              id: true,
              name: true,
              primaryFAUs: true,
              secondaryFAUs: true,
              equipment: true,
              instructions: true
            }
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      exercise: updatedExercise
    })
  } catch (error) {
    console.error('Error updating exercise:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}