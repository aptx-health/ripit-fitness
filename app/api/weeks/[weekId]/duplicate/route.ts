import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { batchInsertWeekContent } from '@/lib/db/batch-insert'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the complete week with all nested relations
    const originalWeek = await prisma.week.findUnique({
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

    if (!originalWeek) {
      return NextResponse.json(
        { error: 'Week not found' },
        { status: 404 }
      )
    }

    if (originalWeek.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Find the maximum week number in the program to append the duplicate
    const maxWeekNumber = await prisma.week.findFirst({
      where: { programId: originalWeek.programId },
      orderBy: { weekNumber: 'desc' },
      select: { weekNumber: true }
    })

    const newWeekNumber = (maxWeekNumber?.weekNumber || 0) + 1

    // Create the new week shell first (outside transaction)
    const newWeek = await prisma.week.create({
      data: {
        weekNumber: newWeekNumber,
        programId: originalWeek.programId,
        userId: user.id,
      }
    })

    try {
      // Batch insert all content with 30s timeout
      await prisma.$transaction(async (tx) => {
        await batchInsertWeekContent(tx, newWeek.id, originalWeek.workouts, user.id)
      }, { timeout: 30000 })

      // Fetch the complete duplicated week to return
      const completeDuplicatedWeek = await prisma.week.findUnique({
        where: { id: newWeek.id },
        include: {
          workouts: {
            include: {
              exercises: {
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
                    }
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
        week: completeDuplicatedWeek
      })
    } catch (innerError) {
      // Cleanup: delete the shell week on failure
      console.error('Error during week duplication, cleaning up:', innerError)
      await prisma.week.delete({
        where: { id: newWeek.id }
      }).catch(cleanupError => {
        console.error('Failed to cleanup week:', cleanupError)
      })
      throw innerError
    }
  } catch (error) {
    console.error('Error duplicating week:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
