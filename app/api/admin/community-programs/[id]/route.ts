import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/community-programs/[id]
 * Get a single community program with full programData.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const { id } = await params

    const program = await prisma.communityProgram.findUnique({
      where: { id },
    })

    if (!program) {
      return NextResponse.json({ error: 'Community program not found' }, { status: 404 })
    }

    return NextResponse.json({ data: program })
  } catch (error) {
    logger.error({ error }, 'Error fetching community program')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/community-programs/[id]
 * Update a community program's content (name, description, metadata, week/workout names).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEditor({ rateLimit: true })
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.communityProgram.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Community program not found' }, { status: 404 })
    }

    if (!existing.curated) {
      return NextResponse.json(
        { error: 'Only curated programs can be edited' },
        { status: 403 }
      )
    }

    const {
      name,
      description,
      level,
      goals,
      equipmentNeeded,
      focusAreas,
      targetDaysPerWeek,
      programData: updatedProgramData,
    } = body

    // Build update data for top-level columns
    const data: Record<string, unknown> = {}

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Name is required' }, { status: 422 })
      }
      data.name = name.trim()
    }

    if (description !== undefined) {
      data.description = description.trim()
    }

    if (level !== undefined) data.level = level
    if (goals !== undefined) data.goals = goals
    if (equipmentNeeded !== undefined) data.equipmentNeeded = equipmentNeeded
    if (focusAreas !== undefined) data.focusAreas = focusAreas
    if (targetDaysPerWeek !== undefined) {
      if (targetDaysPerWeek !== null && (targetDaysPerWeek < 1 || targetDaysPerWeek > 7)) {
        return NextResponse.json(
          { error: 'Target days per week must be between 1 and 7' },
          { status: 422 }
        )
      }
      data.targetDaysPerWeek = targetDaysPerWeek
    }

    // Handle programData updates (week descriptions, workout names)
    if (updatedProgramData !== undefined) {
      // Sync top-level name/description into programData
      const newProgramData = { ...updatedProgramData }
      if (data.name) newProgramData.name = data.name
      if (data.description !== undefined) newProgramData.description = data.description ?? ''

      data.programData = newProgramData

      // Recalculate stats from programData
      const weeks = newProgramData.weeks || []
      let workoutCount = 0
      let exerciseCount = 0
      weeks.forEach((week: { workouts?: { exercises?: unknown[] }[] }) => {
        workoutCount += week.workouts?.length || 0
        week.workouts?.forEach((workout) => {
          exerciseCount += workout.exercises?.length || 0
        })
      })
      data.weekCount = weeks.length
      data.workoutCount = workoutCount
      data.exerciseCount = exerciseCount
    } else {
      // If name/description changed but no programData sent, sync into existing programData
      if (data.name || data.description !== undefined) {
        const currentProgramData = existing.programData as Record<string, unknown>
        const synced = { ...currentProgramData }
        if (data.name) synced.name = data.name
        if (data.description !== undefined) synced.description = data.description
        data.programData = synced
      }
    }

    const updated = await prisma.communityProgram.update({
      where: { id },
      data,
    })

    logger.info(
      { programId: id, changes: Object.keys(data) },
      'Community program updated'
    )

    return NextResponse.json({ data: updated })
  } catch (error) {
    logger.error({ error }, 'Error updating community program')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
