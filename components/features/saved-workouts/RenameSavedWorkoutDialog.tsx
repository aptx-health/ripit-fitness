'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import type { SavedWorkoutListItem } from './SavedWorkoutRow'

const NAME_MAX_LENGTH = 100

type Props = {
  item: SavedWorkoutListItem
  onOpenChange: (open: boolean) => void
  onSuccess: (updated: SavedWorkoutListItem) => void
}

export default function RenameSavedWorkoutDialog({ item, onOpenChange, onSuccess }: Props) {
  const [name, setName] = useState(item.name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(item.name)
    setError(null)
  }, [item.name])

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && trimmed.length <= NAME_MAX_LENGTH && trimmed !== item.name

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/workouts/saved/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || 'Failed to rename')
      }
      const data = (await res.json()) as { saved: SavedWorkoutListItem }
      onSuccess(data.saved)
    } catch (err) {
      clientLogger.error('Failed to rename saved workout', err)
      setError(err instanceof Error ? err.message : 'Failed to rename')
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="backdrop-blur-md bg-black/40 dark:bg-black/60"
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
        />
        <Dialog.Content
          className="doom-corners w-[calc(100vw-2rem)] max-w-md border-2 border-border bg-card p-6 shadow-xl"
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 51,
          }}
        >
          <Dialog.Title className="mb-4 text-xl font-bold uppercase tracking-wider text-foreground">
            Rename workout
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Update the name of this saved workout.
          </Dialog.Description>

          <form onSubmit={handleSubmit}>
            <label htmlFor="saved-workout-name" className="mb-2 block text-sm font-medium text-foreground">
              Name
            </label>
            <input
              id="saved-workout-name"
              type="text"
              value={name}
              maxLength={NAME_MAX_LENGTH}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="doom-focus-ring w-full border-2 border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{trimmed.length === 0 ? 'Name is required' : ' '}</span>
              <span>{trimmed.length}/{NAME_MAX_LENGTH}</span>
            </div>

            {error && (
              <div className="mt-3 border-2 border-error bg-error/10 p-3 text-sm text-error">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={saving}
                  className="doom-focus-ring min-h-12 border-2 border-border px-4 py-2 text-sm font-semibold uppercase tracking-wider text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={!canSave || saving}
                className="doom-focus-ring min-h-12 bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
