import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify week exists and user owns it
    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        program: true,
        workouts: {
          include: {
            completions: {
              where: {
                userId: user.id,
              },
            },
          },
        },
      },
    })

    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 })
    }

    if (week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Find all workouts without completions
    const uncompletedWorkouts = week.workouts.filter(
      (workout) => workout.completions.length === 0
    )

    if (uncompletedWorkouts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All workouts already have status',
        skipped: 0,
      })
    }

    // Mark all uncompleted workouts as skipped
    const skippedCompletions = await prisma.workoutCompletion.createMany({
      data: uncompletedWorkouts.map((workout) => ({
        workoutId: workout.id,
        userId: user.id,
        status: 'skipped',
        completedAt: new Date(),
      })),
    })

    return NextResponse.json({
      success: true,
      message: `Week completed. ${skippedCompletions.count} workout(s) marked as skipped.`,
      skipped: skippedCompletions.count,
    })
  } catch (error) {
    console.error('Error completing week:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
