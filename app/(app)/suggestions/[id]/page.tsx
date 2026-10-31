import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import SuggestionReview from '@/components/suggestions/SuggestionReview'
import { getCurrentUser } from '@/lib/auth/server'
import { getSuggestionDetail } from '@/lib/suggestions/detail'

/** Review one suggestion. Another user's, an unknown or a hidden-kind id is a real 404. */
export default async function SuggestionPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { user, error }] = await Promise.all([params, getCurrentUser()])
  if (error || !user) {
    redirect('/login')
  }

  const suggestion = await getSuggestionDetail(user.id, id)
  if (!suggestion) notFound()

  return (
    <div className="bg-background">
      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        <div className="px-4 sm:px-0 pt-4 mb-4">
          <Link
            href="/suggestions"
            className="relative inline-flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground doom-focus-ring before:content-[''] before:absolute before:-inset-3"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Suggestions
          </Link>
        </div>
        <div className="px-4 sm:px-0">
          <SuggestionReview suggestion={suggestion} />
        </div>
      </div>
    </div>
  )
}
