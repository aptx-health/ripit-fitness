'use client'

import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Plus,
  Save,
  X,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import {
  type ExerciseDefinition,
  ExerciseSearchInterface,
} from '@/components/exercise-selection/ExerciseSearchInterface'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/radix/dialog'
import { clientLogger } from '@/lib/client-logger'
import {
  ANCHOR_PATTERN_DISPLAY_NAMES,
  ANCHOR_PATTERNS,
  type AnchorPattern,
  MAX_ANCHOR_EXERCISES,
  type TargetMovements,
} from '@/lib/exercises/anchor-patterns'

type Props = {
  initialTargetMovements: TargetMovements
  initialExercises: ExerciseDefinition[]
}

export default function TargetMovementsEditor({
  initialTargetMovements,
  initialExercises,
}: Props) {
  const router = useRouter()
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {}
    for (const pattern of ANCHOR_PATTERNS) {
      initial[pattern] = initialTargetMovements[pattern] ?? []
    }
    return initial
  })
  const [exerciseById, setExerciseById] = useState<Map<string, ExerciseDefinition>>(
    () => new Map(initialExercises.map((e) => [e.id, e]))
  )
  const [openPattern, setOpenPattern] = useState<AnchorPattern | null>(null)
  const [expanded, setExpanded] = useState<Set<AnchorPattern>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const totalSelected = useMemo(
    () => ANCHOR_PATTERNS.reduce((sum, p) => sum + (selections[p]?.length ?? 0), 0),
    [selections]
  )

  const toggleExpanded = useCallback((pattern: AnchorPattern) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(pattern)) next.delete(pattern)
      else next.add(pattern)
      return next
    })
  }, [])

  const removeExercise = useCallback((pattern: AnchorPattern, id: string) => {
    setSaved(false)
    setSelections((prev) => ({
      ...prev,
      [pattern]: (prev[pattern] ?? []).filter((x) => x !== id),
    }))
  }, [])

  const commitPattern = useCallback(
    (pattern: AnchorPattern, defs: ExerciseDefinition[]) => {
      setSaved(false)
      setExerciseById((prev) => {
        const next = new Map(prev)
        for (const def of defs) next.set(def.id, def)
        return next
      })
      setSelections((prev) => ({ ...prev, [pattern]: defs.map((d) => d.id) }))
      setOpenPattern(null)
    },
    []
  )

  const save = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    setSaved(false)
    try {
      // Only send configured patterns; empty ones are simply omitted.
      const targetMovements: Record<string, string[]> = {}
      for (const pattern of ANCHOR_PATTERNS) {
        const ids = selections[pattern] ?? []
        if (ids.length > 0) targetMovements[pattern] = ids
      }
      const response = await fetch('/api/settings/target-movements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetMovements }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save target movements')
      }
      setSaved(true)
      window.setTimeout(() => {
        router.push('/settings')
      }, 650)
    } catch (err) {
      clientLogger.error('Failed to save target movements:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }, [router, selections])

  const openDefs = openPattern
    ? (selections[openPattern] ?? [])
        .map((id) => exerciseById.get(id))
        .filter((d): d is ExerciseDefinition => Boolean(d))
    : []

  return (
    <main className="bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <Link
              href="/settings"
              className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground doom-focus-ring hover:text-foreground"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Settings
            </Link>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">
              Target Movements
            </h1>
          </div>
          <Button type="button" variant="primary" doom loading={isSaving} onClick={save}>
            <Save size={16} aria-hidden="true" className="mr-1.5" />
            Save
          </Button>
        </div>

        <p className="mb-5 max-w-2xl text-sm text-muted-foreground">
          Pin the big compound movements you want to keep hitting. Each pattern is
          optional — add up to {MAX_ANCHOR_EXERCISES} preferred exercises. The
          workout picker's{' '}
          <span className="font-bold text-foreground">Anchors</span> view then
          lists them by how long it's been since you last logged one.
        </p>

        {(error || saved) && (
          <div
            role={error ? 'alert' : 'status'}
            className={`mb-5 flex items-start gap-3 border-2 p-3 text-sm font-semibold ${
              error
                ? 'border-error bg-error/10 text-error'
                : 'border-success bg-success/10 text-foreground'
            }`}
          >
            {error ? (
              <XCircle size={18} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
            ) : (
              <CheckCircle2
                size={18}
                aria-hidden="true"
                className="mt-0.5 flex-shrink-0 text-success"
              />
            )}
            <span>{error || 'Target movements saved. Returning to settings.'}</span>
          </div>
        )}

        <div className="space-y-3">
          {ANCHOR_PATTERNS.map((pattern) => {
            const ids = selections[pattern] ?? []
            const isOpen = expanded.has(pattern)
            return (
              <section
                key={pattern}
                className="border-2 border-border bg-card doom-corners"
              >
                <button
                  type="button"
                  onClick={() => toggleExpanded(pattern)}
                  aria-expanded={isOpen}
                  className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left doom-focus-ring"
                >
                  <span className="flex items-center gap-3">
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className={`flex-shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                    <span className="text-sm font-bold uppercase tracking-wider text-foreground">
                      {ANCHOR_PATTERN_DISPLAY_NAMES[pattern]}
                    </span>
                  </span>
                  <span
                    className={`border-2 px-2.5 py-1 text-xs font-bold tabular-nums uppercase tracking-wider ${
                      ids.length > 0
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted text-muted-foreground'
                    }`}
                  >
                    {ids.length > 0 ? `${ids.length} / ${MAX_ANCHOR_EXERCISES}` : 'Off'}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-border px-4 py-3">
                    {ids.length > 0 ? (
                      <ul className="mb-3 flex flex-wrap gap-2">
                        {ids.map((id) => {
                          const def = exerciseById.get(id)
                          return (
                            <li
                              key={id}
                              className="inline-flex items-center gap-1.5 border-2 border-border bg-muted/40 py-1 pl-3 pr-1.5 text-sm font-bold text-foreground"
                            >
                              <span className="uppercase tracking-wide">
                                {def?.name ?? 'Unknown exercise'}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeExercise(pattern, id)}
                                aria-label={`Remove ${def?.name ?? 'exercise'}`}
                                className="inline-flex h-6 w-6 items-center justify-center border border-border bg-card text-muted-foreground doom-focus-ring hover:border-error hover:text-error"
                              >
                                <X size={14} strokeWidth={2.5} />
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="mb-3 text-sm text-muted-foreground">
                        No exercises pinned yet.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setOpenPattern(pattern)}
                      className="inline-flex min-h-11 items-center gap-2 border-2 border-border bg-muted px-3 py-2 text-sm font-bold uppercase tracking-wider text-foreground doom-focus-ring hover:border-primary"
                    >
                      <Plus size={16} aria-hidden="true" />
                      {ids.length > 0 ? 'Edit exercises' : 'Add exercises'}
                    </button>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <p className="mt-5 text-sm text-muted-foreground">
          {totalSelected > 0
            ? `${totalSelected} exercise${totalSelected === 1 ? '' : 's'} pinned across ${
                ANCHOR_PATTERNS.filter((p) => (selections[p]?.length ?? 0) > 0).length
              } movement${
                ANCHOR_PATTERNS.filter((p) => (selections[p]?.length ?? 0) > 0)
                  .length === 1
                  ? ''
                  : 's'
              }.`
            : 'No movements configured yet — the Anchors view stays hidden until you pin at least one.'}
        </p>
      </div>

      {openPattern && (
        <PatternPickerModal
          pattern={openPattern}
          initialSelected={openDefs}
          onClose={() => setOpenPattern(null)}
          onSave={(defs) => commitPattern(openPattern, defs)}
        />
      )}
    </main>
  )
}

function PatternPickerModal({
  pattern,
  initialSelected,
  onClose,
  onSave,
}: {
  pattern: AnchorPattern
  initialSelected: ExerciseDefinition[]
  onClose: () => void
  onSave: (defs: ExerciseDefinition[]) => void
}) {
  const [selectedDefs, setSelectedDefs] =
    useState<ExerciseDefinition[]>(initialSelected)
  const selectedIds = useMemo(
    () => new Set(selectedDefs.map((d) => d.id)),
    [selectedDefs]
  )
  const atCap = selectedDefs.length >= MAX_ANCHOR_EXERCISES

  const handleToggle = useCallback((def: ExerciseDefinition) => {
    setSelectedDefs((prev) => {
      if (prev.some((d) => d.id === def.id)) {
        return prev.filter((d) => d.id !== def.id)
      }
      // Enforce the cap — silently ignore adds past the limit; the banner
      // tells the user to remove one first.
      if (prev.length >= MAX_ANCHOR_EXERCISES) return prev
      return [...prev, def]
    })
  }, [])

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
        className="w-full h-full sm:w-[90vw] sm:max-w-3xl sm:h-auto sm:max-h-[85vh] rounded-none sm:rounded-none border border-border bg-card"
      >
        <DialogHeader className="border-b border-border bg-primary py-2">
          <DialogTitle className="text-lg font-bold text-primary-foreground tracking-wider uppercase">
            {ANCHOR_PATTERN_DISPLAY_NAMES[pattern]} exercises
          </DialogTitle>
          <DialogDescription className="text-base font-bold text-primary-foreground/70 uppercase tracking-wide">
            Pick up to {MAX_ANCHOR_EXERCISES} preferred lifts
          </DialogDescription>
        </DialogHeader>

        {atCap && (
          <div className="border-b-2 border-accent bg-accent/10 px-4 py-2 text-sm font-bold uppercase tracking-wide text-accent">
            Max {MAX_ANCHOR_EXERCISES} reached — remove one to swap.
          </div>
        )}

        <DialogBody className="flex-1 min-h-0">
          <ExerciseSearchInterface
            onExerciseSelect={handleToggle}
            selectedIds={selectedIds}
            preloadExercises
          />
        </DialogBody>

        <DialogFooter className="border-t border-border bg-card py-2">
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={onClose} doom>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => onSave(selectedDefs)} doom>
              {selectedDefs.length === 0
                ? 'Save'
                : `Save (${selectedDefs.length})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
