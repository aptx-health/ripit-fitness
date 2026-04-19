'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import { POST_SESSION_QUESTIONS, POST_SESSION_REFINEMENTS } from '@/types/feedback'

interface PostSessionFeedbackProps {
  open: boolean
  onClose: () => void
}

export function PostSessionFeedback({ open, onClose }: PostSessionFeedbackProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [selectedRefinements, setSelectedRefinements] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup auto-close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  if (!open) return null

  const handleSubmit = async (ratingValue: number, refinements: string[] = [], comment = '') => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'post_session',
          rating: ratingValue,
          refinements,
          message: comment.trim() || undefined,
          pageUrl: window.location.pathname,
          userAgent: navigator.userAgent,
        }),
      })
      if (res.ok) {
        setSubmitted(true)
        closeTimerRef.current = setTimeout(onClose, 1200)
      } else {
        clientLogger.error('Failed to submit post-session feedback')
      }
    } catch (error) {
      clientLogger.error('Error submitting post-session feedback:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRatingTap = (value: number) => {
    setRating(value)
    // Rating 5 = auto-submit immediately
    if (value === 5) {
      handleSubmit(value)
    }
  }

  const toggleRefinement = (value: string) => {
    setSelectedRefinements(prev =>
      prev.includes(value) ? prev.filter(r => r !== value) : [...prev, value]
    )
  }

  const handleFinalSubmit = () => {
    if (!rating) return
    handleSubmit(rating, selectedRefinements, message)
  }

  return (
    <div
      role="button"
      tabIndex={-1}
      style={{ position: 'fixed', inset: 0, zIndex: 50 }}
      className="flex items-center justify-center backdrop-blur-md bg-black/40 dark:bg-black/60 p-4"
      onClick={onClose}
      onKeyDown={e => { if (e.key === 'Escape') onClose() }}
      aria-label="Close dialog"
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: presentation wrapper stops click propagation */}
      <div
        role="presentation"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
        className="relative w-full max-w-md bg-card border-2 border-border doom-noise"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground doom-heading uppercase tracking-wider">
            Quick Check-In
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center border-2 border-border bg-muted hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {submitted ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Thanks for the feedback.
            </p>
          ) : (
            <>
              {/* Step 1: Rating */}
              <div>
                <p className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
                  How was your experience?
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRatingTap(value)}
                      disabled={submitting}
                      className={`flex-1 min-h-12 py-3 border-2 text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                        rating === value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-foreground border-border hover:bg-secondary'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Refinement chips (only if rating < 5) */}
              {rating !== null && rating < 5 && (
                <div>
                  <p className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
                    What could be better?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {POST_SESSION_REFINEMENTS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleRefinement(value)}
                        disabled={submitting}
                        className={`px-3 py-2 border-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                          selectedRefinements.includes(value)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted text-foreground border-border hover:bg-secondary'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Optional comment (only if rating < 5) */}
              {rating !== null && rating < 5 && (
                <div>
                  <label
                    htmlFor="post-session-comment"
                    className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider"
                  >
                    Anything specific? (optional)
                  </label>
                  <textarea
                    id="post-session-comment"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder="Type anything..."
                    className="w-full px-3 py-2 bg-input border-2 border-border text-foreground text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — Skip / Submit (hidden after submit or before rating selected) */}
        {!submitted && (
          <div className="p-4 border-t border-border flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-muted text-foreground hover:bg-secondary transition-colors font-semibold text-sm uppercase tracking-wider border-2 border-border doom-focus-ring"
            >
              Skip
            </button>
            {rating !== null && rating < 5 && (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex-1 py-3 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors font-semibold text-sm uppercase tracking-wider border-2 border-primary doom-focus-ring disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Submit'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Pick a random question from the bank */
export function pickPostSessionQuestion(): string {
  return POST_SESSION_QUESTIONS[Math.floor(Math.random() * POST_SESSION_QUESTIONS.length)]
}
