import { redirect } from 'next/navigation'
import SuggestionsList from '@/components/suggestions/SuggestionsList'
import { getCurrentUser } from '@/lib/auth/server'
import { listPendingSuggestions } from '@/lib/suggestions/detail'

/** The user's pending suggestions from their agents. */
export default async function SuggestionsPage() {
  const { user, error } = await getCurrentUser()
  if (error || !user) {
    redirect('/login')
  }

  const suggestions = await listPendingSuggestions(user.id)

  return (
    <div className="bg-background">
      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        <div className="px-4 sm:px-0 mb-4">
          <h1 className="text-4xl font-bold text-foreground doom-title uppercase tracking-wider">SUGGESTIONS</h1>
        </div>
        <div className="px-4 sm:px-0">
          <SuggestionsList suggestions={suggestions} />
        </div>
      </div>
    </div>
  )
}
