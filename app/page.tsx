import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is logged in, redirect to training page
  if (user) {
    redirect('/training')
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">FitCSV</h1>
        <p className="text-xl text-gray-600 mb-8">
          Your flexible strength training tracker. Import programs from CSV and log workouts without constraints.
        </p>

        <div className="space-x-4">
          <Link
            href="/signup"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-white text-gray-900 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8 text-left">
          <div>
            <h3 className="font-semibold text-lg mb-2">CSV Import</h3>
            <p className="text-gray-600">Import any program from a simple CSV file. No rigid app templates.</p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Track Progress</h3>
            <p className="text-gray-600">Log sets, reps, and weight. Optional RPE/RIR tracking.</p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Your Data</h3>
            <p className="text-gray-600">Your programs, your way. Export anytime.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
