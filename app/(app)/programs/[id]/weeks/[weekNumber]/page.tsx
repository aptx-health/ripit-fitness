import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import WeekView from '@/components/WeekView'

export default async function WeekPage({
  params,
}: {
  params: Promise<{ id: string; weekNumber: string }>
}) {
  const { id: programId, weekNumber } = await params
  const weekNum = parseInt(weekNumber, 10)

  if (isNaN(weekNum) || weekNum < 1) {
    notFound()
  }

  // Get authenticated user
  const { user } = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch program with the specific week and its workouts in ONE query
  const program = await prisma.program.findFirst({
    where: {
      id: programId,
      userId: user.id,
    },
    include: {
      weeks: {
        where: {
          weekNumber: weekNum,
        },
        include: {
          workouts: {
            orderBy: {
              dayNumber: 'asc',
            },
            include: {
              completions: {
                where: {
                  userId: user.id,
                },
                take: 1,
                orderBy: {
                  completedAt: 'desc',
                },
              },
            },
          },
        },
      },
      _count: {
        select: { weeks: true },
      },
    },
  })

  if (!program || program.weeks.length === 0) {
    notFound()
  }

  const week = program.weeks[0]
  const workouts = week.workouts
  const totalWeeks = program._count.weeks

  return (
    <WeekView
      programId={programId}
      weekId={week.id}
      weekNumber={weekNum}
      totalWeeks={totalWeeks}
      programName={program.name}
      workouts={workouts}
    />
  )
}
