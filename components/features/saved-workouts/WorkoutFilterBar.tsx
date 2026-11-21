'use client'

import { Search, X } from 'lucide-react'
import { TAG_CHIP } from './TagsSheet'

type Props = {
  query: string
  onQueryChange: (query: string) => void
  /** The tags on the workouts the list shows. */
  tags: string[]
  activeTag: string | null
  onTagChange: (tag: string | null) => void
}

/**
 * Above the Workouts groups: a search box and a row of tag chips, one active
 * at a time (tap it again to clear). The list filters what it already fetched.
 */
export default function WorkoutFilterBar({ query, onQueryChange, tags, activeTag, onTagChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          aria-label="Search workouts"
          placeholder="Search workouts"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          autoComplete="off"
          // The browser's own clear button ignores the theme, so it's hidden for ours.
          className="doom-focus-ring min-h-12 w-full border-2 border-border bg-background pl-9 pr-12 text-sm text-foreground focus:border-primary [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onQueryChange('')}
            className="doom-focus-ring absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      {tags.length > 0 && (
        // Scrolls sideways rather than wrapping, so the groups stay near the top.
        <div role="group" aria-label="Filter by tag" className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={activeTag === tag}
              onClick={() => onTagChange(activeTag === tag ? null : tag)}
              className={`${TAG_CHIP} shrink-0 whitespace-nowrap`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
