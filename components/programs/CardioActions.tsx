'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Star, Archive, Upload } from 'lucide-react'
import PublishProgramDialog from '@/components/community/PublishProgramDialog'

type CardioActionsProps = {
  programId: string
  programName: string
  isActive: boolean
}

export function CardioPrimaryActions({
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
          href="/cardio"
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
          href={`/cardio/programs/${programId}/edit`}
          className="px-4 py-2 border border-accent text-accent hover:bg-accent-muted doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider md:inline-block w-full md:w-auto text-center"
        >
          EDIT PROGRAM
        </Link>
      )}
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
  const [showPublishDialog, setShowPublishDialog] = useState(false)

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
            className="p-2 text-muted-foreground hover:text-accent hover:bg-muted rounded transition-colors disabled:opacity-50"
            title="Set Active"
            aria-label="Set as active program"
          >
            <Star className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => setShowPublishDialog(true)}
          className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
          title="Publish to Community"
          aria-label="Publish program to community"
        >
          <Upload className="w-5 h-5" />
        </button>
        <button
          onClick={handleArchive}
          disabled={archiving}
          className="p-2 text-muted-foreground hover:text-error hover:bg-muted rounded transition-colors disabled:opacity-50"
          title="Archive"
          aria-label="Archive program"
        >
          <Archive className="w-5 h-5" />
        </button>
        <PublishProgramDialog
          open={showPublishDialog}
          onOpenChange={setShowPublishDialog}
          programId={programId}
          programName={programName}
        />
      </>
    )
  }

  return (
    <>
      {!isActive && (
        <button
          onClick={handleSetActive}
          disabled={activating}
          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-accent hover:bg-muted transition-colors font-medium disabled:opacity-50"
        >
          {activating ? 'Activating...' : 'Set Active'}
        </button>
      )}
      <button
        onClick={() => setShowPublishDialog(true)}
        className="px-3 py-1.5 text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors font-medium"
      >
        Publish to Community
      </button>
      <button
        onClick={handleArchive}
        disabled={archiving}
        className="px-3 py-1.5 text-sm text-muted-foreground hover:text-error hover:bg-muted transition-colors font-medium disabled:opacity-50"
      >
        {archiving ? 'Archiving...' : 'Archive'}
      </button>
      <PublishProgramDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        programId={programId}
        programName={programName}
      />
    </>
  )
}
