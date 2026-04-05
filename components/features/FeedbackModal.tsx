'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { MessageSquarePlus, Send, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { useToast } from '@/components/ToastProvider'
import { clientLogger } from '@/lib/client-logger'
import type { FeedbackCategory } from '@/types/feedback'
import { FEEDBACK_CATEGORIES } from '@/types/feedback'

type FeedbackModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()
  const { success: toastSuccess, error: toastError } = useToast()

  const resetForm = () => {
    setCategory(null)
    setMessage('')
    setError(null)
  }

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      resetForm()
    }
  }

  const handleSubmit = async () => {
    if (!category || !message.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: message.trim(),
          pageUrl: pathname,
          userAgent: navigator.userAgent,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit feedback')
      }

      toastSuccess('Feedback sent', 'Thanks for helping us improve!')
      handleOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit feedback'
      clientLogger.error('Feedback submission failed:', err)
      if (msg.includes('Too many')) {
        toastError('Slow down', msg)
        handleOpenChange(false)
      } else {
        setError(msg)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedCategory = FEEDBACK_CATEGORIES.find((c) => c.value === category)

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{ position: 'fixed', inset: 0, zIndex: 70 }}
          className="backdrop-blur-md bg-black/40 dark:bg-black/60 animate-in fade-in"
        />
        <Dialog.Content
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 71,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
          className="bg-card border-2 border-primary w-[90vw] max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Dialog.Title className="text-lg font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <MessageSquarePlus size={20} className="text-primary" />
              Send Feedback
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="h-8 w-8 flex items-center justify-center border-2 border-border bg-muted hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* Category picker */}
            <div>
              <span className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                What kind of feedback?
              </span>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`px-3 py-2 border-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                      category === cat.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-foreground border-border hover:bg-secondary'
                    }`}
                  >
                    <span className="block text-sm font-semibold uppercase tracking-wider">
                      {cat.label}
                    </span>
                    <span
                      className={`block text-xs mt-0.5 ${
                        category === cat.value
                          ? 'text-primary-foreground/80'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {cat.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label
                htmlFor="feedback-message"
                className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider"
              >
                Your message
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={selectedCategory?.placeholder || 'Tell us what you think...'}
                maxLength={2000}
                rows={4}
                className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {message.length}/2000
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-error/10 border-2 border-error text-error text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-muted text-foreground border-2 border-border hover:bg-secondary transition-colors font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !category || !message.trim()}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground border-2 border-primary hover:bg-primary-hover transition-colors font-semibold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                <Send size={16} />
                {isSubmitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
