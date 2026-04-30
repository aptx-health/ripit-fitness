'use client'

import { ChevronRight, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { MESSAGE_ICONS } from '@/lib/icons/message-icons'
import { MessageMarkdown } from '@/components/ui/MessageMarkdown'

export interface MessageData {
  id: string
  content: string
  icon: string
  lifecycle: string
  version: number
}

interface MessageCardProps {
  message: MessageData
  variant: 'training_tab' | 'exercise_logger'
  tipCount?: number
  onNextTip?: () => void
  onDismiss?: (messageId: string) => void
  onSeen?: (messageId: string) => void
}

export function MessageCard({
  message,
  variant,
  tipCount = 0,
  onNextTip,
  onDismiss,
  onSeen,
}: MessageCardProps) {
  const seenRef = useRef(false)

  useEffect(() => {
    if (message.lifecycle === 'show_once' && onSeen && !seenRef.current) {
      seenRef.current = true
      onSeen(message.id)
    }
  }, [message.id, message.lifecycle, onSeen])

  const Icon = MESSAGE_ICONS[message.icon] ?? MESSAGE_ICONS.Lightbulb
  const isDismissable = message.lifecycle === 'show_until_dismissed' && onDismiss
  const hasNavigation = onNextTip && tipCount > 1

  return (
    <div
      role="note"
      className="relative p-3.5 border border-dashed border-border/40 bg-muted/35"
    >
      {isDismissable && (
        <button
          type="button"
          onClick={() => onDismiss(message.id)}
          className="absolute top-1.5 right-1.5 p-2 text-muted-foreground hover:text-foreground transition-colors doom-focus-ring z-10"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}

      <div className="flex items-start gap-2.5">
        <Icon
          aria-hidden="true"
          size={18}
          strokeWidth={1.8}
          className="shrink-0 mt-[5px] text-muted-foreground"
        />
        <div
          aria-live="polite"
          className={`text-lg leading-relaxed text-muted-foreground ${
            hasNavigation ? 'pr-6' : ''
          } ${isDismissable ? 'pr-6' : ''}`}
        >
          <MessageMarkdown content={message.content} />
        </div>
      </div>

      {hasNavigation && (
        <button
          type="button"
          onClick={onNextTip}
          className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-end pr-2 doom-focus-ring"
          style={{
            background:
              'linear-gradient(to right, transparent, color-mix(in srgb, var(--muted) 85%, transparent) 40%)',
          }}
          aria-label="Next tip"
        >
          <ChevronRight size={16} className="text-muted-foreground/60" />
        </button>
      )}
    </div>
  )
}
