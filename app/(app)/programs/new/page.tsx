import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/server'
import ProgramBuilder from '@/components/ProgramBuilder'

export default async function NewProgramPage() {
  const { user } = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/programs"
              className="doom-link"
            >
              ← Back to Programs
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-foreground doom-heading">Create New Program</h1>
          <p className="text-muted-foreground mt-2">
            Build your training program from scratch
          </p>
        </div>

        <ProgramBuilder />
      </div>
    </div>
  )
}