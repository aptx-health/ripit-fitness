import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import ConsolidatedProgramsView from '@/components/programs/ConsolidatedProgramsView'

// Cache page for 30 seconds to improve navigation performance
export const revalidate = 30

export default async function ProgramsPage() {
  const { user } = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch active programs and archived counts in parallel for faster load times
  const [strengthPrograms, archivedStrengthCount, cardioPrograms, archivedCardioCount] = await Promise.all([
    prisma.program.findMany({
      where: {
        userId: user.id,
        isArchived: false,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        copyStatus: true,
      },
    }),
    prisma.program.count({
      where: {
        userId: user.id,
        isArchived: true,
      },
    }),
    // Only fetch week and session counts for preview cards, not full data
    prisma.cardioProgram.findMany({
      where: {
        userId: user.id,
        isArchived: false,
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        copyStatus: true,
        weeks: {
          select: {
            id: true,
            _count: {
              select: { sessions: true }
            }
          }
        },
      },
    }),
    prisma.cardioProgram.count({
      where: {
        userId: user.id,
        isArchived: true,
      },
    })
  ])

  return (
    <ConsolidatedProgramsView
      strengthPrograms={strengthPrograms}
      archivedStrengthCount={archivedStrengthCount}
      cardioPrograms={cardioPrograms}
      archivedCardioCount={archivedCardioCount}
    />
  )
}
