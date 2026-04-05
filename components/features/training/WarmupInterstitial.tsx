'use client'

import { X } from 'lucide-react'
import { useState } from 'react'
import { useUserSettings } from '@/hooks/useUserSettings'

interface WarmupInterstitialProps {
  open: boolean
  onContinue: () => void
  onCancel: () => void
  onDismissPermanently: () => void
}

export function WarmupInterstitial({ open, onContinue, onCancel, onDismissPermanently }: WarmupInterstitialProps) {
  const { updateSettings } = useUserSettings()
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  if (!open) return null

  const handleStart = async () => {
    if (dontShowAgain) {
      setDismissing(true)
      try {
        await updateSettings({ dismissedWarmup: true })
        onDismissPermanently()
      } catch {
        setDismissing(false)
      }
    } else {
      onContinue()
    }
  }

  return (
    <div
      role="button"
      tabIndex={-1}
      style={{ position: 'fixed', inset: 0, zIndex: 50 }}
      className="flex items-center justify-center backdrop-blur-md bg-black/40 dark:bg-black/60 p-4"
      onClick={onCancel}
      onKeyDown={e => { if (e.key === 'Escape') onCancel() }}
      aria-label="Close dialog"
    >
      <div
        role="dialog"
        aria-label="Warm up information"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
        className="relative w-full max-w-md bg-card border-2 border-border doom-noise"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground doom-heading uppercase tracking-wider">
            Warm Up First
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2">
              Get your body ready (5 min)
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Walk on the treadmill at an incline, jump rope, or ride the bike until you break a light sweat.
            </p>
            <p className="text-sm text-muted-foreground">
              Roll your shoulders, swing your arms, twist your torso, bend down and touch your toes. Loosen up whatever you&apos;re about to train.
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2">
              Your first sets are warm-ups
            </h3>
            <p className="text-sm text-muted-foreground">
              Each exercise starts with warm-up sets — use a weight that feels easy. Focus on the movement, not the load. More complex lifts have more warm-up sets built in.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">
              Don&apos;t show warm-up information again
            </span>
          </label>

          <button
            type="button"
            onClick={handleStart}
            disabled={dismissing}
            className="w-full py-3 bg-primary text-primary-foreground hover:bg-primary/90 doom-button-3d doom-focus-ring font-semibold text-sm uppercase tracking-wider disabled:opacity-50"
          >
            {dismissing ? 'Loading...' : 'Start Workout'}
          </button>
        </div>
      </div>
    </div>
  )
}
