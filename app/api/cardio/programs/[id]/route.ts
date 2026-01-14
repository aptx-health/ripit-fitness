import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/cardio/programs/[id]
 * Get a specific cardio program with weeks and sessions
 */
export async function GET(
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

    // Await params (Next.js 15 pattern)
    const { id } = await params

    // Fetch program
    const program = await prisma.cardioProgram.findFirst({
      where: {
        id,
        userId: user.id
      },
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

    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      program
    })
  } catch (error) {
    console.error('Error fetching cardio program:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/cardio/programs/[id]
 * Update a cardio program
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
    const { id } = await params

    // Parse request body
    const body = await request.json()

    // Verify program belongs to user
    const existingProgram = await prisma.cardioProgram.findFirst({
      where: { id, userId: user.id }
    })

    if (!existingProgram) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      )
    }

    // Update program
    const program = await prisma.cardioProgram.update({
      where: { id },
      data: {
        name: body.name?.trim() || existingProgram.name,
        description: body.description?.trim() || existingProgram.description,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      program
    })
  } catch (error) {
    console.error('Error updating cardio program:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/cardio/programs/[id]
 * Archive a cardio program
 */
export async function DELETE(
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
    const { id } = await params

    // Verify program belongs to user
    const existingProgram = await prisma.cardioProgram.findFirst({
      where: { id, userId: user.id }
    })

    if (!existingProgram) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      )
    }

    // Archive program (soft delete)
    await prisma.cardioProgram.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        isActive: false // Deactivate when archiving
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Program archived'
    })
  } catch (error) {
    console.error('Error archiving cardio program:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
