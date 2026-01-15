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
    <div className="min-h-screen bg-background doom-page-enter">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="mb-4">
            <Link
              href="/training"
              className="text-primary hover:text-primary-hover font-medium"
            >
              ← STRENGTH DASHBOARD
            </Link>
          </div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground doom-title">STRENGTH PROGRAMS</h1>
              <p className="text-muted-foreground mt-1">
                Create and manage your strength training programs
              </p>
            </div>
            <Link
              href="/programs/new"
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              CREATE NEW PROGRAM
            </Link>
          </div>
        </div>

        {programs.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2 doom-heading">NO PROGRAMS YET</h2>
              <p className="text-muted-foreground mb-6">
                Create a new training program to get started
              </p>
              <Link
                href="/programs/new"
                className="inline-block px-6 py-3 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
              >
                CREATE NEW PROGRAM
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
