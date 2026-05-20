'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import { startFreestyleWorkout } from '@/lib/api/adhoc-workout'
import { clientLogger } from '@/lib/client-logger'
import DeleteSavedWorkoutDialog from './DeleteSavedWorkoutDialog'
import RenameSavedWorkoutDialog from './RenameSavedWorkoutDialog'
import SavedWorkoutDetailDialog from './SavedWorkoutDetailDialog'
import SavedWorkoutRow, { type SavedWorkoutListItem } from './SavedWorkoutRow'

export default function SavedWorkoutsList() {
  const toast = useToast()
  const router = useRouter()

  const [items, setItems] = useState<SavedWorkoutListItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<SavedWorkoutListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SavedWorkoutListItem | null>(null)
  const [detailTarget, setDetailTarget] = useState<SavedWorkoutListItem | null>(null)
  const [startingFreestyle, setStartingFreestyle] = useState(false)

  const fetchList = useCallback(async () => {
    try {
      setLoadError(null)
      const res = await fetch('/api/workouts/saved', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`)
      }
      const data = (await res.json()) as { saved: SavedWorkoutListItem[] }
      setItems(data.saved)
    } catch (err) {
      clientLogger.error('Failed to load saved workouts', err)
      setLoadError('Could not load saved workouts. Pull to retry.')
      setItems([])
    }
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleRenameSuccess = useCallback((updated: SavedWorkoutListItem) => {
    setItems((prev) =>
      prev ? prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)) : prev
    )
    setRenameTarget(null)
    toast.success('Renamed')
  }, [toast])

  const handleDeleteSuccess = useCallback((deletedId: string) => {
    setItems((prev) => (prev ? prev.filter((item) => item.id !== deletedId) : prev))
    setDeleteTarget(null)
    toast.success('Deleted')
  }, [toast])

  const handleStartFreestyle = useCallback(async () => {
    if (startingFreestyle) return
    setStartingFreestyle(true)
    try {
      const completion = await startFreestyleWorkout()
      router.push(`/training/adhoc/${completion.id}`)
    } catch (err) {
      clientLogger.error('Failed to start freestyle workout', err)
      toast.error('Could not start freestyle workout', 'Please try again.')
      setStartingFreestyle(false)
    }
  }, [router, startingFreestyle, toast])

  if (items === null) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span className="ml-2 text-sm">Loading...</span>
      </div>
    )
  }

  if (loadError && items.length === 0) {
    return (
      <div className="border-2 border-error bg-error/10 p-4 text-sm text-error">
        {loadError}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="doom-corners border-2 border-border bg-card p-6 text-center">
        <p className="text-base text-foreground">
          You haven&apos;t saved any workouts yet.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Finish a freestyle workout and tap Save.
        </p>
        <button
          type="button"
          onClick={handleStartFreestyle}
          disabled={startingFreestyle}
          className="doom-focus-ring mt-6 inline-flex min-h-12 items-center justify-center bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {startingFreestyle ? 'Starting...' : 'Start a freestyle workout'}
        </button>
      </div>
    )
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <SavedWorkoutRow
              item={item}
              onOpen={() => setDetailTarget(item)}
              onRename={() => setRenameTarget(item)}
              onDelete={() => setDeleteTarget(item)}
            />
          </li>
        ))}
      </ul>

      {renameTarget && (
        <RenameSavedWorkoutDialog
          item={renameTarget}
          onOpenChange={(open) => {
            if (!open) setRenameTarget(null)
          }}
          onSuccess={handleRenameSuccess}
        />
      )}

      {deleteTarget && (
        <DeleteSavedWorkoutDialog
          item={deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
          onSuccess={() => handleDeleteSuccess(deleteTarget.id)}
        />
      )}

      {detailTarget && (
        <SavedWorkoutDetailDialog
          item={detailTarget}
          onOpenChange={(open) => {
            if (!open) setDetailTarget(null)
          }}
        />
      )}
    </>
  )
}
