import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/server'
import ExerciseAdminTable from '@/components/admin/ExerciseAdminTable'

// Don't cache this page - exercises should be fresh
export const revalidate = 0

export default async function AdminExercisesPage() {
  const { user } = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // TODO: Add admin check when admin system is built
  // const isAdmin = await checkUserIsAdmin(user.id)
  // if (!isAdmin) redirect('/programs')

  return (
    <div className="min-h-screen bg-background pb-safe doom-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 doom-title uppercase tracking-wider">
            EXERCISE DEFINITIONS
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage all exercise definitions in the system
          </p>
        </div>

        {/* Table */}
        <ExerciseAdminTable />
      </div>
    </div>
  )
}
