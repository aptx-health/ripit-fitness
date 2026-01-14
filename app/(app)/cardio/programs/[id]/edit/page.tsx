import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import CardioProgramBuilder from '@/components/CardioProgramBuilder'

export default async function EditCardioProgramPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  // Get authenticated user
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Await params (Next.js 15 pattern)
  const { id } = await params

  // Fetch program
  const program = await prisma.cardioProgram.findFirst({
    where: {
      id,
      userId: user.id
    },
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

  if (!program) {
    redirect('/cardio/programs')
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-foreground doom-title mb-2">
            EDIT CARDIO PROGRAM
          </h1>
          <p className="text-muted-foreground">
            Modify your cardio training program
          </p>
        </div>

        {/* Program Builder */}
        <CardioProgramBuilder editMode existingProgram={program} />
      </div>
    </div>
  )
}
