'use client'

import { X } from 'lucide-react'
import { useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import { POST_SESSION_QUESTIONS } from '@/types/feedback'

interface PostSessionFeedbackProps {
  open: boolean
  question: string
  onClose: () => void
}

export function PostSessionFeedback({ open, question, onClose }: PostSessionFeedbackProps) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!open) return null

  const handleSubmit = async () => {
    if (!message.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'post_session',
          message: message.trim(),
          pageUrl: window.location.pathname,
          userAgent: navigator.userAgent,
          properties: { question },
        }),
      })
      if (res.ok) {
        setSubmitted(true)
        setTimeout(onClose, 1200)
      } else {
        clientLogger.error('Failed to submit post-session feedback')
      }
    } catch (error) {
      clientLogger.error('Error submitting post-session feedback:', error)
    } finally {
      setSubmitting(false)
    }
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
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {submitted ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Thanks for the feedback.
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
                {question}
              </p>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Type anything (optional)..."
                className="w-full px-3 py-2 bg-input border-2 border-border text-foreground text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="p-4 border-t border-border flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-muted text-foreground hover:bg-secondary transition-colors font-semibold text-sm uppercase tracking-wider border-2 border-border doom-focus-ring"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !message.trim()}
              className="flex-1 py-3 bg-primary text-primary-foreground hover:bg-primary/90 doom-button-3d doom-focus-ring font-semibold text-sm uppercase tracking-wider disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Send'}
            </button>
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
