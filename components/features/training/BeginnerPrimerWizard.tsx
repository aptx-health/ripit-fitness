'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useUserSettings } from '@/hooks/useUserSettings'

interface BeginnerPrimerWizardProps {
  open: boolean
  onDismiss: () => void
}

const PAGES = [
  {
    title: 'THE APP DOES THE THINKING',
    content: (
      <>
        <p className="text-muted-foreground mb-3">
          Your program tells you exactly what to do each day: which exercises, how many sets, how many reps.
        </p>
        <p className="text-muted-foreground mb-3">
          Just follow along and log what you did. No planning required.
        </p>
        <p className="text-muted-foreground">
          Everything in your program uses equipment at this gym — no guesswork.
        </p>
      </>
    ),
  },
  {
    title: 'GO LIGHTER THAN YOU THINK',
    content: (
      <>
        <p className="text-muted-foreground mb-3">
          Controlled reps at moderate effort beat heavy weight with sloppy form. Your first week, pick weights that feel almost too easy — you&apos;ll dial it in.
        </p>
        <p className="text-muted-foreground mb-4">
          The app tracks something called RIR (reps in reserve). It just means &ldquo;how many more could you have done?&rdquo; You&apos;ll get a feel for it.
        </p>
        <Link href="/learn/choosing-the-right-weight" className="text-sm text-primary hover:text-primary/80 font-semibold uppercase tracking-wider">
          Read more: Choosing the Right Weight
        </Link>
      </>
    ),
  },
  {
    title: 'YOU BELONG HERE',
    content: (
      <>
        <p className="text-muted-foreground mb-3">
          Everyone in the gym started somewhere. Nobody is watching you as closely as you think.
        </p>
        <p className="text-muted-foreground mb-3">
          Wipe down equipment when you&apos;re done, rerack your weights, and don&apos;t camp on a machine while scrolling — that&apos;s really it.
        </p>
        <p className="text-muted-foreground mb-4">
          If you&apos;re unsure how a machine works, ask someone. Gym regulars genuinely like helping.
        </p>
        <Link href="/learn/gym-etiquette" className="text-sm text-primary hover:text-primary/80 font-semibold uppercase tracking-wider">
          Read more: Gym Etiquette
        </Link>
      </>
    ),
  },
  {
    title: 'YOUR BODY WILL TALK TO YOU',
    content: (
      <>
        <p className="text-muted-foreground mb-3">
          Feeling sore a day or two after your first workout is completely normal — especially the first week.
        </p>
        <p className="text-muted-foreground mb-3">
          Sharp pain during a lift is not. Stop, lower the weight, or skip that exercise.
        </p>
        <p className="text-muted-foreground mb-4">
          Rest 2-3 minutes between the big lifts. There&apos;s no rush.
        </p>
        <div className="flex flex-col gap-1">
          <Link href="/learn/your-first-week" className="text-sm text-primary hover:text-primary/80 font-semibold uppercase tracking-wider">
            Read more: Your First Week
          </Link>
          <Link href="/learn/staying-safe" className="text-sm text-primary hover:text-primary/80 font-semibold uppercase tracking-wider">
            Read more: Staying Safe
          </Link>
        </div>
      </>
    ),
  },
]

export function BeginnerPrimerWizard({ open, onDismiss }: BeginnerPrimerWizardProps) {
  const { updateSettings } = useUserSettings()
  const [currentPage, setCurrentPage] = useState(0)
  const [dismissing, setDismissing] = useState(false)

  if (!open) return null

  const isLastPage = currentPage === PAGES.length - 1
  const page = PAGES[currentPage]

  const handleDismiss = async () => {
    setDismissing(true)
    try {
      await updateSettings({ dismissedPrimer: true })
      trackEvent('primer_dismissed', { page_reached: currentPage + 1 })
      onDismiss()
    } catch {
      setDismissing(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50 }}
      className="flex items-center justify-center backdrop-blur-md bg-black/40 dark:bg-black/60 p-4"
    >
      <div
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
        className="relative w-full max-w-md bg-card border-2 border-border doom-noise"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground doom-heading uppercase tracking-wider">
            Getting Started
          </h2>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={dismissing}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors doom-focus-ring"
            aria-label="Skip primer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <h3 className="text-base font-bold text-foreground uppercase tracking-wider mb-4">
            {page.title}
          </h3>
          {page.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          {/* Page dots */}
          <div className="flex gap-2">
            {PAGES.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentPage ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            {currentPage > 0 && (
              <button
                type="button"
                onClick={() => setCurrentPage(p => p - 1)}
                className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors doom-focus-ring font-semibold uppercase tracking-wider"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}
            {isLastPage ? (
              <button
                type="button"
                onClick={handleDismiss}
                disabled={dismissing}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 doom-button-3d doom-focus-ring font-semibold text-sm uppercase tracking-wider disabled:opacity-50"
              >
                {dismissing ? 'Loading...' : "Let's Go"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentPage(p => p + 1)}
                className="flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 doom-button-3d doom-focus-ring font-semibold text-sm uppercase tracking-wider"
              >
                Next
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
