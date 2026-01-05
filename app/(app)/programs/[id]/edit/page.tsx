import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import ProgramBuilder from '@/components/ProgramBuilder'

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the program with all its data
  const program = await prisma.program.findUnique({
    where: { 
      id,
      userId: user.id // Ensure user owns this program
    },
    include: {
      weeks: {
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
        },
        orderBy: { weekNumber: 'asc' }
      }
    }
  })

  if (!program) {
    redirect('/programs')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/programs"
              className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
            >
              ← Back to Programs
            </Link>
            <span className="text-gray-400">|</span>
            <h1 className="text-2xl font-semibold">Edit Program</h1>
          </div>
          {program.isActive && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                  ACTIVE PROGRAM
                </span>
                <span className="text-sm text-blue-800">
                  Be careful when modifying an active program with workout data
                </span>
              </div>
            </div>
          )}
        </div>

        <ProgramBuilder 
          editMode={true} 
          existingProgram={program}
        />
      </div>
    </div>
  )
}