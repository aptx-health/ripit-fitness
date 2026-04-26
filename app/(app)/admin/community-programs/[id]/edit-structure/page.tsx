import Link from 'next/link'
import { redirect } from 'next/navigation'
import CommunityProgramBuilderWrapper from '@/components/admin/CommunityProgramBuilderWrapper'
import { isEditorRole } from '@/lib/admin/auth'
import { hydrateCommunityProgram } from '@/lib/admin/community-program-hydration'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ week?: string }>
}

export default async function EditCommunityProgramStructurePage({ params, searchParams }: Props) {
  const { id } = await params
  const { week: weekParam } = await searchParams

  const { user } = await getCurrentUser()

  if (!user || !isEditorRole(user.role)) {
    redirect('/login')
  }

  // Verify the community program exists and is curated
  const communityProgram = await prisma.communityProgram.findUnique({
    where: { id },
    select: { id: true, name: true, curated: true },
  })

  if (!communityProgram) {
    redirect('/admin/community-programs')
  }

  if (!communityProgram.curated) {
    redirect(`/admin/community-programs/${id}/edit`)
  }

  // Hydrate community program into a temp program for editing
  const hydrateResult = await hydrateCommunityProgram(prisma, id, user.id)

  if (!hydrateResult.success || !hydrateResult.tempProgramId) {
    return (
      <div className="text-red-400 p-4">
        Failed to prepare program for editing: {hydrateResult.error}
      </div>
    )
  }

  const tempProgramId = hydrateResult.tempProgramId

  // Parse requested week (default to 1)
  const requestedWeek = weekParam ? parseInt(weekParam, 10) : 1
  const validWeekNumber = !Number.isNaN(requestedWeek) && requestedWeek > 0 ? requestedWeek : 1

  // Fetch temp program metadata and week summary
  const program = await prisma.program.findUnique({
    where: { id: tempProgramId },
    include: {
      weeks: {
        select: {
          id: true,
          weekNumber: true,
        },
        orderBy: { weekNumber: 'asc' },
      },
    },
  })

  if (!program) {
    return <div className="text-red-400 p-4">Failed to load temp program</div>
  }

  // Fetch the current week's full data
  const currentWeek = await prisma.week.findFirst({
    where: {
      programId: tempProgramId,
      weekNumber: validWeekNumber,
      userId: user.id,
    },
    include: {
      workouts: {
        include: {
          exercises: {
            include: {
              prescribedSets: {
                orderBy: { setNumber: 'asc' },
              },
              exerciseDefinition: {
                select: {
                  id: true,
                  name: true,
                  primaryFAUs: true,
                  secondaryFAUs: true,
                  isSystem: true,
                  createdBy: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { dayNumber: 'asc' },
      },
    },
  })

  return (
    <div className="bg-background doom-page-enter">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/admin/community-programs/${id}/edit`}
              className="text-primary hover:text-primary-hover text-sm flex items-center gap-1 doom-link"
            >
              ← Back to Program Editor
            </Link>
            <span className="text-muted-foreground">|</span>
            <h1 className="text-2xl font-semibold text-foreground doom-heading">
              EDIT STRUCTURE
            </h1>
          </div>
          <div className="bg-amber-900/30 border-2 border-amber-700 p-4 mb-4">
            <p className="text-sm text-amber-200">
              Editing structure for <strong>{communityProgram.name}</strong>.
              Changes are saved to a temporary draft. Click &quot;Save to Community Program&quot; when done.
            </p>
          </div>
        </div>

        <CommunityProgramBuilderWrapper
          communityProgramId={id}
          communityProgramName={communityProgram.name}
          tempProgramId={tempProgramId}
          existingProgram={{
            id: program.id,
            name: program.name,
            description: program.description,
            isActive: false,
            weeksSummary: program.weeks,
            initialWeek: currentWeek,
          }}
        />
      </div>
    </div>
  )
}
