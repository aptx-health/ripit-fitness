'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell, Activity } from 'lucide-react'
import UnpublishProgramDialog from './UnpublishProgramDialog'

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

type CommunityProgramCardProps = {
  program: CommunityProgram
  currentUserId: string
}

export default function CommunityProgramCard({
  program,
  currentUserId,
}: CommunityProgramCardProps) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAuthor = program.authorUserId === currentUserId

  // Format published date
  const formatDate = (date: Date) => {
    const now = new Date()
    const published = new Date(date)
    const diffInMs = now.getTime() - published.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
    return `${Math.floor(diffInDays / 365)} years ago`
  }

  const handleAddProgram = async () => {
    setIsAdding(true)
    setError(null)

    try {
      const response = await fetch(`/api/community/${program.id}/add`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add program')
      }

      // Redirect to programs page to see the newly added program
      router.push('/programs')
    } catch (err) {
      console.error('Error adding program:', err)
      setError(err instanceof Error ? err.message : 'Failed to add program')
      setIsAdding(false)
    }
  }

  return (
    <>
      <div className="p-4 sm:p-6 bg-card border border-border rounded-xl hover:border-primary transition-colors">
        {/* Header */}
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-foreground break-words">
              {program.name}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              by {program.displayName}
            </p>
          </div>

          {/* Badges */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {/* Author badge */}
            {isAuthor && (
              <span className="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded whitespace-nowrap">
                YOUR PROGRAM
              </span>
            )}

            {/* Type badge */}
            <span
              className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded inline-flex items-center gap-1 whitespace-nowrap"
              aria-label={`${program.programType} program`}
            >
              {program.programType === 'strength' ? (
                <Dumbbell size={12} />
              ) : (
                <Activity size={12} />
              )}
              <span className="capitalize">{program.programType}</span>
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-foreground/80 mb-4 line-clamp-2 break-words">
          {program.description}
        </p>

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground mb-3">
          <span>{program.weekCount} weeks</span>
          <span className="hidden sm:inline">•</span>
          <span>{program.workoutCount} workouts</span>
          <span className="hidden sm:inline">•</span>
          <span>{program.exerciseCount} exercises</span>
        </div>

        {/* Published date */}
        <div className="text-xs text-muted-foreground mb-4">
          Published {formatDate(program.publishedAt)}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error rounded-lg">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!isAuthor ? (
            <button
              onClick={handleAddProgram}
              disabled={isAdding}
              className="flex-1 px-4 py-2.5 sm:py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isAdding ? 'Adding...' : 'Add to My Programs'}
            </button>
          ) : (
            <button
              onClick={() => setShowUnpublishDialog(true)}
              className="flex-1 px-4 py-2.5 sm:py-3 border border-error text-error rounded-lg hover:bg-error/10 transition-colors font-medium text-sm sm:text-base"
            >
              Unpublish
            </button>
          )}
        </div>
      </div>

      {/* Unpublish Dialog */}
      {isAuthor && (
        <UnpublishProgramDialog
          open={showUnpublishDialog}
          onOpenChange={setShowUnpublishDialog}
          programId={program.id}
          programName={program.name}
        />
      )}
    </>
  )
}
