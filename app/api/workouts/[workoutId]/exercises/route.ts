import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

type AddExerciseRequest = {
  exerciseDefinitionId: string
  name?: string // Override display name if different from definition
  exerciseGroup?: string // For supersets/circuits
  notes?: string
  prescribedSets?: Array<{
    setNumber: number
    reps: string
    weight?: string
    rpe?: number
    rir?: number
  }>
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  try {
    const { workoutId } = await params

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
    const body = await request.json() as AddExerciseRequest
    const { 
      exerciseDefinitionId, 
      name, 
      exerciseGroup, 
      notes, 
      prescribedSets = []
    } = body

    // Validate required fields
    if (!exerciseDefinitionId) {
      return NextResponse.json(
        { error: 'Exercise definition ID is required' },
        { status: 400 }
      )
    }

    // Verify workout exists and user owns it
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        exercises: true,
        week: {
          include: {
            program: true
          }
        }
      }
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify exercise definition exists
    const exerciseDefinition = await prisma.exerciseDefinition.findUnique({
      where: { id: exerciseDefinitionId }
    })

    if (!exerciseDefinition) {
      return NextResponse.json(
        { error: 'Exercise definition not found' },
        { status: 404 }
      )
    }

    // Calculate next order number
    const maxOrder = Math.max(0, ...workout.exercises.map(e => e.order))
    const nextOrder = maxOrder + 1

    // Create exercise with prescribed sets in transaction
    const newExercise = await prisma.$transaction(async (tx) => {
      const exercise = await tx.exercise.create({
        data: {
          name: name || exerciseDefinition.name,
          exerciseDefinitionId,
          order: nextOrder,
          exerciseGroup: exerciseGroup || null,
          workoutId,
          notes: notes || null,
        }
      })

      // Create prescribed sets if provided
      if (prescribedSets.length > 0) {
        await tx.prescribedSet.createMany({
          data: prescribedSets.map(set => ({
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
      exercise: newExercise
    })
  } catch (error) {
    console.error('Error adding exercise to workout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  try {
    const { workoutId } = await params

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify workout exists and user owns it
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        week: {
          include: {
            program: true
          }
        }
      }
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get workout exercises with all relations
    const exercises = await prisma.exercise.findMany({
      where: { workoutId },
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
      },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({
      success: true,
      exercises
    })
  } catch (error) {
    console.error('Error fetching workout exercises:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}