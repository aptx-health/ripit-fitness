import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { batchInsertWeek } from '@/lib/db/batch-insert'

/**
 * Generates a unique program name by appending " (Copy)" or " (Copy N)"
 */
function generateCopyName(originalName: string, existingNames: string[]): string {
  const baseName = originalName.replace(/\s*\(Copy\s*\d*\)$/, '').trim()

  // Try "Program Name (Copy)" first
  let candidateName = `${baseName} (Copy)`
  if (!existingNames.includes(candidateName)) {
    return candidateName
  }

  // Find the highest copy number
  let copyNumber = 2
  while (existingNames.includes(`${baseName} (Copy ${copyNumber})`)) {
    copyNumber++
  }

  return `${baseName} (Copy ${copyNumber})`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the complete program with all nested relations
    const originalProgram = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        weeks: {
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
          },
          orderBy: { weekNumber: 'asc' }
        }
      }
    })

    if (!originalProgram) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      )
    }

    if (originalProgram.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all existing program names for this user to avoid conflicts
    const existingPrograms = await prisma.program.findMany({
      where: { userId: user.id },
      select: { name: true }
    })
    const existingNames = existingPrograms.map(p => p.name)

    // Generate unique copy name
    const newProgramName = generateCopyName(originalProgram.name, existingNames)

    // Create the new program shell first (outside transaction)
    const newProgram = await prisma.program.create({
      data: {
        name: newProgramName,
        description: originalProgram.description,
        userId: user.id,
        isActive: false,
        isArchived: false,
        programType: originalProgram.programType,
        isUserCreated: true,
      }
    })

    try {
      // Process each week in its own transaction with 30s timeout
      for (const week of originalProgram.weeks) {
        await prisma.$transaction(async (tx) => {
          await batchInsertWeek(tx, week, newProgram.id, user.id)
        }, { timeout: 30000 })
      }

      // Fetch the complete duplicated program to return
      const completeDuplicatedProgram = await prisma.program.findUnique({
        where: { id: newProgram.id },
        include: {
          weeks: {
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
            },
            orderBy: { weekNumber: 'asc' }
          }
        }
      })

      return NextResponse.json({
        success: true,
        program: completeDuplicatedProgram
      })
    } catch (error) {
      // Cleanup: delete the partially created program on failure
      console.error('Error during duplication, cleaning up:', error)
      await prisma.program.delete({
        where: { id: newProgram.id }
      }).catch(cleanupError => {
        console.error('Failed to cleanup program:', cleanupError)
      })
      throw error
    }
  } catch (error) {
    console.error('Error duplicating program:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
