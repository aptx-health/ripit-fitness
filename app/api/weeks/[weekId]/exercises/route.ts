import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/weeks/[weekId]/exercises
 * Get exercise names for a week (used for progress animation in transform modal)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params

    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all exercises for the week
    const exercises = await prisma.exercise.findMany({
      where: {
        workout: {
          weekId,
          userId: user.id,
        },
      },
      select: {
        name: true,
      },
      distinct: ['name'],
      orderBy: {
        order: 'asc',
      },
    })

    const exerciseNames = exercises.map(e => e.name)

    return NextResponse.json({ exerciseNames })
  } catch (error) {
    console.error('Error fetching exercise names:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
