import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  try {
    const { setId } = await params

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify prescribed set exists and user owns it
    const prescribedSet = await prisma.prescribedSet.findUnique({
      where: { id: setId },
      include: {
        exercise: {
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
        }
      }
    })

    if (!prescribedSet) {
      return NextResponse.json(
        { error: 'Prescribed set not found' },
        { status: 404 }
      )
    }

    // Check ownership - either through workout or direct userId for one-offs
    if (prescribedSet.exercise.workout) {
      if (prescribedSet.exercise.workout.week.program.userId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    } else {
      if (prescribedSet.exercise.userId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    // Duplicate the set in a transaction
    const duplicatedSet = await prisma.$transaction(async (tx) => {
      // Increment setNumber for all sets after the current one
      await tx.prescribedSet.updateMany({
        where: {
          exerciseId: prescribedSet.exerciseId,
          setNumber: {
            gt: prescribedSet.setNumber
          }
        },
        data: {
          setNumber: {
            increment: 1
          }
        }
      })

      // Create the duplicated set with setNumber + 1
      const newSet = await tx.prescribedSet.create({
        data: {
          setNumber: prescribedSet.setNumber + 1,
          reps: prescribedSet.reps,
          weight: prescribedSet.weight,
          rpe: prescribedSet.rpe,
          rir: prescribedSet.rir,
          exerciseId: prescribedSet.exerciseId,
          userId: user.id,
        }
      })

      return newSet
    })

    // Return the complete exercise with all prescribed sets
    const exercise = await prisma.exercise.findUnique({
      where: { id: prescribedSet.exerciseId },
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

    return NextResponse.json({
      success: true,
      set: duplicatedSet,
      exercise: exercise
    })
  } catch (error) {
    console.error('Error duplicating prescribed set:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
