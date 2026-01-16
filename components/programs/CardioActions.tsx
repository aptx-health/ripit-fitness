'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Star, Archive } from 'lucide-react'

type CardioActionsProps = {
  programId: string
  programName: string
  isActive: boolean
}

export function CardioPrimaryActions({
  programId,
  isActive,
}: {
  programId: string
  isActive: boolean
}) {
  return (
    <>
      <Link
        href={isActive ? '/cardio' : `/cardio/programs/${programId}`}
        className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider md:inline-block w-full md:w-auto text-center"
      >
        {isActive ? 'OPEN PROGRAM' : 'VIEW PROGRAM'}
      </Link>
      <Link
        href={`/cardio/programs/${programId}/edit`}
        className="px-4 py-2 border border-primary text-primary hover:bg-primary-muted doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider md:inline-block w-full md:w-auto text-center"
      >
        EDIT PROGRAM
      </Link>
    </>
  )
}

export function CardioUtilityActions({
  programId,
  programName,
  isActive,
  isMobile = false,
}: CardioActionsProps & { isMobile?: boolean }) {
  const router = useRouter()
  const [activating, setActivating] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const handleSetActive = async () => {
    setActivating(true)
    try {
      const response = await fetch(`/api/cardio/programs/${programId}/activate`, {
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
      const response = await fetch(`/api/cardio/programs/${programId}`, {
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
          <button
            onClick={handleSetActive}
            disabled={activating}
            className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors disabled:opacity-50"
            title="Set Active"
            aria-label="Set as active program"
          >
            <Star className="w-5 h-5" />
          </button>
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
        <button
          onClick={handleSetActive}
          disabled={activating}
          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors font-medium disabled:opacity-50"
        >
          {activating ? 'Activating...' : 'Set Active'}
        </button>
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
