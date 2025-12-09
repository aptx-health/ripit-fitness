import { redirect } from 'next/navigation'
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
          <ProgramsList programs={programs} />
        )}
      </div>
    </div>
  )
}
