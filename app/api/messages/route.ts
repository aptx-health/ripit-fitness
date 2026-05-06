import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/messages
 * Fetch contextual in-app messages for the current user.
 *
 * Query params:
 *   placement - "training_tab" | "exercise_logger" (required)
 *   workoutCount - number of completed workouts (required)
 *   programId - current program ID (optional, for program targeting)
 *
 * Returns the winning message(s) after applying precedence rules:
 *   1. active: true only
 *   2. userType must match user's experienceLevel or be "all"
 *   3. workout count must be in [minWorkouts, maxWorkouts] range
 *   4. program targeting: null matches all; array must include programId
 *   5. lifecycle filter: exclude seen (show_once) and dismissed (show_until_dismissed)
 *   6. highest priority wins
 *   7. tiebreaker: most recent createdAt
 *
 *   training_tab: returns top 1 winner
 *   exercise_logger: returns all qualifying messages
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const placement = searchParams.get('placement')
    const workoutCountStr = searchParams.get('workoutCount')
    const programId = searchParams.get('programId')

    if (!placement || !['training_tab', 'exercise_logger'].includes(placement)) {
      return NextResponse.json({ error: 'Valid placement is required' }, { status: 400 })
    }

    if (workoutCountStr === null) {
      return NextResponse.json({ error: 'workoutCount is required' }, { status: 400 })
    }

    const workoutCount = parseInt(workoutCountStr, 10)
    if (Number.isNaN(workoutCount) || workoutCount < 0) {
      return NextResponse.json({ error: 'workoutCount must be a non-negative integer' }, { status: 400 })
    }

    // Fetch user settings and program source in parallel
    const [settings, program] = await Promise.all([
      prisma.userSettings.findUnique({
        where: { userId: user.id },
        select: {
          loggingMode: true,
          dismissedMessageIds: true,
          seenMessageIds: true,
        },
      }),
      programId
        ? prisma.program.findUnique({
            where: { id: programId },
            select: { sourceCommunityProgramId: true },
          })
        : Promise.resolve(null),
    ])

    // follow_along = beginner content, full = experienced content
    const experienceLevel = settings?.loggingMode === 'full' ? 'experienced' : 'beginner'
    const dismissedIds: string[] = safeParseJsonArray(settings?.dismissedMessageIds)
    const seenIds: string[] = safeParseJsonArray(settings?.seenMessageIds)
    const sourceCommunityProgramId = program?.sourceCommunityProgramId ?? null

    // Query active messages for this placement that match userType
    const candidates = await prisma.inAppMessage.findMany({
      where: {
        active: true,
        placement,
        userType: { in: [experienceLevel, 'all'] },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })

    // Apply remaining filters in-memory (workout range, program targeting, lifecycle)
    const qualifying = candidates.filter((msg) => {
      // Workout count range
      if (msg.minWorkouts !== null && workoutCount < msg.minWorkouts) return false
      if (msg.maxWorkouts !== null && workoutCount > msg.maxWorkouts) return false

      // Program targeting — matches against the community program the user's program was cloned from
      if (msg.programTargeting) {
        const targetPrograms: string[] = safeParseJsonArray(msg.programTargeting)
        if (targetPrograms.length > 0) {
          // No source link (old clone or user-created program) — skip program-targeted messages
          if (!sourceCommunityProgramId) return false
          // Source doesn't match any targeted program
          if (!targetPrograms.includes(sourceCommunityProgramId)) return false
        }
      }

      // Lifecycle filter
      if (msg.lifecycle === 'show_once' && seenIds.includes(msg.id)) return false
      if (msg.lifecycle === 'show_until_dismissed' && dismissedIds.includes(msg.id)) return false

      return true
    })

    // For training_tab, return only the top winner
    const data = placement === 'training_tab'
      ? qualifying.slice(0, 1)
      : qualifying

    return NextResponse.json({
      data: data.map((msg) => ({
        id: msg.id,
        content: msg.content,
        icon: msg.icon,
        lifecycle: msg.lifecycle,
        version: msg.version,
        placement: msg.placement,
        priority: msg.priority,
        slides: msg.slides,
      })),
    })
  } catch (error) {
    logger.error({ error, context: 'messages-get' }, 'Error fetching messages')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function safeParseJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
