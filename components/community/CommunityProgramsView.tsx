'use client'

import { Check, ChevronDown, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import FeedbackModal from '@/components/features/FeedbackModal'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/radix/popover'
import {
  FITNESS_LEVELS,
  GOAL_LABELS,
  LEVEL_LABELS,
  PROGRAM_GOALS,
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
}: CommunityProgramsViewProps) {
  const [selectedType] = useState<'all' | 'strength'>('all')
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  // Filter programs by type, level, and goals
  const filteredPrograms = useMemo(() => {
    let filtered = communityPrograms

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter((p) => p.programType === selectedType)
    }

    // Filter by level
    if (selectedLevel) {
      filtered = filtered.filter((p) => p.level === selectedLevel)
    }

    // Filter by goals (program has ANY of selected goals)
    if (selectedGoals.length > 0) {
      filtered = filtered.filter((p) =>
        p.goals.some((goal) => selectedGoals.includes(goal))
      )
    }

    // Sort by level priority (beginner → intermediate → advanced) so gym-beta
    // newcomers land on beginner content first. JS's Array.sort is stable
    // (ES2019+), which preserves the server-side publishedAt DESC order
    // within each level bucket.
    return [...filtered].sort(
      (a, b) => getLevelPriority(a.level) - getLevelPriority(b.level)
    )
  }, [communityPrograms, selectedType, selectedLevel, selectedGoals])

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

  // Handle goal toggle
  const handleGoalToggle = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    )
    setCurrentPage(1) // Reset to first page when filter changes
  }

  // Handle level change
  const handleLevelChange = (level: string | null) => {
    setSelectedLevel(level)
    setCurrentPage(1)
  }

  // Clear all filters
  const clearFilters = () => {
    setSelectedLevel(null)
    setSelectedGoals([])
    setCurrentPage(1)
  }

  // Check if any filters are active
  const hasActiveFilters = selectedLevel !== null || selectedGoals.length > 0

  return (
    <div>
        {/* Filter Buttons */}
        <div className="sticky top-0 bg-background z-10 pb-4">
          <div className="flex flex-wrap gap-2">
            <span className="px-4 py-2 bg-primary text-primary-foreground doom-button-3d font-semibold text-sm sm:text-base uppercase tracking-wider">
              All ({communityPrograms.length})
            </span>
          </div>

          {/* Additional Filters - Compact Popovers */}
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            {/* Level Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" data-tour="level-filter" className="px-4 py-2 border-2 border-border text-foreground hover:border-primary transition-colors uppercase tracking-wider font-semibold doom-focus-ring flex items-center gap-2 text-sm">
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

            {/* Goals Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" data-tour="goals-filter" className="px-4 py-2 border-2 border-border text-foreground hover:border-primary transition-colors uppercase tracking-wider font-semibold doom-focus-ring flex items-center gap-2 text-sm">
                  Goals: {selectedGoals.length > 0 ? `${selectedGoals.length} selected` : 'Any'}
                  <ChevronDown size={16} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {Object.values(PROGRAM_GOALS).map((goal) => (
                    <button type="button"
                      key={goal}
                      onClick={() => handleGoalToggle(goal)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10 transition-colors doom-focus-ring flex items-center justify-between uppercase tracking-wider font-medium"
                    >
                      {GOAL_LABELS[goal]}
                      {selectedGoals.includes(goal) && <Check size={16} className="text-primary" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

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
          <>
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
            <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
          </>
        ) : (
          <>
            {/* Program Cards */}
            <div className="grid grid-cols-1 gap-4 mb-8">
              {paginatedPrograms.map((program, index) => (
                <CommunityProgramCard
                  key={program.id}
                  program={program}
                  currentUserId={currentUserId}
                  {...(index === 0 ? { 'data-tour': 'program-card' } : {})}
                />
              ))}
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
    </div>
  )
}
