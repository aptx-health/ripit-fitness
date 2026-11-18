'use client'

import { type Dispatch, type SetStateAction, useCallback } from 'react'
import type { useToast } from '@/components/ToastProvider'
import { clientLogger } from '@/lib/client-logger'
import { pluralize } from '@/lib/format/pluralize'
import { distinctTags, MAX_TAGS_PER_WORKOUT, normaliseTag, STARTER_TAGS } from '@/lib/saved-workouts/tags'
import type { SavedWorkoutListItem } from './SavedWorkoutRow'

type Previous = Record<string, { pinnedAt: string | null; dismissedAt: string | null }>

async function postBulk<T>(body: object): Promise<T> {
  const res = await fetch('/api/workouts/saved/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

/**
 * Select mode's Archive (with Undo), Tag and Delete, through
 * POST /api/workouts/saved/bulk. Delete and Undo change the rows now and
 * reload the list if the request fails; Archive and Tag change the rows the
 * route changed.
 */
export function useBulkActions(
  items: SavedWorkoutListItem[] | null,
  setItems: Dispatch<SetStateAction<SavedWorkoutListItem[] | null>>,
  reload: () => Promise<void>,
  toast: ReturnType<typeof useToast>
) {
  const patch = useCallback(
    (fields: (item: SavedWorkoutListItem) => Partial<SavedWorkoutListItem> | null) =>
      setItems((prev) => prev?.map((x) => ({ ...x, ...fields(x) })) ?? prev),
    [setItems]
  )

  const undo = useCallback(
    async (previous: Previous) => {
      patch((x) => (previous[x.id] ? { archivedAt: null, ...previous[x.id] } : null))
      try {
        await postBulk({ action: 'undoArchive', previous })
      } catch (err) {
        clientLogger.error('Failed to undo bulk archive', err)
        toast.error('Could not undo', 'Please try again.')
        await reload()
      }
    },
    [patch, reload, toast]
  )

  const archive = useCallback(
    async (selected: SavedWorkoutListItem[]) => {
      try {
        const data = await postBulk<{ ids: string[]; previous: Previous }>({
          action: 'archive',
          ids: selected.map((x) => x.id),
        })
        // The rows leave once the archive is stored, so Undo always has something to undo.
        const archived = new Set(data.ids)
        const now = new Date().toISOString()
        patch((x) => (archived.has(x.id) ? { archivedAt: now, pinnedAt: null } : null))
        toast.success(`Archived ${pluralize(data.ids.length, 'workout')}`, undefined, {
          label: 'Undo',
          onClick: () => {
            undo(data.previous)
          },
        })
      } catch (err) {
        clientLogger.error('Failed to archive in bulk', err)
        toast.error('Could not archive workouts', 'Please try again.')
      }
    },
    [patch, toast, undo]
  )

  const tag = useCallback(
    async (selected: SavedWorkoutListItem[], raw: string) => {
      // The spelling the route will store, as slice 2 matches it.
      const name = normaliseTag(raw, [...distinctTags(items ?? []), ...STARTER_TAGS])
      if (!name) return
      try {
        const data = await postBulk<{ ids: string[]; skipped: string[] }>({
          action: 'tag',
          ids: selected.map((x) => x.id),
          tag: raw,
        })
        const tagged = new Set(data.ids)
        patch((x) => (tagged.has(x.id) ? { tags: [...(x.tags ?? []), name] } : null))
        toast.success(
          `Added ${name} to ${pluralize(data.ids.length, 'workout')}`,
          data.skipped.length ? `${data.skipped.length} skipped (already at ${MAX_TAGS_PER_WORKOUT} tags)` : undefined
        )
      } catch (err) {
        clientLogger.error('Failed to tag in bulk', err)
        toast.error('Could not tag workouts', err instanceof Error ? err.message : 'Please try again.')
      }
    },
    [items, patch, toast]
  )

  const remove = useCallback(
    async (selected: SavedWorkoutListItem[]) => {
      const ids = new Set(selected.map((x) => x.id))
      setItems((prev) => prev?.filter((x) => !ids.has(x.id)) ?? prev)
      try {
        const data = await postBulk<{ ids: string[] }>({ action: 'delete', ids: [...ids] })
        toast.success(`Deleted ${pluralize(data.ids.length, 'workout')}`)
      } catch (err) {
        clientLogger.error('Failed to delete in bulk', err)
        toast.error('Could not delete workouts', 'Please try again.')
        await reload()
      }
    },
    [reload, setItems, toast]
  )

  return { archive, tag, remove }
}
