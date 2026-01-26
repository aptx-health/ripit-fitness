'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CommunityProgramCard from './CommunityProgramCard'

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
  const [currentPage, setCurrentPage] = useState(1)

  // Sync state from URL on mount
  useEffect(() => {
    const type = searchParams.get('type')
    if (type === 'strength' || type === 'cardio' || type === 'all') {
      setSelectedType(type)
    }
  }, [searchParams])

  // Filter programs by type
  const filteredPrograms = useMemo(() => {
    if (selectedType === 'all') {
      return communityPrograms
    }
    return communityPrograms.filter((program) => program.programType === selectedType)
  }, [communityPrograms, selectedType])

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

  return (
    <div className="min-h-screen bg-background pb-safe">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/programs"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Back to My Programs
          </Link>

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Community Programs
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
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                selectedType === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              All Programs ({communityPrograms.length})
            </button>
            <button
              onClick={() => handleTypeChange('strength')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                selectedType === 'strength'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              Strength ({communityPrograms.filter((p) => p.programType === 'strength').length})
            </button>
            <button
              onClick={() => handleTypeChange('cardio')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                selectedType === 'cardio'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              Cardio ({communityPrograms.filter((p) => p.programType === 'cardio').length})
            </button>
          </div>

          {/* Results count */}
          {selectedType !== 'all' && filteredPrograms.length > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              Showing {filteredPrograms.length} {selectedType} program
              {filteredPrograms.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Empty State */}
        {filteredPrograms.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <p className="text-base sm:text-lg text-muted-foreground">
              {selectedType === 'all'
                ? 'No community programs yet. Be the first to publish!'
                : `No ${selectedType} programs published yet.`}
            </p>
            {selectedType !== 'all' && (
              <button
                onClick={() => handleTypeChange('all')}
                className="mt-4 text-sm text-primary hover:text-primary-hover transition-colors"
              >
                View all programs
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
                  className="px-3 sm:px-4 py-2 rounded-lg border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors text-sm sm:text-base"
                >
                  Previous
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
                        className={`px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                          currentPage === page
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border text-foreground hover:bg-muted'
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
                  className="px-3 sm:px-4 py-2 rounded-lg border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors text-sm sm:text-base"
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
