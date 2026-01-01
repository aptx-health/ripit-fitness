import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { CsvUploader } from '@/components/features/CsvUploader'
import ProgramsList from '@/components/ProgramsList'

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">My Programs</h1>
            <Link
              href="/programs/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Program
            </Link>
          </div>
          {programs.length > 0 && (
            <div className="bg-white rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium mb-3">Import from CSV</h2>
              <CsvUploader />
            </div>
          )}
        </div>

        {programs.length === 0 ? (
          <div className="bg-white rounded-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-2">No programs yet</h2>
              <p className="text-gray-600 mb-6">
                Create a new program from scratch or import from a CSV file
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/programs/new"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create New Program
                </Link>
                <span className="text-gray-400 self-center">or</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">Import from CSV</h3>
              <CsvUploader />
            </div>
          </div>
        ) : (
          <ProgramsList programs={programs} />
        )}
      </div>
    </div>
  )
}
