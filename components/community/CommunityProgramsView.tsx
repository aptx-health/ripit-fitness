'use client'

import { Check, ChevronDown, MessageSquarePlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import ProgramRequestModal from '@/components/features/ProgramRequestModal'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/radix/popover'
import {
  FITNESS_LEVELS,
  LEVEL_LABELS,
} from '@/lib/constants/program-metadata'
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle level change
  const handleLevelChange = (level: string | null) => {
    setUserSelectedLevel(level)
    setCurrentPage(1)
  }

  // Clear all filters
  const clearFilters = () => {
    setUserSelectedLevel(null)
    setCurrentPage(1)
  }

  // Check if any filters are active
  const hasActiveFilters = selectedLevel !== null

  return (
    <div>
        {/* Filter Buttons */}
        <div className="sticky top-0 bg-background z-10 pb-4">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Level Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="px-4 py-2 border-2 border-border text-foreground hover:border-primary transition-colors uppercase tracking-wider font-semibold doom-focus-ring flex items-center gap-2 text-sm">
                  Level: {selectedLevel ? LEVEL_LABELS[selectedLevel] : 'All'}
                  <ChevronDown size={16} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1">
                  <button type="button"
                    onClick={() => handleLevelChange(null)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10 transition-colors doom-focus-ring flex items-center justify-between uppercase tracking-wider font-medium"
                  >
                    All Levels
                    {selectedLevel === null && <Check size={16} className="text-primary" />}
                  </button>
                  {Object.values(FITNESS_LEVELS).map((level) => (
                    <button type="button"
                      key={level}
                      onClick={() => handleLevelChange(level)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10 transition-colors doom-focus-ring flex items-center justify-between uppercase tracking-wider font-medium"
                    >
                      {LEVEL_LABELS[level]}
                      {selectedLevel === level && <Check size={16} className="text-primary" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* TODO: Re-enable goals filter when program library grows */}

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button type="button"
                onClick={clearFilters}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider flex items-center gap-1 doom-focus-ring"
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>

          {/* Results count */}
          {filteredPrograms.length > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              Showing {filteredPrograms.length} program
              {filteredPrograms.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Empty State */}
        {filteredPrograms.length === 0 ? (
          <div className="bg-card border border-border p-12 text-center doom-noise doom-corners">
            <h2 className="text-xl font-semibold text-foreground mb-2 doom-heading uppercase tracking-wider">
              NO MATCHING PROGRAMS
            </h2>
            <p className="text-muted-foreground mb-6">
              {hasActiveFilters
                ? 'Try changing your filters. '
                : ''}
              We&apos;re adding new programs regularly and would love your suggestions &mdash;{' '}
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="text-primary hover:text-primary-hover underline underline-offset-2 transition-colors font-semibold"
                aria-label="Suggest a program"
              >
                tell us what you want to see
              </button>.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 bg-primary text-primary-foreground border-2 border-primary hover:bg-primary-hover transition-colors font-semibold uppercase tracking-wider text-sm doom-focus-ring"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Program Cards */}
            <div className="grid grid-cols-1 gap-4 mb-8">
              {paginatedPrograms.map((program) => (
                <CommunityProgramCard
                  key={program.id}
                  program={program}
                  currentUserId={currentUserId}
                  hasAccess={hasAccess}
                  maxPrograms={maxPrograms}
                />
              ))}
            </div>

            {/* Request a Program prompt */}
            <div className="border-2 border-dashed border-border bg-card/50 p-6 sm:p-8 text-center mb-8">
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                Looking for something specific?
              </p>
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="px-4 py-3 min-h-12 bg-muted text-foreground border-2 border-border hover:border-primary hover:text-primary transition-colors font-semibold uppercase tracking-wider text-sm doom-focus-ring inline-flex items-center gap-2"
                aria-label="Request a program"
              >
                <MessageSquarePlus size={18} />
                Request a Program
              </button>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
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
              <p className="text-center text-xs sm:text-sm text-muted-foreground mt-4">
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
