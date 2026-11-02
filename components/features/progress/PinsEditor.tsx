'use client'

import { ArrowDown, ArrowUp, Plus, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/radix/dialog'
import { clientLogger } from '@/lib/client-logger'
import { MAX_PINS } from '@/lib/insights/pinned-lifts'

/**
 * "Edit tracked lifts": reorder, remove and add pinned lifts, then save the
 * whole list. Search uses the exercise picker's endpoint. Cancel drops the
 * edits; a failed save keeps the dialog open.
 */

interface Pin {
  id: string
  name: string
}

export const PIN_LIMIT_MESSAGE = `You can track up to ${MAX_PINS} lifts`
const SEARCH_DELAY_MS = 250
const ICON_BUTTON =
  'flex h-12 w-12 shrink-0 items-center justify-center text-foreground doom-focus-ring hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:hover:bg-transparent'

export default function PinsEditor({
  pins: initial,
  onSave,
  onClose,
}: {
  pins: Pin[]
  /** Saves the whole list in order; false when it failed. */
  onSave: (ids: string[]) => Promise<boolean>
  onClose: () => void
}) {
  const [pins, setPins] = useState(initial)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Pin[]>([])
  const [searchError, setSearchError] = useState(false)
  const [limitHit, setLimitHit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(() => {
    const text = query.trim()
    if (!text) {
      setResults([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ query: text, limit: '20' })
        const res = await fetch(`/api/exercises/search?${params}`, { signal: controller.signal })
        if (!res.ok) throw new Error(`Search failed (${res.status})`)
        const data = (await res.json()) as { exercises?: Pin[] }
        setResults((data.exercises ?? []).map(({ id, name }) => ({ id, name })))
        setSearchError(false)
      } catch (err) {
        if (controller.signal.aborted) return
        clientLogger.error('Error searching exercises for pins:', err)
        setSearchError(true)
      }
    }, SEARCH_DELAY_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const move = (index: number, by: -1 | 1) =>
    setPins((list) => {
      const next = [...list]
      ;[next[index], next[index + by]] = [next[index + by], next[index]]
      return next
    })
  const remove = (id: string) => {
    setLimitHit(false)
    setPins((list) => list.filter((p) => p.id !== id))
  }
  const add = (pin: Pin) => {
    if (pins.length >= MAX_PINS) setLimitHit(true)
    else setPins((list) => [...list, pin])
  }
  const save = async () => {
    setSaving(true)
    setSaveFailed(false)
    const ok = await onSave(pins.map((p) => p.id))
    setSaving(false)
    if (ok) onClose()
    else setSaveFailed(true)
  }

  const tracked = new Set(pins.map((p) => p.id))

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        showClose={false}
        fullScreenMobile={true}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-full h-full sm:w-[90vw] sm:max-w-lg sm:h-auto sm:max-h-[85vh] rounded-none sm:rounded-none border border-border bg-card"
      >
        {/* Not DialogHeader: its bg-primary would fight the folder's coach (accent) tone. */}
        <div className="flex-shrink-0 space-y-1 border-b border-border bg-accent px-4 py-2 text-center sm:px-6 sm:text-left">
          <DialogTitle className="text-lg font-bold uppercase tracking-wider text-accent-foreground">
            Edit tracked lifts
          </DialogTitle>
          <DialogDescription className="text-sm font-bold uppercase tracking-wide !text-accent-foreground">
            Up to {MAX_PINS} lifts, in your order
          </DialogDescription>
        </div>

        <DialogBody className="flex-1 min-h-0 space-y-4 overflow-y-auto">
          {pins.length === 0 && <p className="text-sm text-muted-foreground">No tracked lifts yet. Search to add one.</p>}
          <ol aria-label="Tracked lifts" className={pins.length > 0 ? 'divide-y divide-border border-2 border-border' : ''}>
            {pins.map((p, i) => (
              <li key={p.id} className="flex items-center gap-1 pl-3">
                <span className="min-w-0 flex-1 truncate font-bold text-foreground">{p.name}</span>
                <button
                  type="button"
                  aria-label={`Move ${p.name} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className={ICON_BUTTON}
                >
                  <ArrowUp size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${p.name} down`}
                  disabled={i === pins.length - 1}
                  onClick={() => move(i, 1)}
                  className={ICON_BUTTON}
                >
                  <ArrowDown size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => remove(p.id)}
                  className={`${ICON_BUTTON} text-error`}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>

          {limitHit && (
            <p role="status" className="text-sm font-bold text-error">
              {PIN_LIMIT_MESSAGE}
            </p>
          )}

          <div>
            {/* One focus ring: the box's border, not the theme's ring on the input inside it. */}
            <label className="flex min-h-12 items-center gap-2 border-2 border-border bg-background px-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
              <Search size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              <span className="sr-only">Search exercises</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search exercises"
                className="min-w-0 flex-1 bg-transparent py-2 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:!shadow-none focus-visible:!outline-none [&::-webkit-search-cancel-button]:hidden"
              />
            </label>
            {searchError && <p className="mt-2 text-sm text-error">{"Couldn't search. Try again."}</p>}
            {results.length > 0 && (
              <ul aria-label="Search results" className="mt-2 divide-y divide-border border-2 border-border">
                {results.map((r) => (
                  <li key={r.id} className="flex min-h-12 items-center gap-2 pl-3">
                    <span className="min-w-0 flex-1 truncate text-foreground">{r.name}</span>
                    {tracked.has(r.id) ? (
                      <span className="pr-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tracked</span>
                    ) : (
                      <button type="button" aria-label={`Add ${r.name}`} onClick={() => add(r)} className={ICON_BUTTON}>
                        <Plus size={20} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogBody>

        <DialogFooter className="border-t border-border bg-card py-2">
          <div className="flex w-full flex-col gap-2">
            {saveFailed && (
              <p role="alert" className="text-sm font-bold text-error">
                {"Couldn't save your tracked lifts. Try again."}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={onClose} disabled={saving} doom className="min-h-12">
                Cancel
              </Button>
              <Button variant="primary" onClick={save} disabled={saving} doom className="min-h-12">
                Save
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
