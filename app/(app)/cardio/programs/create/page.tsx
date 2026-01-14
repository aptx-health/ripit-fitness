import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CardioProgramBuilder from '@/components/CardioProgramBuilder'

export default async function CreateCardioProgramPage() {
  // Get authenticated user
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-foreground doom-title mb-2">
            CREATE CARDIO PROGRAM
          </h1>
          <p className="text-muted-foreground">
            Build a structured multi-week cardio training program
          </p>
        </div>

        {/* Program Builder */}
        <CardioProgramBuilder />
      </div>
    </div>
  )
}
