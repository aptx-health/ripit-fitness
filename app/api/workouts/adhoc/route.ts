import { Prisma } from '@prisma/client'
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

    // One active draft at a time. Wrap the check-then-create in a Serializable
    // transaction so two concurrent requests (double-tap on a slow link, two
    // tabs) can't both observe "no draft" and both insert. Postgres will abort
    // one of them with P2034 (serialization failure), which we surface as the
    // same 409 the happy-path check produces.
    const now = new Date()
    let completion:
      | { id: string; name: string | null; startedAt: Date | null }
      | null = null
    let existingDraft:
      | {
          id: string
          isAdHoc: boolean
          name: string | null
          workout: { name: string } | null
        }
      | null = null

    try {
      completion = await prisma.$transaction(
        async (tx) => {
          const found = await tx.workoutCompletion.findFirst({
            where: { userId: user.id, status: 'draft', isArchived: false },
            select: {
              id: true,
              isAdHoc: true,
              name: true,
              workout: { select: { name: true } },
            },
          })
          if (found) {
            existingDraft = found
            return null
          }
          return tx.workoutCompletion.create({
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
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    } catch (txErr) {
      // Serialization failure on concurrent inserts — refetch the winner.
      if (
        txErr instanceof Prisma.PrismaClientKnownRequestError &&
        (txErr.code === 'P2034' || txErr.code === 'P2002')
      ) {
        existingDraft = await prisma.workoutCompletion.findFirst({
          where: { userId: user.id, status: 'draft', isArchived: false },
          select: {
            id: true,
            isAdHoc: true,
            name: true,
            workout: { select: { name: true } },
          },
        })
      } else {
        throw txErr
      }
    }

    if (existingDraft) {
      return NextResponse.json(
        {
          error: 'DRAFT_EXISTS',
          message: 'Finish your current workout before starting a new one.',
          draft: {
            completionId: (existingDraft as { id: string }).id,
            isAdHoc: (existingDraft as { isAdHoc: boolean }).isAdHoc,
            name:
              (existingDraft as { name: string | null }).name ??
              (existingDraft as { workout: { name: string } | null }).workout?.name ??
              null,
          },
        },
        { status: 409 }
      )
    }

    if (!completion) {
      // Defensive: should be unreachable.
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

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
