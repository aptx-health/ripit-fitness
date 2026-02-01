import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import CommunityProgramsView from '@/components/community/CommunityProgramsView'

// Don't cache this page - community programs should be fresh
export const revalidate = 0

export default async function CommunityPage() {
  const { user } = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch community programs ordered by published date (newest first)
  // Note: We fetch all programs here and handle pagination client-side
  // This is simpler than server-side pagination and works well for moderate datasets
  const communityPrograms = await prisma.communityProgram.findMany({
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      programType: true,
      authorUserId: true,
      displayName: true,
      publishedAt: true,
      weekCount: true,
      workoutCount: true,
      exerciseCount: true,
      goals: true,
      level: true,
      durationDisplay: true,
      targetDaysPerWeek: true,
      equipmentNeeded: true,
      focusAreas: true,
    },
  })

  return (
    <CommunityProgramsView
      communityPrograms={communityPrograms}
      currentUserId={user.id}
    />
  )
}
