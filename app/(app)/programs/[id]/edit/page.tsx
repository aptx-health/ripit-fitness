import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import ProgramBuilder from '@/components/ProgramBuilder'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ week?: string }>
}

export default async function EditProgramPage({ params, searchParams }: Props) {
  const { id } = await params
  const { week: weekParam } = await searchParams

  const { user } = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Parse requested week (default to 1)
  const requestedWeek = weekParam ? parseInt(weekParam, 10) : 1
  const validWeekNumber = !isNaN(requestedWeek) && requestedWeek > 0 ? requestedWeek : 1

  // Fetch program metadata and week summary (lightweight query)
  const program = await prisma.program.findUnique({
    where: {
      id,
      userId: user.id
    },
    include: {
      weeks: {
        select: {
          id: true,
          weekNumber: true
        },
        orderBy: { weekNumber: 'asc' }
      }
    }
  })

  if (!program) {
    redirect('/programs')
  }

  // Fetch only the current week's full data
  const currentWeek = await prisma.week.findFirst({
    where: {
      programId: id,
      weekNumber: validWeekNumber,
      userId: user.id
    },
    include: {
      workouts: {
        include: {
          exercises: {
            include: {
              prescribedSets: {
                orderBy: { setNumber: 'asc' }
              },
              exerciseDefinition: {
                select: {
                  id: true,
                  name: true,
                  primaryFAUs: true,
                  secondaryFAUs: true
                }
              }
            }
          }
        },
        orderBy: { dayNumber: 'asc' }
      }
    }
  })

  return (
    <div className="min-h-screen bg-background doom-page-enter">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/programs"
              className="text-primary hover:text-primary-hover text-sm flex items-center gap-1 doom-link"
            >
              ← Back to Programs
            </Link>
            <span className="text-muted-foreground">|</span>
            <h1 className="text-2xl font-semibold text-foreground doom-heading">EDIT PROGRAM</h1>
          </div>
          {program.isActive && (
            <div className="bg-primary-muted border border-primary p-4 mb-4 doom-noise doom-corners">
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold doom-label">
                  ACTIVE PROGRAM
                </span>
                <span className="text-sm text-foreground">
                  Be careful when modifying an active program with workout data
                </span>
              </div>
            </div>
          )}
        </div>

        <ProgramBuilder
          editMode={true}
          existingProgram={{
            id: program.id,
            name: program.name,
            description: program.description,
            isActive: program.isActive,
            weeksSummary: program.weeks,
            initialWeek: currentWeek
          }}
        />
      </div>
    </div>
  )
}