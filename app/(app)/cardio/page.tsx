import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getCurrentCardioWeek } from '@/lib/db/current-week'
import { getCardioWeekByNumber } from '@/lib/db/week-navigation'
import { redirect } from 'next/navigation'
import CardioTabs from '@/components/CardioTabs'

// Cache page for 30 seconds to improve navigation performance
export const revalidate = 30

type Props = {
  searchParams: Promise<{ week?: string }>
}

export default async function CardioPage({ searchParams }: Props) {
  const { week: weekParam } = await searchParams
  // Get authenticated user
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  // Parse week param
  const requestedWeek = weekParam ? parseInt(weekParam, 10) : null
  const validWeekParam = requestedWeek && !isNaN(requestedWeek) && requestedWeek > 0

  // Fetch week data and session count in parallel
  // If week param provided, fetch specific week; otherwise fetch current week
  const [weekData, sessionCount] = await Promise.all([
    validWeekParam
      ? getCardioWeekByNumber(user.id, requestedWeek)
      : getCurrentCardioWeek(user.id),
    prisma.loggedCardioSession.count({
      where: {
        userId: user.id
      }
    })
  ])

  return (
    <div className="min-h-screen bg-background sm:px-6 py-4">
      <div className="max-w-6xl mx-auto">
        <CardioTabs weekData={weekData} historyCount={sessionCount} />
      </div>
    </div>
  )
}
