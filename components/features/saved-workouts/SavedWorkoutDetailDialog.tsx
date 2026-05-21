'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import { clientLogger } from '@/lib/client-logger'
import { pluralize } from '@/lib/format/pluralize'
import { formatSavedWorkoutDate } from '@/lib/format/savedWorkoutDate'
import type { SavedWorkoutData } from '@/types/saved-workout'
import type { SavedWorkoutListItem } from './SavedWorkoutRow'

type SavedWorkoutDetail = SavedWorkoutListItem & {
  workoutData: SavedWorkoutData
}

type Props = {
  item: SavedWorkoutListItem
  onOpenChange: (open: boolean) => void
}

function extractExerciseNames(workoutData: SavedWorkoutData): string[] {
  if (!Array.isArray(workoutData)) return []
  return workoutData
    .map((ex) => (typeof ex?.name === 'string' ? ex.name : null))
    .filter((n): n is string => !!n && n.length > 0)
}

export default function SavedWorkoutDetailDialog({ item, onOpenChange }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [detail, setDetail] = useState<SavedWorkoutDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/workouts/saved/${item.id}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const data = (await res.json()) as { saved: SavedWorkoutDetail }
        if (!cancelled) setDetail(data.saved)
      } catch (err) {
        clientLogger.error('Failed to fetch saved workout detail', err)
        if (!cancelled) setLoadError('Could not load workout details.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [item.id])

  const handleStart = async () => {
    if (starting) return
    setStarting(true)
    try {
      const res = await fetch(`/api/workouts/saved/${item.id}/start`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || 'Could not start workout')
      }
      const data = (await res.json()) as { completionId?: string }
      if (data.completionId) {
        router.push(`/training/adhoc/${data.completionId}`)
        return
      }
      throw new Error('No completion returned')
    } catch (err) {
      clientLogger.error('Failed to start saved workout', err)
      toast.error('Could not start workout', 'Please try again.')
      setStarting(false)
    }
  }

  const exerciseNames = detail ? extractExerciseNames(detail.workoutData) : []
  const dateLabel = item.lastUsedAt
    ? `Last done ${formatSavedWorkoutDate(item.lastUsedAt)}`
    : `Created ${formatSavedWorkoutDate(item.createdAt)}`

  return (
    <Dialog.Root open onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="backdrop-blur-md bg-black/40 dark:bg-black/60"
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
        />
        <Dialog.Content
          className="doom-corners flex w-[calc(100vw-2rem)] max-w-md flex-col border-2 border-border bg-card shadow-xl"
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 51,
            maxHeight: 'calc(100dvh - 4rem)',
          }}
        >
          <div className="flex items-start justify-between border-b-2 border-border p-6 pb-4">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate text-xl font-bold uppercase tracking-wider text-foreground">
                {item.name}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {pluralize(item.exerciseCount, 'exercise')} &middot; {dateLabel}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="doom-focus-ring -mr-2 -mt-2 flex min-h-12 min-w-12 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loadError ? (
              <div className="border-2 border-error bg-error/10 p-3 text-sm text-error">
                {loadError}
              </div>
            ) : detail === null ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span className="ml-2 text-sm">Loading...</span>
              </div>
            ) : (
              <>
                {detail.notes && (
                  <div className="mb-4 whitespace-pre-wrap rounded-none border-2 border-border bg-muted p-3 text-sm text-foreground">
                    {detail.notes}
                  </div>
                )}

                {exerciseNames.length > 0 ? (
                  <ol className="flex flex-col gap-1">
                    {exerciseNames.map((name, idx) => (
                      <li
                        key={`${name}-${idx}`}
                        className="flex items-center gap-3 border-b border-border py-2.5 text-base text-foreground last:border-b-0"
                      >
                        <span className="w-6 text-sm text-muted-foreground">{idx + 1}.</span>
                        <span className="flex-1">{name}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {pluralize(item.exerciseCount, 'exercise')} saved.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="border-t-2 border-border p-4">
            <button
              type="button"
              onClick={handleStart}
              disabled={starting || detail === null}
              className="doom-focus-ring flex min-h-12 w-full items-center justify-center bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary-hover active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.40)',
              }}
            >
              {starting ? 'Starting...' : 'Start this workout'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
