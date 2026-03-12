import { redirect } from 'next/navigation'
import ConsolidatedProgramsView from '@/components/programs/ConsolidatedProgramsView'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

// Cache page for 30 seconds to improve navigation performance
export const revalidate = 30

export default async function ProgramsPage() {
  const { user } = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const [strengthPrograms, archivedStrengthCount] = await Promise.all([
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
  ])

  return (
    <ConsolidatedProgramsView
      strengthPrograms={strengthPrograms}
      archivedStrengthCount={archivedStrengthCount}
    />
  )
}
