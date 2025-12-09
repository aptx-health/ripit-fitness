import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { CsvUploader } from '@/components/features/CsvUploader'

export default async function ProgramsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's programs
  const programs = await prisma.program.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  const activeProgram = programs.find(p => p.isActive)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-6">My Programs</h1>
          {programs.length > 0 && (
            <div className="bg-white rounded-lg p-6 mb-6">
              <CsvUploader />
            </div>
          )}
        </div>

        {programs.length === 0 ? (
          <div className="bg-white rounded-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-2">No programs yet</h2>
              <p className="text-gray-600">
                Import your first training program from a CSV file to get started
              </p>
            </div>
            <CsvUploader />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Program */}
            {activeProgram && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="inline-block px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded mb-2">
                      ACTIVE
                    </span>
                    <h2 className="text-2xl font-bold">{activeProgram.name}</h2>
                    {activeProgram.description && (
                      <p className="text-gray-600 mt-1">{activeProgram.description}</p>
                    )}
                  </div>
                </div>
                <Link
                  href={`/programs/${activeProgram.id}`}
                  className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Open Program
                </Link>
              </div>
            )}

            {/* Other Programs */}
            {programs.filter(p => !p.isActive).map(program => (
              <div key={program.id} className="bg-white rounded-lg p-6 hover:shadow-md transition">
                <h2 className="text-xl font-semibold">{program.name}</h2>
                {program.description && (
                  <p className="text-gray-600 mt-1">{program.description}</p>
                )}
                <div className="mt-4 space-x-2">
                  <Link
                    href={`/programs/${program.id}`}
                    className="inline-block px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View
                  </Link>
                  <button className="px-4 py-2 text-gray-600 hover:text-gray-700 font-medium">
                    Set Active
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
