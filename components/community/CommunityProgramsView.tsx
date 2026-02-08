'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, X, ChevronDown, Check } from 'lucide-react'
import CommunityProgramCard from './CommunityProgramCard'
import {
  FITNESS_LEVELS,
  LEVEL_LABELS,
  PROGRAM_GOALS,
  GOAL_LABELS,
} from '@/lib/constants/program-metadata'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/radix/popover'

type CommunityProgram = {
  id: string
  name: string
  description: string
  programType: string
  authorUserId: string
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

export default function CommunityProgramsView({
  communityPrograms,
  currentUserId,
}: CommunityProgramsViewProps) {
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type') || 'all'
  const [selectedType, setSelectedType] = useState<'all' | 'strength' | 'cardio'>(
    initialType as 'all' | 'strength' | 'cardio'
  )
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  // Sync state from URL on mount
  useEffect(() => {
    const type = searchParams.get('type')
    if (type === 'strength' || type === 'cardio' || type === 'all') {
      setSelectedType(type)
    }
  }, [searchParams])

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

    return filtered
  }, [communityPrograms, selectedType, selectedLevel, selectedGoals])

  // Paginate filtered programs
  const totalPages = Math.ceil(filteredPrograms.length / ITEMS_PER_PAGE)
  const paginatedPrograms = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredPrograms.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredPrograms, currentPage])

  // Handle filter change
  const handleTypeChange = (type: 'all' | 'strength' | 'cardio') => {
    setSelectedType(type)
    setCurrentPage(1) // Reset to first page when filter changes
    // Update URL without navigation
    const newUrl = type === 'all' ? '/community' : `/community?type=${type}`
    window.history.replaceState(null, '', newUrl)
  }

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
    <div className="min-h-screen bg-background pb-safe doom-page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/programs"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4 uppercase tracking-wider font-medium"
          >
            <ArrowLeft size={16} />
            Back to My Programs
          </Link>

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 doom-title uppercase tracking-wider">
            COMMUNITY PROGRAMS
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Discover and add training programs shared by the community
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="sticky top-0 bg-background z-10 pb-4 sm:pb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTypeChange('all')}
              className={`px-4 py-2 font-semibold transition-colors text-sm sm:text-base uppercase tracking-wider doom-focus-ring ${
                selectedType === 'all'
                  ? 'bg-primary text-primary-foreground doom-button-3d'
                  : 'border-2 border-border text-foreground hover:border-primary hover:text-primary'
              }`}
            >
              All ({communityPrograms.length})
            </button>
            <button
              onClick={() => handleTypeChange('strength')}
              className={`px-4 py-2 font-semibold transition-colors text-sm sm:text-base uppercase tracking-wider doom-focus-ring ${
                selectedType === 'strength'
                  ? 'bg-primary text-primary-foreground doom-button-3d'
                  : 'border-2 border-border text-foreground hover:border-primary hover:text-primary'
              }`}
            >
              Strength ({communityPrograms.filter((p) => p.programType === 'strength').length})
            </button>
            <button
              onClick={() => handleTypeChange('cardio')}
              className={`px-4 py-2 font-semibold transition-colors text-sm sm:text-base uppercase tracking-wider doom-focus-ring ${
                selectedType === 'cardio'
                  ? 'bg-primary text-primary-foreground doom-button-3d'
                  : 'border-2 border-border text-foreground hover:border-primary hover:text-primary'
              }`}
            >
              Cardio ({communityPrograms.filter((p) => p.programType === 'cardio').length})
            </button>
          </div>

          {/* Additional Filters - Compact Popovers */}
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            {/* Level Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="px-4 py-2 border-2 border-border text-foreground hover:border-primary transition-colors uppercase tracking-wider font-semibold doom-focus-ring flex items-center gap-2 text-sm">
                  Level: {selectedLevel ? LEVEL_LABELS[selectedLevel] : 'All'}
                  <ChevronDown size={16} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1">
                  <button
                    onClick={() => handleLevelChange(null)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10 transition-colors doom-focus-ring flex items-center justify-between uppercase tracking-wider font-medium"
                  >
                    All Levels
                    {selectedLevel === null && <Check size={16} className="text-primary" />}
                  </button>
                  {Object.values(FITNESS_LEVELS).map((level) => (
                    <button
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
                <button className="px-4 py-2 border-2 border-border text-foreground hover:border-primary transition-colors uppercase tracking-wider font-semibold doom-focus-ring flex items-center gap-2 text-sm">
                  Goals: {selectedGoals.length > 0 ? `${selectedGoals.length} selected` : 'Any'}
                  <ChevronDown size={16} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {Object.values(PROGRAM_GOALS).map((goal) => (
                    <button
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
              <button
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
              {selectedType === 'all'
                ? 'NO COMMUNITY PROGRAMS YET'
                : `NO ${selectedType.toUpperCase()} PROGRAMS YET`}
            </h2>
            <p className="text-muted-foreground mb-6">
              {selectedType === 'all'
                ? 'Be the first to publish a program!'
                : `No ${selectedType} programs have been published yet.`}
            </p>
            {selectedType !== 'all' && (
              <button
                onClick={() => handleTypeChange('all')}
                className="px-4 py-2 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors uppercase tracking-wider font-semibold doom-focus-ring"
              >
                VIEW ALL PROGRAMS
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Program Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
              {paginatedPrograms.map((program) => (
                <CommunityProgramCard
                  key={program.id}
                  program={program}
                  currentUserId={currentUserId}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
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
                      <button
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

                <button
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
    </div>
  )
}
