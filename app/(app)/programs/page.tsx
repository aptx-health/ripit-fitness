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

  // Fetch strength programs
  const strengthPrograms = await prisma.program.findMany({
    where: {
      userId: user.id,
      isArchived: false,
    },
    orderBy: { createdAt: 'desc' },
  })

  const archivedStrengthPrograms = await prisma.program.findMany({
    where: {
      userId: user.id,
      isArchived: true,
    },
    orderBy: { archivedAt: 'desc' },
  })

  // Fetch cardio programs
  const cardioPrograms = await prisma.cardioProgram.findMany({
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
  })

  const archivedCardioPrograms = await prisma.cardioProgram.findMany({
    where: {
      userId: user.id,
      isArchived: true,
    },
    orderBy: { archivedAt: 'desc' },
  })

  return (
    <ConsolidatedProgramsView
      strengthPrograms={strengthPrograms}
      archivedStrengthPrograms={archivedStrengthPrograms}
      cardioPrograms={cardioPrograms}
      archivedCardioPrograms={archivedCardioPrograms}
    />
  )
}
