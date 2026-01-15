import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CardioProgramsList from '@/components/CardioProgramsList'

export default async function CardioProgramsPage() {
  // Get authenticated user
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch cardio programs
  const programs = await prisma.cardioProgram.findMany({
    where: {
      userId: user.id,
      isArchived: false
    },
    orderBy: [
      { isActive: 'desc' },
      { createdAt: 'desc' }
    ],
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          sessions: {
            orderBy: { dayNumber: 'asc' }
          }
        }
      }
    }
  })

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href="/cardio"
            className="text-primary hover:text-primary-hover font-medium"
          >
            ← CARDIO DASHBOARD
          </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-foreground doom-title mb-2">
              CARDIO PROGRAMS
            </h1>
            <p className="text-muted-foreground">
              Create and manage your cardio training programs
            </p>
          </div>
          <Link
            href="/cardio/programs/create"
            className="px-6 py-3 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
          >
            CREATE PROGRAM
          </Link>
        </div>

        {/* Programs List */}
        <CardioProgramsList programs={programs} />
      </div>
    </div>
  )
}
