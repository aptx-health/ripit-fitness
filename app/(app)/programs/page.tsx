import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import ProgramsList from '@/components/ProgramsList'
import ArchivedProgramsList from '@/components/ArchivedProgramsList'

export default async function ProgramsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's active programs
  const programs = await prisma.program.findMany({
    where: {
      userId: user.id,
      isArchived: false,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch user's archived programs
  const archivedPrograms = await prisma.program.findMany({
    where: {
      userId: user.id,
      isArchived: true,
    },
    orderBy: { archivedAt: 'desc' },
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold dark:text-gray-100">My Programs</h1>
            <Link
              href="/programs/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Program
            </Link>
          </div>
        </div>

        {programs.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold dark:text-gray-100 mb-2">No programs yet</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Create a new training program to get started
              </p>
              <Link
                href="/programs/new"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create New Program
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ProgramsList programs={programs} />
            {archivedPrograms.length > 0 && (
              <div className="mt-6">
                <ArchivedProgramsList programs={archivedPrograms} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
