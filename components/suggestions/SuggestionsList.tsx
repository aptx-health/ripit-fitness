import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { suggestionKindLabel } from '@/lib/suggestions/kinds'
import type { SuggestionItem } from '@/lib/suggestions/types'

/**
 * The user's pending suggestions, newest first, each opening its review
 * screen. Titles and rationales are agent text, rendered as plain text.
 */
export default function SuggestionsList({ suggestions }: { suggestions: SuggestionItem[] }) {
  if (suggestions.length === 0) {
    return (
      <div className="bg-card border-y sm:border border-border doom-noise doom-card p-8 text-center space-y-4">
        <p className="text-muted-foreground">No suggestions right now.</p>
        <Link
          href="/training"
          className="inline-block text-sm font-semibold uppercase tracking-wider text-primary hover:text-primary-hover doom-link"
        >
          Back to Training
        </Link>
      </div>
    )
  }

  return (
    <ul className="bg-card border border-border doom-corners divide-y divide-border">
      {suggestions.map((item) => (
        <li key={item.id}>
          <Link
            href={`/suggestions/${item.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 doom-focus-ring"
          >
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">{suggestionKindLabel(item.kind)}</p>
              <p className="font-semibold text-foreground break-words">{item.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-2 break-words">{item.rationale}</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
