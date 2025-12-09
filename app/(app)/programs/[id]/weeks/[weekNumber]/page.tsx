import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch program with weeks
  const program = await prisma.program.findFirst({
    where: {
      id: programId,
      userId: user.id,
    },
    include: {
      weeks: {
        orderBy: {
          weekNumber: 'asc',
        },
      },
    },
  })

  if (!program) {
    notFound()
  }

  // Find the current week
  const week = program.weeks.find((w) => w.weekNumber === weekNum)

  if (!week) {
    notFound()
  }

  // Fetch workouts for this week with completion status
  const workouts = await prisma.workout.findMany({
    where: {
      weekId: week.id,
    },
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
  })

  const totalWeeks = program.weeks.length

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
