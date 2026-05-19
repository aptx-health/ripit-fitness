'use client'

import { MoreVertical, Plus, Share } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { BeforeInstallPromptEvent } from '@/hooks/useBeforeInstallPrompt'
import { trackEvent } from '@/lib/analytics'
import { clientLogger } from '@/lib/client-logger'

interface PwaInstallPromptProps {
  open: boolean
  onClose: () => void
  onInstalled?: () => void
  deferredPrompt: BeforeInstallPromptEvent | null
}

type Platform = 'ios' | 'android' | 'unsupported'

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unsupported'
  // Dev override: ?debugPwa=ios or ?debugPwa=android
  if (process.env.NODE_ENV === 'development') {
    const debugParam = new URLSearchParams(window.location.search).get('debugPwa')
    if (debugParam === 'ios' || debugParam === 'android') return debugParam
  }
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)) {
    return 'ios'
  }
  if (/Android/.test(ua)) {
    return 'android'
  }
  return 'unsupported'
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

export function PwaInstallPrompt({ open, onClose, onInstalled, deferredPrompt }: PwaInstallPromptProps) {
  const [platform] = useState<Platform>(detectPlatform)
  const [installing, setInstalling] = useState(false)

  // Track when shown
  useEffect(() => {
    if (open) {
      trackEvent('pwa_prompt_shown', { platform })
    }
  }, [open, platform])

  const handleAndroidInstall = useCallback(async () => {
    if (!deferredPrompt) {
      clientLogger.error('No deferred install prompt available')
      return
    }

    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      trackEvent('pwa_prompt_android_choice', { outcome })
      if (outcome === 'accepted') {
        onInstalled?.()
      }
    } catch (error) {
      clientLogger.error('Android install prompt error:', error)
    } finally {
      setInstalling(false)
      onClose()
    }
  }, [deferredPrompt, onClose, onInstalled])

  const handleDismiss = useCallback(() => {
    trackEvent('pwa_prompt_dismissed', { platform })
    onClose()
  }, [onClose, platform])

  if (!open) return null

  // Don't show if already installed
  if (isStandalone()) return null

  // Don't show on unsupported platforms (desktop browsers without install support)
  if (platform === 'unsupported' && !deferredPrompt) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-prompt-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md animate-in fade-in-0"
        onClick={handleDismiss}
      />

      {/* Bottom sheet */}
      <div className="relative w-full max-w-lg mx-auto animate-in slide-in-from-bottom-4 fade-in-0 duration-300 pb-[env(safe-area-inset-bottom)]">
        <div className="bg-card border border-border border-b-0 rounded-t-2xl overflow-hidden doom-noise">
          {/* Header with app icon */}
          <div className="flex items-center gap-4 px-6 pt-6 pb-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-primary shadow-lg shadow-primary/20 flex-shrink-0">
              <img
                src="/apple-touch-icon.png"
                alt="Ripit"
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 id="pwa-prompt-title" className="text-xl font-bold text-foreground font-heading uppercase tracking-wide">
                Add Ripit to Home Screen
              </h2>
              <p className="text-base text-muted-foreground mt-0.5">
                Opens right from your phone, just like any other app
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="px-6 pb-6">
            {platform === 'ios' ? (
              <IosInstructions />
            ) : platform === 'android' ? (
              <AndroidInstructions
                hasPrompt={!!deferredPrompt}
                installing={installing}
                onInstall={handleAndroidInstall}
              />
            ) : deferredPrompt ? (
              <AndroidInstructions
                hasPrompt={true}
                installing={installing}
                onInstall={handleAndroidInstall}
              />
            ) : null}
          </div>

          {/* Dismiss button */}
          <div className="px-6 pb-6">
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-3 text-base font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function IosInstructions() {
  return (
    <div className="space-y-4">
      {/* Step 1 */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
          <span className="text-base font-bold text-primary">1</span>
        </div>
        <p className="flex-1 text-base text-foreground">
          Tap the{' '}
          <span className="inline-flex items-center justify-center w-10 h-10 bg-white/90 rounded-lg border border-border/60 shadow-sm mx-1 align-middle">
            <Share size={20} className="text-stone-800" />
          </span>
          {' '}button in the toolbar below
        </p>
      </div>

      {/* Step 2 */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mt-1">
          <span className="text-base font-bold text-primary">2</span>
        </div>
        <div className="flex-1">
          <p className="text-base text-foreground">
            Scroll down and tap
          </p>
          <span className="inline-flex items-center justify-between w-full mt-1.5 px-3 py-2.5 bg-white/90 rounded-lg border border-border/60 shadow-sm">
            <span className="font-medium text-stone-800">Add to Home Screen</span>
            <span className="flex-shrink-0 w-6 h-6 rounded border border-stone-400 flex items-center justify-center">
              <Plus size={14} className="text-stone-600" />
            </span>
          </span>
        </div>
      </div>

      {/* Step 3 */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
          <span className="text-base font-bold text-primary">3</span>
        </div>
        <p className="flex-1 text-base text-foreground">
          Tap{' '}
          <span className="inline-flex items-center px-1.5 py-0.5 bg-muted/50 rounded border border-border font-medium">
            Add
          </span>
          {' '}in the top right corner
        </p>
      </div>

      {/* Visual hint arrow pointing down */}
      <div className="flex justify-center pt-2">
        <div className="animate-bounce text-primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  )
}

function AndroidInstructions({
  hasPrompt,
  installing,
  onInstall,
}: {
  hasPrompt: boolean
  installing: boolean
  onInstall: () => void
}) {
  if (hasPrompt) {
    return (
      <div className="space-y-4">
        <p className="text-base text-muted-foreground">
          Add Ripit to your home screen so you can find it and open it just like any other app.
        </p>
        <button
          type="button"
          onClick={onInstall}
          disabled={installing}
          className="w-full py-3.5 bg-primary text-primary-foreground font-bold text-base uppercase tracking-wider doom-button-3d disabled:opacity-50 transition-all"
        >
          {installing ? 'Installing...' : 'Install App'}
        </button>
      </div>
    )
  }

  // Fallback: manual instructions for Android browsers without beforeinstallprompt
  return (
    <div className="space-y-4">
      {/* Step 1 */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
          <span className="text-base font-bold text-primary">1</span>
        </div>
        <div className="flex-1 pt-1">
          <p className="text-base text-foreground">
            Tap the{' '}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted/50 rounded border border-border">
              <MoreVertical size={14} className="text-primary" />
              <span className="font-medium">menu</span>
            </span>
            {' '}button in the top right
          </p>
        </div>
      </div>

      {/* Step 2 */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
          <span className="text-base font-bold text-primary">2</span>
        </div>
        <div className="flex-1 pt-1">
          <p className="text-base text-foreground">
            Tap{' '}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted/50 rounded border border-border">
              <Plus size={14} className="text-primary" />
              <span className="font-medium">Add to Home screen</span>
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
