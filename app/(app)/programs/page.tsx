import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import ConsolidatedProgramsView from '@/components/programs/ConsolidatedProgramsView'

export default async function ProgramsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all programs in parallel for faster load times
  const [strengthPrograms, archivedStrengthPrograms, cardioPrograms, archivedCardioPrograms] = await Promise.all([
    prisma.program.findMany({
      where: {
        userId: user.id,
        isArchived: false,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.program.findMany({
      where: {
        userId: user.id,
        isArchived: true,
      },
      orderBy: { archivedAt: 'desc' },
    }),
    prisma.cardioProgram.findMany({
      where: {
        userId: user.id,
        isArchived: false,
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            sessions: {
              orderBy: { dayNumber: 'asc' },
            },
          },
        },
      },
    }),
    prisma.cardioProgram.findMany({
      where: {
        userId: user.id,
        isArchived: true,
      },
      orderBy: { archivedAt: 'desc' },
    })
  ])

  return (
    <ConsolidatedProgramsView
      strengthPrograms={strengthPrograms}
      archivedStrengthPrograms={archivedStrengthPrograms}
      cardioPrograms={cardioPrograms}
      archivedCardioPrograms={archivedCardioPrograms}
    />
  )
}
