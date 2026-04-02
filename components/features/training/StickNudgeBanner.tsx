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
    <div className="relative border border-border border-t-[3px] border-t-primary bg-card doom-noise p-4 mb-4 animate-accent-sweep">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-base font-bold text-foreground doom-heading uppercase tracking-wider">
          You&apos;re off to a great start
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={dismissing}
          className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors doom-focus-ring"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        You&apos;ve got a few workouts under your belt. Want to make the habit easier to keep?
      </p>
      <Link
        href="/learn/making-the-gym-easy"
        onClick={handleDismiss}
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-semibold doom-focus-ring"
      >
        <BookOpen size={14} />
        Read &ldquo;Making It Stick&rdquo;
      </Link>
    </div>
  )
}
