'use client'

import { ChevronDown, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { Trainee } from '@/components/coaching/SendToTrainee'
import { useToast } from '@/components/ToastProvider'
import { startFreestyleWorkout } from '@/lib/api/adhoc-workout'
import { clientLogger } from '@/lib/client-logger'
import { groupSavedWorkouts } from '@/lib/saved-workouts/groups'
import ArchivedWorkoutRow from './ArchivedWorkoutRow'
import DeleteSavedWorkoutDialog from './DeleteSavedWorkoutDialog'
import GroupBox from './GroupBox'
import RenameSavedWorkoutDialog from './RenameSavedWorkoutDialog'
import SavedWorkoutDetailDialog from './SavedWorkoutDetailDialog'
import SavedWorkoutRow, { type SavedWorkoutListItem } from './SavedWorkoutRow'

type ArchiveState = Pick<SavedWorkoutListItem, 'archivedAt' | 'pinnedAt' | 'dismissedAt'>
const stateOf = (item: SavedWorkoutListItem): ArchiveState => ({
  archivedAt: item.archivedAt ?? null,
  pinnedAt: item.pinnedAt ?? null,
  dismissedAt: item.dismissedAt ?? null,
})

/** The Show archived fold header. */
const FOLD_BUTTON =
  'doom-focus-ring flex min-h-12 w-full items-center gap-2 px-1 text-left text-sm font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted'

/**
 * The saved workouts, inside the Library's Workouts folder box (the box itself
 * is the caller's): New, Pinned, Recent and a closed Older, each its own box
 * with a coloured header tab and count (GroupBox), and last a closed "Show
 * archived (n)". `onCountChange` reports the number of
 * unarchived workouts after each change, for the tab's count chip. A row
 * opens into a panel of its actions, one at a time; with `trainees` (the
 * Library page's, coaching slice 2) each panel also has Send.
 */
export default function SavedWorkoutsList({
  onCountChange,
  trainees = [],
}: { onCountChange?: (count: number) => void; trainees?: Trainee[] } = {}) {
  const toast = useToast()
  const router = useRouter()

  const [items, setItems] = useState<SavedWorkoutListItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<SavedWorkoutListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SavedWorkoutListItem | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [startingFreestyle, setStartingFreestyle] = useState(false)
  const [olderOpen, setOlderOpen] = useState(false)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [startingId, setStartingId] = useState<string | null>(null)
  const olderListId = useId()
  const archivedListId = useId()

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

  const count = items?.filter((item) => !item.archivedAt).length
  useEffect(() => {
    if (count !== undefined && !loadError) onCountChange?.(count)
  }, [count, loadError, onCountChange])

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

  // Optimistic: flip the row now, take pinnedAt from the response, and put
  // the old value back if the request fails.
  // Rows with a pin PATCH in flight; taps on them are ignored until it settles.
  const pinPending = useRef(new Set<string>())

  const handleTogglePin = useCallback(
    async (item: SavedWorkoutListItem) => {
      if (pinPending.current.has(item.id)) return
      pinPending.current.add(item.id)
      const setPinnedAt = (pinnedAt: string | null) =>
        setItems((prev) => (prev ? prev.map((x) => (x.id === item.id ? { ...x, pinnedAt } : x)) : prev))
      const before = item.pinnedAt ?? null
      const pinned = !before
      setPinnedAt(pinned ? new Date().toISOString() : null)
      try {
        const res = await fetch(`/api/workouts/saved/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pinned }),
        })
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const data = (await res.json()) as { saved: { pinnedAt: string | null } }
        setPinnedAt(data.saved.pinnedAt)
      } catch (err) {
        clientLogger.error('Failed to update pin', err)
        setPinnedAt(before)
        toast.error(pinned ? 'Could not pin workout' : 'Could not unpin workout', 'Please try again.')
      } finally {
        pinPending.current.delete(item.id)
      }
    },
    [toast]
  )

  const patchRow = useCallback((id: string, fields: Partial<SavedWorkoutListItem>) => {
    setItems((prev) => (prev ? prev.map((x) => (x.id === id ? { ...x, ...fields } : x)) : prev))
  }, [])

  // Archive, Dismiss, Undo and Restore all PATCH { archived }. Like the pin,
  // the row moves now, takes its fields from the response, and moves back if
  // the request fails. Shares pinPending, so one change per row at a time.
  const sendArchive = useCallback(
    async (item: SavedWorkoutListItem, body: object, optimistic: ArchiveState, failure: string) => {
      if (pinPending.current.has(item.id)) return null
      pinPending.current.add(item.id)
      const before = stateOf(item)
      patchRow(item.id, optimistic)
      try {
        const res = await fetch(`/api/workouts/saved/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const data = (await res.json()) as {
          saved: ArchiveState
          previous?: { pinnedAt: string | null; dismissedAt: string | null }
        }
        patchRow(item.id, stateOf({ ...item, ...data.saved }))
        return data
      } catch (err) {
        clientLogger.error('Failed to change archive state', err)
        patchRow(item.id, before)
        toast.error(failure, 'Please try again.')
        return null
      } finally {
        pinPending.current.delete(item.id)
      }
    },
    [patchRow, toast]
  )

  const handleArchive = useCallback(
    async (item: SavedWorkoutListItem, dismissed = false) => {
      // The row leaves for Show archived, so its panel closes (and stays closed after Undo).
      setExpandedId(null)
      const now = new Date().toISOString()
      const data = await sendArchive(
        item,
        { archived: true, ...(dismissed && { dismissed: true }) },
        { archivedAt: now, pinnedAt: null, dismissedAt: dismissed ? now : (item.dismissedAt ?? null) },
        dismissed ? 'Could not dismiss workout' : 'Could not archive workout'
      )
      if (!data?.previous) return
      const previous = data.previous
      const archived = { ...item, archivedAt: now, pinnedAt: null }
      toast.success(dismissed ? `Dismissed ${item.name}` : `Archived ${item.name}`, undefined, {
        label: 'Undo',
        onClick: () => {
          sendArchive(archived, { archived: false, undo: previous }, { archivedAt: null, ...previous }, 'Could not undo')
        },
      })
    },
    [sendArchive, toast]
  )

  // Restore: back by its date, never pinned and never New again.
  const handleRestore = useCallback(
    (item: SavedWorkoutListItem) =>
      sendArchive(
        item,
        { archived: false },
        { archivedAt: null, pinnedAt: null, dismissedAt: item.dismissedAt ?? new Date().toISOString() },
        'Could not restore workout'
      ),
    [sendArchive]
  )

  // Start from a row's panel, as the detail dialog starts one.
  const handleStart = useCallback(
    async (item: SavedWorkoutListItem) => {
      if (startingId) return
      setStartingId(item.id)
      try {
        const res = await fetch(`/api/workouts/saved/${item.id}/start`, { method: 'POST' })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error || 'Could not start workout')
        }
        const data = (await res.json()) as { completionId?: string }
        if (!data.completionId) throw new Error('No completion returned')
        router.push(`/training/adhoc/${data.completionId}`)
      } catch (err) {
        clientLogger.error('Failed to start saved workout', err)
        toast.error('Could not start workout', 'Please try again.')
        setStartingId(null)
      }
    },
    [router, startingId, toast]
  )

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
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span className="ml-2 text-sm">Loading...</span>
      </div>
    )
  }

  if (loadError && items.length === 0) {
    return (
      <p role="alert" className="px-4 py-5 text-sm text-error">
        {loadError}
      </p>
    )
  }

  if (items.length === 0) {
    return (
      // Training's EmptyLine, plus the way to make a first one.
      <div className="px-4 py-5">
        <p className="text-sm text-muted-foreground">
          You haven&apos;t saved any workouts yet. Finish a freestyle workout and tap Save.
        </p>
        <button
          type="button"
          onClick={handleStartFreestyle}
          disabled={startingFreestyle}
          className="doom-focus-ring mt-4 inline-flex min-h-12 items-center justify-center gap-1.5 border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wider text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {startingFreestyle ? 'Starting...' : 'Start a freestyle workout'}
        </button>
      </div>
    )
  }

  // The live row, so a pin toggled in the dialog shows in both places.
  const detailItem = items.find((item) => item.id === detailId) ?? null

  const groups = groupSavedWorkouts(items)
  const rows = (group: SavedWorkoutListItem[], id?: string, isNew = false) => (
    <ul id={id} className="divide-y divide-border">
      {group.map((item) => (
        <li key={item.id}>
          <SavedWorkoutRow
            item={item}
            isNew={isNew}
            expanded={expandedId === item.id}
            starting={startingId === item.id}
            trainees={trainees}
            onToggle={() => setExpandedId((open) => (open === item.id ? null : item.id))}
            onOpen={() => setDetailId(item.id)}
            onStart={() => handleStart(item)}
            onTogglePin={() => handleTogglePin(item)}
            onRename={() => setRenameTarget(item)}
            onArchive={() => handleArchive(item)}
            onDismiss={() => handleArchive(item, true)}
            onDelete={() => setDeleteTarget(item)}
          />
        </li>
      ))}
    </ul>
  )
  const liveCount = items.length - groups.archived.length

  return (
    <>
      {/* Boxes with space between them, not one shared grid (work 154). */}
      <div className="space-y-4 px-3 pt-1 pb-3">
        {liveCount === 0 && (
          <p className="px-1 py-2 text-sm text-muted-foreground">All your saved workouts are archived.</p>
        )}
        {groups.new.length > 0 && (
          <GroupBox label="New" tone="new" count={groups.new.length}>
            {rows(groups.new, undefined, true)}
          </GroupBox>
        )}
        {groups.pinned.length > 0 && (
          <GroupBox label="Pinned" tone="pinned" count={groups.pinned.length}>
            {rows(groups.pinned)}
          </GroupBox>
        )}
        {groups.recent.length > 0 && (
          <GroupBox label="Recent" tone="recent" count={groups.recent.length}>
            {rows(groups.recent)}
          </GroupBox>
        )}
        {groups.older.length > 0 && (
          <GroupBox
            label="Older"
            tone="older"
            count={groups.older.length}
            fold={{ open: olderOpen, onToggle: () => setOlderOpen((open) => !open), controls: olderListId }}
          >
            {olderOpen && rows(groups.older, olderListId)}
          </GroupBox>
        )}
        {groups.archived.length > 0 && (
          <section aria-label="Archived">
            <button
              type="button"
              aria-expanded={archivedOpen}
              aria-controls={archivedListId}
              onClick={() => setArchivedOpen((open) => !open)}
              className={FOLD_BUTTON}
            >
              <span className="flex-1">Show archived ({groups.archived.length})</span>
              <ChevronDown
                size={18}
                aria-hidden="true"
                className={`transition-transform ${archivedOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {archivedOpen && (
              <ul id={archivedListId} className="divide-y divide-border border-2 border-border bg-card">
                {groups.archived.map((item) => (
                  <li key={item.id}>
                    <ArchivedWorkoutRow
                      item={item}
                      onOpen={() => setDetailId(item.id)}
                      onRestore={() => handleRestore(item)}
                      onDelete={() => setDeleteTarget(item)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

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

      {detailItem && (
        <SavedWorkoutDetailDialog
          item={detailItem}
          onTogglePin={() => handleTogglePin(detailItem)}
          onOpenChange={(open) => {
            if (!open) setDetailId(null)
          }}
        />
      )}
    </>
  )
}
