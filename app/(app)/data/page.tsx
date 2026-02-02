import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import BragStrip from '@/components/features/BragStrip'

export const metadata: Metadata = {
  title: 'Your Stats | Ripit Fitness',
  description: 'View your workout statistics and progress',
}

async function getBragStripStats(userId: string) {
  // Calculate week boundaries (ISO week starts on Monday)
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const daysUntilMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - daysUntilMonday)
  startOfWeek.setHours(0, 0, 0, 0)

  // Calculate month boundary
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  startOfMonth.setHours(0, 0, 0, 0)

  // Run queries in parallel
  const [
    workoutsThisWeek,
    workoutsThisMonth,
    workoutsAllTime,
    volumeData,
    runningData,
    earliestWorkout,
    cardioThisWeek,
    cardioThisMonth,
    cardioAllTime,
  ] = await Promise.all([
    // Strength workout counts
    prisma.workoutCompletion.count({
      where: { userId, status: 'completed', completedAt: { gte: startOfWeek } },
    }),
    prisma.workoutCompletion.count({
      where: { userId, status: 'completed', completedAt: { gte: startOfMonth } },
    }),
    prisma.workoutCompletion.count({
      where: { userId, status: 'completed' },
    }),
    // Total volume
    prisma.exercisePerformanceLog.aggregate({
      where: { userId, type: 'strength' },
      _sum: { totalVolumeLbs: true },
    }),
    // Running distance
    prisma.exercisePerformanceLog.aggregate({
      where: { userId, type: 'cardio', equipment: { in: ['treadmill', 'outdoor_running'] } },
      _sum: { distance: true },
    }),
    // Earliest workout
    prisma.$queryRaw<Array<{ earliest: Date | null }>>`
      SELECT MIN("completedAt") as earliest
      FROM (
        SELECT "completedAt" FROM "WorkoutCompletion"
        WHERE "userId" = ${userId} AND status = 'completed'
        UNION ALL
        SELECT "completedAt" FROM "LoggedCardioSession"
        WHERE "userId" = ${userId} AND status = 'completed'
      ) AS all_workouts
    `,
    // Cardio workout counts
    prisma.loggedCardioSession.count({
      where: { userId, status: 'completed', completedAt: { gte: startOfWeek } },
    }),
    prisma.loggedCardioSession.count({
      where: { userId, status: 'completed', completedAt: { gte: startOfMonth } },
    }),
    prisma.loggedCardioSession.count({
      where: { userId, status: 'completed' },
    }),
  ])

  const totalVolumeLbs = volumeData._sum.totalVolumeLbs || 0
  const totalVolumeKg = totalVolumeLbs * 0.453592

  const totalRunningMiles = runningData._sum.distance || 0
  const totalRunningKm = totalRunningMiles * 1.60934

  const earliestDate = earliestWorkout[0]?.earliest || null

  return {
    workoutsThisWeek: workoutsThisWeek + cardioThisWeek,
    workoutsThisMonth: workoutsThisMonth + cardioThisMonth,
    workoutsAllTime: workoutsAllTime + cardioAllTime,
    totalVolumeLbs: Math.round(totalVolumeLbs),
    totalVolumeKg: Math.round(totalVolumeKg),
    totalRunningMiles: parseFloat(totalRunningMiles.toFixed(1)),
    totalRunningKm: parseFloat(totalRunningKm.toFixed(1)),
    earliestWorkout: earliestDate ? earliestDate.toISOString() : null,
    generatedAt: new Date().toISOString(),
  }
}

export default async function DataPage() {
  // Check authentication
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch stats
  const stats = await getBragStripStats(user.id)

  return (
    <div className="container mx-auto px-4 py-8">
      <BragStrip stats={stats} />
    </div>
  )
}
