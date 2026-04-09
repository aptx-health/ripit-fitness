'use client'

import { MessageSquarePlus } from 'lucide-react'
import { useState } from 'react'

import FeedbackModal from '@/components/features/FeedbackModal'
import { trackEvent } from '@/lib/analytics'

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating button — desktop only, hidden on mobile to avoid BottomNav overlap */}
      <button
        type="button"
        onClick={() => { trackEvent('feedback_opened'); setOpen(true) }}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 60,
        }}
        className="hidden md:flex h-12 w-12 items-center justify-center bg-primary text-primary-foreground border-2 border-primary rounded-full shadow-lg hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        aria-label="Send feedback"
      >
        <MessageSquarePlus size={22} />
      </button>

      <FeedbackModal open={open} onOpenChange={setOpen} />
    </>
  )
}
