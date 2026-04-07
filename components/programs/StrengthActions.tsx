'use client'

import { Archive, Copy, Star } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import ActivationConfirmModal from './ActivationConfirmModal'

type StrengthActionsProps = {
  programId: string
  programName: string
  isActive: boolean
  existingActiveProgram?: { id: string; name: string } | null
}

export function StrengthPrimaryActions({
  programId,
  isActive,
  copyStatus,
}: {
  programId: string
  isActive: boolean
  copyStatus?: string | null
}) {
  const isCloning = copyStatus === 'cloning' || copyStatus?.startsWith('cloning_week_')

  return (
    <>
      {isActive && (
        <Link
          href="/training"
          className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider md:inline-block w-full md:w-auto text-center"
        >
          OPEN PROGRAM
        </Link>
      )}
      {isCloning ? (
        <div
          className="px-4 py-2 border border-muted-foreground/30 text-muted-foreground/50 bg-background doom-button-3d font-semibold uppercase tracking-wider md:inline-block w-full md:w-auto text-center cursor-not-allowed opacity-60"
          title="Program is still being cloned. Editing is disabled until cloning completes."
        >
          EDIT PROGRAM
        </div>
      ) : (
        <Link
          href={`/programs/${programId}/edit`}
          className="px-4 py-2 border border-accent text-accent hover:bg-accent-muted doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider md:inline-block w-full md:w-auto text-center"
        >
          EDIT PROGRAM
        </Link>
      )}
    </>
  )
}

export function StrengthUtilityActions({
  programId,
  programName,
  isActive,
  existingActiveProgram,
  isMobile = false,
}: StrengthActionsProps & { isMobile?: boolean }) {
  const router = useRouter()
  const [duplicating, setDuplicating] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [showActivationModal, setShowActivationModal] = useState(false)

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
      clientLogger.error('Error duplicating program:', error)
      alert('Failed to duplicate program. Please try again.')
    } finally {
      setDuplicating(false)
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
      clientLogger.error('Error archiving program:', error)
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
            <button type="button"
              onClick={handleDuplicate}
              disabled={duplicating}
              className="p-2 text-muted-foreground hover:text-accent hover:bg-muted rounded transition-colors disabled:opacity-50"
              title="Duplicate"
              aria-label="Duplicate program"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button type="button"
              onClick={() => setShowActivationModal(true)}
              className="p-2 text-muted-foreground hover:text-accent hover:bg-muted rounded transition-colors disabled:opacity-50"
              title="Set Active"
              aria-label="Set as active program"
            >
              <Star className="w-5 h-5" />
            </button>
          </>
        )}
        <button type="button"
          onClick={handleArchive}
          disabled={archiving}
          className="p-2 text-muted-foreground hover:text-error hover:bg-muted rounded transition-colors disabled:opacity-50"
          title="Archive"
          aria-label="Archive program"
        >
          <Archive className="w-5 h-5" />
        </button>
        {showActivationModal && (
          <ActivationConfirmModal
            programId={programId}
            programName={programName}
            existingActiveProgram={existingActiveProgram}
            onClose={() => setShowActivationModal(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
      {!isActive && (
        <>
          <button type="button"
            onClick={handleDuplicate}
            disabled={duplicating}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-accent hover:bg-muted transition-colors font-medium disabled:opacity-50"
          >
            {duplicating ? 'Duplicating...' : 'Duplicate'}
          </button>
          <button type="button"
            onClick={() => setShowActivationModal(true)}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-accent hover:bg-muted transition-colors font-medium"
          >
            Set Active
          </button>
        </>
      )}
      <button type="button"
        onClick={handleArchive}
        disabled={archiving}
        className="px-3 py-1.5 text-sm text-muted-foreground hover:text-error hover:bg-muted transition-colors font-medium disabled:opacity-50"
      >
        {archiving ? 'Archiving...' : 'Archive'}
      </button>
      {showActivationModal && (
        <ActivationConfirmModal
          programId={programId}
          programName={programName}
          existingActiveProgram={existingActiveProgram}
          onClose={() => setShowActivationModal(false)}
        />
      )}
    </>
  )
}
