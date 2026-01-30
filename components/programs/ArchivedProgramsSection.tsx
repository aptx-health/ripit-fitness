'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'

type ArchivedProgram = {
  id: string
  name: string
  description: string | null
  archivedAt: Date | null
}

type ArchivedProgramsSectionProps = {
  count: number
  programType: 'strength' | 'cardio'
}

export default function ArchivedProgramsSection({
  count,
  programType,
}: ArchivedProgramsSectionProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [programs, setPrograms] = useState<ArchivedProgram[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null)

  const apiPath =
    programType === 'strength'
      ? '/api/programs'
      : '/api/cardio/programs'

  // Only strength programs can be unarchived currently
  const canUnarchive = programType === 'strength'

  // Fetch archived programs when expanded
  useEffect(() => {
    if (isExpanded && programs.length === 0) {
      fetchArchivedPrograms()
    }
  }, [isExpanded])

  const fetchArchivedPrograms = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${apiPath}/archived?limit=5`)
      if (!response.ok) {
        throw new Error('Failed to fetch archived programs')
      }
      const data = await response.json()
      setPrograms(data.programs)
    } catch (error) {
      console.error('Error fetching archived programs:', error)
      alert('Failed to load archived programs. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnarchive = async (programId: string, programName: string) => {
    if (
      !confirm(
        `Unarchive "${programName}"? It will be restored to your active programs list.`
      )
    ) {
      return
    }

    setUnarchivingId(programId)
    try {
      const response = await fetch(`${apiPath}/${programId}/unarchive`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to unarchive program')
      }

      router.refresh()
    } catch (error) {
      console.error('Error unarchiving program:', error)
      alert('Failed to unarchive program. Please try again.')
    } finally {
      setUnarchivingId(null)
    }
  }

  if (count === 0) {
    return null
  }

  return (
    <div className="bg-card border border-border doom-corners">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
          <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide">
            Archived Programs
          </h2>
          <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-semibold">
            {count}
          </span>
        </div>
      </button>

      {/* Archived Programs List */}
      {isExpanded && (
        <div className="border-t border-border">
          {isLoading ? (
            // Loading skeleton
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-6 py-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-muted animate-pulse rounded w-48" />
                      <div className="h-4 bg-muted animate-pulse rounded w-64" />
                      <div className="h-3 bg-muted animate-pulse rounded w-32" />
                    </div>
                    <div className="ml-4 flex gap-2">
                      <div className="h-7 w-12 bg-muted animate-pulse rounded" />
                      {canUnarchive && (
                        <div className="h-7 w-20 bg-muted animate-pulse rounded" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Actual programs list
            <div className="divide-y divide-border">
              {programs.map((program) => (
                <div
                  key={program.id}
                  className="px-6 py-4 hover:bg-muted transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-medium text-foreground uppercase">
                          {program.name}
                        </h3>
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-medium">
                          ARCHIVED
                        </span>
                      </div>
                      {program.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {program.description}
                        </p>
                      )}
                      {program.archivedAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Archived on{' '}
                          {new Date(program.archivedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex gap-2">
                      {canUnarchive && (
                        <button
                          onClick={() =>
                            handleUnarchive(program.id, program.name)
                          }
                          disabled={unarchivingId === program.id}
                          className="px-3 py-1.5 text-sm bg-primary-muted text-primary hover:bg-primary hover:text-primary-foreground font-medium transition-colors disabled:opacity-50"
                        >
                          {unarchivingId === program.id
                            ? 'Unarchiving...'
                            : 'Unarchive'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
