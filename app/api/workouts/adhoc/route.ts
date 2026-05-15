import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, workoutActionLimiter } from '@/lib/rate-limit'

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

function defaultAdHocName(now: Date = new Date()): string {
  return `Open Workout — ${DATE_FMT.format(now)}`
}

export async function POST() {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(workoutActionLimiter, user.id)
    if (limited) return limited

    // One active draft at a time — block if a draft already exists (programmed or ad-hoc).
    const existingDraft = await prisma.workoutCompletion.findFirst({
      where: { userId: user.id, status: 'draft', isArchived: false },
      select: { id: true, isAdHoc: true, name: true, workout: { select: { name: true } } },
    })

    if (existingDraft) {
      return NextResponse.json(
        {
          error: 'DRAFT_EXISTS',
          message: 'Finish your current workout before starting a new one.',
          draft: {
            completionId: existingDraft.id,
            isAdHoc: existingDraft.isAdHoc,
            name: existingDraft.name ?? existingDraft.workout?.name ?? null,
          },
        },
        { status: 409 }
      )
    }

    const now = new Date()
    const completion = await prisma.workoutCompletion.create({
      data: {
        workoutId: null,
        userId: user.id,
        status: 'draft',
        isAdHoc: true,
        name: defaultAdHocName(now),
        startedAt: now,
        completedAt: now,
      },
      select: { id: true, name: true, startedAt: true },
    })

    logger.info(
      { userId: user.id, completionId: completion.id },
      'Ad-hoc workout started'
    )

    return NextResponse.json({
      completion: {
        id: completion.id,
        name: completion.name,
        startedAt: completion.startedAt,
      },
    })
  } catch (err) {
    logger.error({ error: err, context: 'adhoc-create' }, 'Failed to create ad-hoc workout')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
