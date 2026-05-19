'use client'

import { useCallback, useState } from 'react'
import type { UserSettings } from '@/hooks/useUserSettings'

const DAYS_BEFORE_REPROMPT = 14
const MAX_SHOWN_COUNT = 2

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  // Dev override: ?debugPwa=ios or ?debugPwa=android bypasses mobile check
  if (process.env.NODE_ENV === 'development') {
    const debugParam = new URLSearchParams(window.location.search).get('debugPwa')
    if (debugParam === 'ios' || debugParam === 'android') return true
  }
  return /iPad|iPhone|iPod|Android/.test(navigator.userAgent)
}

/**
 * Determines if the PWA install prompt should be shown.
 *
 * Trigger conditions:
 * 1. Post first workout: `triggerAfterWorkout` called with historyCount === 1
 * 2. Training page mount on second+ session: `triggerOnPageLoad` called
 *
 * Suppression:
 * - Already installed as PWA (standalone mode)
 * - Not a mobile device
 * - Shown 2 times already and last dismissal was < 14 days ago
 * - After 2 shows: one final re-prompt after 14 days, then permanent suppress
 */
export function usePwaPrompt(
  settings: UserSettings | null,
  updateSettings: (s: Partial<UserSettings>) => Promise<void>,
) {
  const [showPrompt, setShowPrompt] = useState(false)

  const canShow = useCallback((): boolean => {
    if (!settings) return false
    if (isStandalone()) return false
    if (!isMobileDevice()) return false

    const { pwaPromptShownCount, pwaPromptDismissedAt } = settings

    // Never shown before — eligible
    if (pwaPromptShownCount === 0) return true

    // Shown once, dismissed — eligible for second show immediately (different trigger)
    if (pwaPromptShownCount === 1 && !pwaPromptDismissedAt) return true
    if (pwaPromptShownCount === 1) return true

    // Shown twice — only re-show if 14 days have passed since last dismissal
    if (pwaPromptShownCount >= MAX_SHOWN_COUNT) {
      if (!pwaPromptDismissedAt) return false
      const dismissedAt = new Date(pwaPromptDismissedAt)
      const daysSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24)
      return daysSince >= DAYS_BEFORE_REPROMPT && pwaPromptShownCount === MAX_SHOWN_COUNT
    }

    return true
  }, [settings])

  // Trigger after first workout completion
  const triggerAfterWorkout = useCallback((historyCount: number) => {
    if (historyCount !== 1) return // Only after FIRST workout
    if (!canShow()) return
    setShowPrompt(true)
  }, [canShow])

  // Trigger on training page load (second session check)
  const triggerOnPageLoad = useCallback((historyCount: number) => {
    if (historyCount < 1) return // Must have at least 1 completed workout
    if (!canShow()) return
    // Only trigger on page load if they've been shown once already (post-workout was first)
    // OR if they somehow missed the post-workout prompt
    if (settings && settings.pwaPromptShownCount >= 1) {
      setShowPrompt(true)
    }
  }, [canShow, settings])

  const handleClose = useCallback(async () => {
    setShowPrompt(false)
    if (!settings) return
    try {
      await updateSettings({
        pwaPromptShownCount: settings.pwaPromptShownCount + 1,
        pwaPromptDismissedAt: new Date().toISOString(),
      })
    } catch {
      // Non-critical — prompt will just re-show next time
    }
  }, [settings, updateSettings])

  const handleInstalled = useCallback(async () => {
    setShowPrompt(false)
    if (!settings) return
    try {
      // Set a high count so it never shows again
      await updateSettings({
        pwaPromptShownCount: 99,
      })
    } catch {
      // Non-critical
    }
  }, [settings, updateSettings])

  return {
    showPrompt,
    triggerAfterWorkout,
    triggerOnPageLoad,
    handleClose,
    handleInstalled,
  }
}
