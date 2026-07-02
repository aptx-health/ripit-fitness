'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import type { WizardAnswers, WizardStepId } from './types'
import { STEP_FIELDS, WIZARD_STEPS } from './types'

const STORAGE_VERSION = 'v1'

type DraftCache = {
  stepIndex: number
  answers: WizardAnswers
  updatedAt: number
}

function storageKey(userId: string): string {
  return `goals-wizard:${STORAGE_VERSION}:${userId}`
}

function readCache(userId: string): DraftCache | null {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as DraftCache
  } catch {
    return null
  }
}

function writeCache(userId: string, cache: DraftCache): void {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(cache))
  } catch (error) {
    clientLogger.error('[GoalsWizard] Failed to write draft cache', error)
  }
}

function clearCache(userId: string): void {
  try {
    window.localStorage.removeItem(storageKey(userId))
  } catch {
    // best-effort
  }
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Resume-aware state for the Goals Wizard.
 *
 * - `initialAnswers` (from the server) is the source of truth for field values.
 * - localStorage holds the resume *position* (which step) plus a fast-path
 *   mirror of the answers, so a reload lands the user back where they were.
 * - Each step commits its own slice to the DB via PATCH (per-step write), then
 *   mirrors the merged answers + step position to localStorage.
 */
export function useGoalsWizardDraft(
  userId: string,
  initialAnswers: WizardAnswers
) {
  const [answers, setAnswers] = useState<WizardAnswers>(initialAnswers)
  const [stepIndex, setStepIndex] = useState(0)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [hydrated, setHydrated] = useState(false)
  const answersRef = useRef(answers)

  // Keep a live ref to the latest answers so `saveStep` can read them without
  // being recreated on every keystroke. Synced post-commit (before any handler
  // can fire), never mutated during render.
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  // Hydrate resume position from localStorage on mount (client-only).
  useEffect(() => {
    const cache = readCache(userId)
    if (cache) {
      const maxIndex = WIZARD_STEPS.length - 1
      // Mount-time hydration from localStorage must run in an effect (window is
      // unavailable during SSR); the wizard renders a spinner until `hydrated`.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStepIndex(Math.min(Math.max(cache.stepIndex, 0), maxIndex))
      // Merge cached answers over server answers only for fields the server
      // returned empty/null — the DB is authoritative, but this covers the
      // rare window where a PATCH was mirrored locally but not yet persisted.
      setAnswers((prev) => ({ ...prev, ...cache.answers }))
    }
    setHydrated(true)
  }, [userId])

  const mirror = useCallback(
    (nextAnswers: WizardAnswers, nextStepIndex: number) => {
      writeCache(userId, {
        stepIndex: nextStepIndex,
        answers: nextAnswers,
        updatedAt: Date.now(),
      })
    },
    [userId]
  )

  /** Update local answers without persisting (per-field edits within a step). */
  const patchLocal = useCallback((partial: Partial<WizardAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...partial }))
  }, [])

  /** Persist a single step's slice to the DB, then mirror to localStorage. */
  const saveStep = useCallback(
    async (stepId: WizardStepId, nextStepIndex: number): Promise<boolean> => {
      const current = answersRef.current
      const fields = STEP_FIELDS[stepId]
      const payload: Partial<WizardAnswers> = {}
      for (const field of fields) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(payload as any)[field] = current[field]
      }

      setSaveState('saving')
      try {
        const res = await fetch('/api/profile/training', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          setSaveState('error')
          clientLogger.error(
            `[GoalsWizard] PATCH failed for step ${stepId}: ${res.status}`
          )
          return false
        }
        const data = await res.json()
        // Adopt the normalized values the server actually stored. Build the
        // merged snapshot explicitly (no side effects inside the state updater)
        // so the localStorage mirror runs synchronously here — before any
        // follow-up like clearDraft() on finish.
        const merged: WizardAnswers = { ...current }
        if (data.profile) {
          for (const field of fields) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(merged as any)[field] = data.profile[field]
          }
        }
        setAnswers(merged)
        mirror(merged, nextStepIndex)
        setSaveState('saved')
        return true
      } catch (error) {
        setSaveState('error')
        clientLogger.error('[GoalsWizard] Network error saving step', error)
        return false
      }
    },
    [mirror]
  )

  const goToStep = useCallback(
    (index: number) => {
      const clamped = Math.min(Math.max(index, 0), WIZARD_STEPS.length - 1)
      setStepIndex(clamped)
      mirror(answersRef.current, clamped)
    },
    [mirror]
  )

  /** Wizard finished — clear the resume cache so we don't re-resume. */
  const clearDraft = useCallback(() => {
    clearCache(userId)
  }, [userId])

  return {
    answers,
    stepIndex,
    saveState,
    hydrated,
    patchLocal,
    saveStep,
    goToStep,
    clearDraft,
  }
}
