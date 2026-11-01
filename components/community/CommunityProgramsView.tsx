'use client'

import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, MessageSquarePlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import ProgramRequestModal from '@/components/features/ProgramRequestModal'
import {
  FITNESS_LEVELS,
  LEVEL_LABELS,
} from '@/lib/constants/program-metadata'
import { pluralize } from '@/lib/format/pluralize'
import { scrollAppToTop } from '@/lib/nav/app-scroll'
import CommunityProgramCard from './CommunityProgramCard'

type CommunityProgram = {
  id: string
  name: string
  description: string
  programType: string
  authorUserId: string | null
  displayName: string
  publishedAt: Date
  weekCount: number
  workoutCount: number
  exerciseCount: number
  goals: string[]
  level: string | null
  durationDisplay: string | null
  targetDaysPerWeek: number | null
  equipmentNeeded: string[]
  focusAreas: string[]
}

type CommunityProgramsViewProps = {
  communityPrograms: CommunityProgram[]
  currentUserId: string
  defaultLevel?: string | null
  hasAccess: boolean
  maxPrograms: number
}

const ITEMS_PER_PAGE = 20

// Sort priority: Beginner → Intermediate → Advanced → unspecified
// Beginner programs (especially Machine Starter) should surface first for
// new users coming in from the gym beta. Unknown/null levels sort last so
// they don't push curated beginner content down.
const LEVEL_SORT_PRIORITY: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
}
const UNKNOWN_LEVEL_PRIORITY = 3

function getLevelPriority(level: string | null): number {
  if (!level) return UNKNOWN_LEVEL_PRIORITY
  return LEVEL_SORT_PRIORITY[level] ?? UNKNOWN_LEVEL_PRIORITY
}

export default function CommunityProgramsView({
  communityPrograms,
  currentUserId,
  defaultLevel = null,
  hasAccess,
  maxPrograms,
}: CommunityProgramsViewProps) {
  // undefined = user hasn't interacted, use defaultLevel; null = user chose "All"
  const [userSelectedLevel, setUserSelectedLevel] = useState<string | null | undefined>(undefined)
  const selectedLevel = userSelectedLevel === undefined ? (defaultLevel ?? null) : userSelectedLevel
  const [currentPage, setCurrentPage] = useState(1)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [levelMenuOpen, setLevelMenuOpen] = useState(false)

  // Filter programs by type, level, and goals
  const filteredPrograms = useMemo(() => {
    let filtered = communityPrograms

    // Filter by level
    if (selectedLevel) {
      filtered = filtered.filter((p) => p.level === selectedLevel)
    }

    // Sort by level priority (beginner → intermediate → advanced) so gym-beta
    // newcomers land on beginner content first. JS's Array.sort is stable
    // (ES2019+), which preserves the server-side publishedAt DESC order
    // within each level bucket. Secondary sort by publishedAt ASC so
    // earlier-seeded programs (Machine Starter) surface first.
    return [...filtered].sort((a, b) => {
      const levelDiff = getLevelPriority(a.level) - getLevelPriority(b.level)
      if (levelDiff !== 0) return levelDiff
      return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
    })
  }, [communityPrograms, selectedLevel])

  // Paginate filtered programs
  const totalPages = Math.ceil(filteredPrograms.length / ITEMS_PER_PAGE)
  const paginatedPrograms = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredPrograms.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredPrograms, currentPage])

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of list
    scrollAppToTop('smooth')
  }

  // Handle level change
  const handleLevelChange = (level: string | null) => {
    setUserSelectedLevel(level)
    setCurrentPage(1)
    setLevelMenuOpen(false)
  }

  // Clear all filters
  const clearFilters = () => {
    setUserSelectedLevel(null)
    setCurrentPage(1)
  }

  // Check if any filters are active
  const hasActiveFilters = selectedLevel !== null

  // The type chip only says something when the programs shown differ in type.
  const showType = new Set(filteredPrograms.map((p) => p.programType)).size > 1

  return (
    <div>
        {/* Filter strip: sticks to the top of the Programs box while the list scrolls. */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-1.5">
          <div className="flex items-center gap-1">
            {/* Level: a small dimmed tab, like "All suggestions" on Training */}
            <Popover.Root open={levelMenuOpen} onOpenChange={setLevelMenuOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex min-h-12 items-center gap-1.5 bg-primary/15 px-3 text-[13px] font-bold uppercase tracking-wider text-foreground hover:bg-primary/25 doom-focus-ring"
                >
                  Level: {selectedLevel ? LEVEL_LABELS[selectedLevel] : 'All'}
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                {/* A plain menu like the saved-workout row menu (no corner brackets). */}
                <Popover.Content
                  align="start"
                  sideOffset={4}
                  className="folder-box z-[100] w-56 border-2 border-border bg-card p-2 shadow-xl"
                >
                  <div className="space-y-1">
                    <button type="button"
                      onClick={() => handleLevelChange(null)}
                      className="w-full min-h-12 px-3 py-2 text-left text-sm hover:bg-primary/10 transition-colors doom-focus-ring flex items-center justify-between uppercase tracking-wider font-medium"
                    >
                      All Levels
                      {selectedLevel === null && <Check size={16} className="text-primary" />}
                    </button>
                    {Object.values(FITNESS_LEVELS).map((level) => (
                      <button type="button"
                        key={level}
                        onClick={() => handleLevelChange(level)}
                        className="w-full min-h-12 px-3 py-2 text-left text-sm hover:bg-primary/10 transition-colors doom-focus-ring flex items-center justify-between uppercase tracking-wider font-medium"
                      >
                        {LEVEL_LABELS[level]}
                        {selectedLevel === level && <Check size={16} className="text-primary" />}
                      </button>
                    ))}
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            {/* TODO: Re-enable goals filter when program library grows */}

            {hasActiveFilters && (
              <button type="button"
                onClick={clearFilters}
                className="inline-flex min-h-12 items-center gap-1 px-3 text-sm font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground doom-focus-ring"
              >
                <X size={14} aria-hidden="true" />
                Clear
              </button>
            )}
          </div>

          {filteredPrograms.length > 0 && (
            <p className="text-sm text-muted-foreground">{pluralize(filteredPrograms.length, 'program')}</p>
          )}
        </div>

        {filteredPrograms.length === 0 ? (
          // Training's EmptyLine, with a way to ask for a program
          <div className="px-4 py-5">
            <p className="text-sm text-muted-foreground">
              No matching programs. {hasActiveFilters ? 'Try another level. ' : ''}
              We&apos;re adding new programs regularly; tell us what you want to see.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex min-h-12 items-center px-4 border border-border text-foreground hover:bg-muted doom-focus-ring text-sm font-semibold uppercase tracking-wider"
                >
                  Clear filters
                </button>
              )}
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="inline-flex min-h-12 items-center gap-1.5 px-4 border border-border text-foreground hover:bg-muted doom-focus-ring text-sm font-semibold uppercase tracking-wider"
              >
                <MessageSquarePlus size={14} aria-hidden="true" />
                Suggest a program
              </button>
            </div>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {paginatedPrograms.map((program) => (
                <CommunityProgramCard
                  key={program.id}
                  program={program}
                  currentUserId={currentUserId}
                  hasAccess={hasAccess}
                  maxPrograms={maxPrograms}
                  showType={showType}
                />
              ))}
            </ul>

            {/* Request a program: a quiet last row */}
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">Looking for something specific?</p>
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="shrink-0 inline-flex min-h-12 items-center gap-1.5 px-3 border border-border text-foreground hover:bg-muted doom-focus-ring text-sm font-semibold uppercase tracking-wider"
                aria-label="Request a program"
              >
                <MessageSquarePlus size={14} aria-hidden="true" />
                Request
              </button>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 flex-wrap border-t border-border px-4 pt-4">
                <button type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 sm:px-4 py-2 border-2 border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-colors text-sm sm:text-base uppercase tracking-wider font-semibold doom-focus-ring"
                >
                  Prev
                </button>

                <div className="flex gap-1 sm:gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1

                    // Show ellipsis
                    const showEllipsis =
                      (page === currentPage - 2 && currentPage > 3) ||
                      (page === currentPage + 2 && currentPage < totalPages - 2)

                    if (!showPage && !showEllipsis) return null

                    if (showEllipsis) {
                      return (
                        <span
                          key={page}
                          className="px-2 sm:px-3 py-2 text-muted-foreground text-sm sm:text-base"
                        >
                          ...
                        </span>
                      )
                    }

                    return (
                      <button type="button"
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 sm:px-4 py-2 transition-colors text-sm sm:text-base font-semibold doom-focus-ring ${
                          currentPage === page
                            ? 'bg-primary text-primary-foreground doom-button-3d'
                            : 'border-2 border-border text-foreground hover:border-primary hover:text-primary'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>

                <button type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 sm:px-4 py-2 border-2 border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-colors text-sm sm:text-base uppercase tracking-wider font-semibold doom-focus-ring"
                >
                  Next
                </button>
              </div>
            )}

            {/* Page info */}
            {totalPages > 1 && (
              <p className="text-center text-xs sm:text-sm text-muted-foreground px-4 pt-3 pb-4">
                Page {currentPage} of {totalPages} • Showing{' '}
                {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredPrograms.length)} of{' '}
                {filteredPrograms.length} programs
              </p>
            )}
          </>
        )}

        <ProgramRequestModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  )
}
