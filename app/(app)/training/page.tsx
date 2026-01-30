import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getCurrentStrengthWeek } from '@/lib/db/current-week'
import { getStrengthWeekByNumber } from '@/lib/db/week-navigation'
import { redirect } from 'next/navigation'
import TrainingTabs from '@/components/TrainingTabs'

// Cache page for 30 seconds to improve navigation performance
export const revalidate = 30

type Props = {
  searchParams: Promise<{ week?: string }>
}

export default async function TrainingPage({ searchParams }: Props) {
  const { week: weekParam } = await searchParams
  // Get authenticated user
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  // Parse week param
  const requestedWeek = weekParam ? parseInt(weekParam, 10) : null
  const validWeekParam = requestedWeek && !isNaN(requestedWeek) && requestedWeek > 0

  // Fetch week data and workout history count in parallel
  // If week param provided, fetch specific week; otherwise fetch current week
  const [weekData, workoutHistoryCount] = await Promise.all([
    validWeekParam
      ? getStrengthWeekByNumber(user.id, requestedWeek)
      : getCurrentStrengthWeek(user.id),
    prisma.workoutCompletion.count({
      where: {
        userId: user.id,
        status: { in: ['completed', 'draft'] }
      }
    })
  ])

  return (
    <div className="min-h-screen bg-background sm:px-6 py-4">
      <div className="max-w-6xl mx-auto">
        <TrainingTabs weekData={weekData} historyCount={workoutHistoryCount} />
      </div>
    </div>
  )
}
