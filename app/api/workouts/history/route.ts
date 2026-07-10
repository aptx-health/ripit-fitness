import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  computeFauRollup,
  countWorkingSets,
  resolveDurationSeconds,
} from '@/lib/workout-history'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get limit from query params (default to 5, max 20)
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10), 20)

    // Fetch recent workout completions with all necessary data. Single query
    // with includes — the FAU rollup is computed in-memory below, no N+1.
    const completions = await prisma.workoutCompletion.findMany({
      where: {
        userId: user.id,
        status: { in: ['completed', 'draft'] }
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        completedAt: true,
        startedAt: true,
        durationSeconds: true,
        sessionRpe: true,
        isAdHoc: true,
        name: true,
        workout: {
          select: {
            id: true,
            name: true,
            week: {
              select: {
                program: {
                  select: { name: true }
                }
              }
            }
          }
        },
        loggedSets: {
          select: {
            id: true,
            setNumber: true,
            reps: true,
            weight: true,
            weightUnit: true,
            isWarmup: true,
            exercise: {
              select: {
                name: true,
                exerciseGroup: true,
                order: true,
                exerciseDefinition: {
                  select: { primaryFAUs: true }
                }
              }
            }
          }
        },
        _count: {
          select: { loggedSets: true }
        }
      }
    })

    // Enrich each completion with derived duration, effort, working-set count,
    // and FAU rollup. Strip the per-set FAU data from the response — it's only
    // needed to compute the rollup, so keep the payload lean.
    const enriched = completions.map(completion => {
      const { chips, overflow } = computeFauRollup(completion.loggedSets)
      const workingSets = countWorkingSets(completion.loggedSets)

      return {
        id: completion.id,
        status: completion.status,
        completedAt: completion.completedAt,
        isAdHoc: completion.isAdHoc,
        name: completion.name,
        durationSeconds: resolveDurationSeconds(
          completion.durationSeconds,
          completion.startedAt,
          completion.completedAt
        ),
        sessionRpe: completion.sessionRpe,
        workingSets,
        fauChips: chips,
        fauOverflow: overflow,
        workout: completion.workout,
        loggedSets: completion.loggedSets.map(set => ({
          id: set.id,
          setNumber: set.setNumber,
          reps: set.reps,
          weight: set.weight,
          weightUnit: set.weightUnit,
          isWarmup: set.isWarmup,
          exercise: {
            name: set.exercise.name,
            exerciseGroup: set.exercise.exerciseGroup,
            order: set.exercise.order,
          },
        })),
        _count: completion._count,
      }
    })

    return NextResponse.json({ completions: enriched })
  } catch (error) {
    logger.error({ error, context: 'workout-history' }, 'Failed to fetch workout history')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
