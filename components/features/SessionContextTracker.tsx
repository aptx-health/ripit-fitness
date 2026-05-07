'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

function detectPlatform(): string {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

/**
 * Fires a `session_context` event once per page load with
 * standalone mode and platform info for PWA install tracking.
 */
export function SessionContextTracker() {
  useEffect(() => {
    trackEvent('session_context', {
      standalone: isStandalone(),
      platform: detectPlatform(),
    })
  }, [])

  return null
}
