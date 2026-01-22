'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, Star, Archive } from 'lucide-react'

type StrengthActionsProps = {
  programId: string
  programName: string
  isActive: boolean
}

export function StrengthPrimaryActions({
  programId,
  isActive,
}: {
  programId: string
  isActive: boolean
}) {
  return (
    <>
      <Link
        href={isActive ? '/training' : `/programs/${programId}`}
        className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider md:inline-block w-full md:w-auto text-center"
      >
        {isActive ? 'OPEN PROGRAM' : 'VIEW PROGRAM'}
      </Link>
      <Link
        href={`/programs/${programId}/edit`}
        className="px-4 py-2 border border-accent text-accent hover:bg-accent-muted doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider md:inline-block w-full md:w-auto text-center"
      >
        EDIT PROGRAM
      </Link>
    </>
  )
}

export function StrengthUtilityActions({
  programId,
  programName,
  isActive,
  isMobile = false,
}: StrengthActionsProps & { isMobile?: boolean }) {
  const router = useRouter()
  const [duplicating, setDuplicating] = useState(false)
  const [activating, setActivating] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const handleDuplicate = async () => {
    if (
      !confirm(
        `Duplicate "${programName}"? A copy will be created with all weeks, workouts, and exercises.`
      )
    ) {
      return
    }

    setDuplicating(true)
    try {
      const response = await fetch(`/api/programs/${programId}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate program')
      }

      router.refresh()
    } catch (error) {
      console.error('Error duplicating program:', error)
      alert('Failed to duplicate program. Please try again.')
    } finally {
      setDuplicating(false)
    }
  }

  const handleSetActive = async () => {
    setActivating(true)
    try {
      const response = await fetch(`/api/programs/${programId}/activate`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to activate program')
      }

      router.refresh()
    } catch (error) {
      console.error('Error activating program:', error)
      alert('Failed to activate program. Please try again.')
    } finally {
      setActivating(false)
    }
  }

  const handleArchive = async () => {
    setArchiving(true)
    try {
      const response = await fetch(`/api/programs/${programId}/delete`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to archive program')
      }

      router.refresh()
    } catch (error) {
      console.error('Error archiving program:', error)
      alert('Failed to archive program. Please try again.')
    } finally {
      setArchiving(false)
    }
  }

  if (isMobile) {
    return (
      <>
        {!isActive && (
          <>
            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              className="p-2 text-muted-foreground hover:text-accent hover:bg-muted rounded transition-colors disabled:opacity-50"
              title="Duplicate"
              aria-label="Duplicate program"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={handleSetActive}
              disabled={activating}
              className="p-2 text-muted-foreground hover:text-accent hover:bg-muted rounded transition-colors disabled:opacity-50"
              title="Set Active"
              aria-label="Set as active program"
            >
              <Star className="w-5 h-5" />
            </button>
          </>
        )}
        <button
          onClick={handleArchive}
          disabled={archiving}
          className="p-2 text-muted-foreground hover:text-error hover:bg-muted rounded transition-colors disabled:opacity-50"
          title="Archive"
          aria-label="Archive program"
        >
          <Archive className="w-5 h-5" />
        </button>
      </>
    )
  }

  return (
    <>
      {!isActive && (
        <>
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-accent hover:bg-muted transition-colors font-medium disabled:opacity-50"
          >
            {duplicating ? 'Duplicating...' : 'Duplicate'}
          </button>
          <button
            onClick={handleSetActive}
            disabled={activating}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-accent hover:bg-muted transition-colors font-medium disabled:opacity-50"
          >
            {activating ? 'Activating...' : 'Set Active'}
          </button>
        </>
      )}
      <button
        onClick={handleArchive}
        disabled={archiving}
        className="px-3 py-1.5 text-sm text-muted-foreground hover:text-error hover:bg-muted transition-colors font-medium disabled:opacity-50"
      >
        {archiving ? 'Archiving...' : 'Archive'}
      </button>
    </>
  )
}
