'use client'

import { BookOpen, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useUserSettings } from '@/hooks/useUserSettings'

interface StickNudgeBannerProps {
  onDismiss: () => void
}

export function StickNudgeBanner({ onDismiss }: StickNudgeBannerProps) {
  const { updateSettings } = useUserSettings()
  const [dismissing, setDismissing] = useState(false)

  const handleDismiss = async () => {
    setDismissing(true)
    try {
      await updateSettings({ dismissedStickNudge: true })
      onDismiss()
    } catch {
      setDismissing(false)
    }
  }

  return (
    <div className="relative border-2 border-primary bg-card doom-noise p-4 mb-4">
      <button
        type="button"
        onClick={handleDismiss}
        disabled={dismissing}
        className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors doom-focus-ring"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="shrink-0 mt-0.5">
          <BookOpen size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-1">
            Making It Stick
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            You&apos;ve got a few workouts under your belt. Want to make the habit easier to keep?
          </p>
          <Link
            href="/learn"
            className="text-sm text-primary hover:text-primary/80 font-semibold uppercase tracking-wider doom-focus-ring"
          >
            Read in the Learn tab
          </Link>
        </div>
      </div>
    </div>
  )
}
