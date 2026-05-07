'use client'

import { useEffect, useRef, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Captures the `beforeinstallprompt` event globally so it isn't missed
 * if the PWA install prompt component hasn't mounted yet.
 * Should be called once, high in the component tree.
 */
export function useBeforeInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const ref = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      const event = e as BeforeInstallPromptEvent
      ref.current = event
      setDeferredPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  return { deferredPrompt, promptRef: ref }
}

export type { BeforeInstallPromptEvent }
