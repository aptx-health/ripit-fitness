'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Dumbbell, Send, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { useToast } from '@/components/ToastProvider'
import { clientLogger } from '@/lib/client-logger'

type ProgramRequestModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ProgramRequestModal({ open, onOpenChange }: ProgramRequestModalProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()
  const { success: toastSuccess, error: toastError } = useToast()

  const resetForm = () => {
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
    if (!message.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'feature',
          message: message.trim(),
          pageUrl: pathname,
          userAgent: navigator.userAgent,
          properties: { source: 'program_request' },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit request')
      }

      toastSuccess('Request sent', 'Thanks for the suggestion!')
      handleOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit request'
      clientLogger.error('Program request submission failed:', err)
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
              <Dumbbell size={20} className="text-primary" />
              Request a Program
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
            <p className="text-sm text-muted-foreground">
              What kind of training program are you looking for? A specific style, a goal you want to hit, equipment you have access to — anything helps.
            </p>

            {/* Message */}
            <div>
              <textarea
                id="program-request-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder='e.g. "A 3-day upper/lower split for beginners" or "Something focused on building pull-up strength"'
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
                disabled={isSubmitting || !message.trim()}
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
