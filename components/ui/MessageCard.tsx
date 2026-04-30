'use client'

import { ChevronRight, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageMarkdown } from '@/components/ui/MessageMarkdown'
import { MESSAGE_ICONS } from '@/lib/icons/message-icons'

export interface MessageSlide {
  content: string
  icon: string
}

export interface MessageData {
  id: string
  content: string
  icon: string
  lifecycle: string
  version: number
  slides?: string | null // JSON array of { content, icon }
}

/** Parse slides from a message, falling back to content+icon as single slide */
export function getSlides(message: MessageData): MessageSlide[] {
  if (message.slides) {
    try {
      const parsed = JSON.parse(message.slides)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    } catch { /* fall through */ }
  }
  return [{ content: message.content, icon: message.icon }]
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
  const slides = getSlides(message)
  const isCarousel = slides.length > 1
  const [slideIndex, setSlideIndex] = useState(0)

  // Reset slide index when message changes
  useEffect(() => {
    setSlideIndex(0)
  }, [message.id])

  useEffect(() => {
    if (message.lifecycle === 'show_once' && onSeen && !seenRef.current) {
      seenRef.current = true
      onSeen(message.id)
    }
  }, [message.id, message.lifecycle, onSeen])

  const currentSlide = slides[slideIndex] ?? slides[0]
  const Icon = MESSAGE_ICONS[currentSlide.icon] ?? MESSAGE_ICONS.Lightbulb
  const isDismissable = message.lifecycle === 'show_until_dismissed' && onDismiss
  const hasMultiMessageNav = onNextTip && tipCount > 1

  const goNext = useCallback(() => {
    setSlideIndex((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  return (
    <div
      role="note"
      className="relative p-3.5 border border-dashed border-border/40 bg-muted/35"
    >
      {isDismissable && (
        <button
          type="button"
          onClick={() => onDismiss(message.id)}
          className={`absolute p-2 text-muted-foreground hover:text-foreground transition-colors doom-focus-ring z-10 ${
            isCarousel ? 'top-1.5 left-1.5' : 'top-1.5 right-1.5'
          }`}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}

      <div className={`flex items-start gap-2.5 ${isDismissable && isCarousel ? 'pl-6' : ''}`}>
        <Icon
          aria-hidden="true"
          size={18}
          strokeWidth={1.8}
          className="shrink-0 mt-[5px] text-muted-foreground"
        />
        <div
          aria-live="polite"
          className={`text-lg leading-relaxed text-muted-foreground flex-1 ${
            isDismissable || isCarousel ? 'pr-6' : ''
          }`}
        >
          <MessageMarkdown content={currentSlide.content} />
        </div>
      </div>

      {/* Carousel: right arrow + subtle counter */}
      {isCarousel && (
        <>
          <span className="absolute bottom-1.5 left-3.5 text-[10px] text-muted-foreground/40">
            {slideIndex + 1}/{slides.length}
          </span>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-end pr-2 doom-focus-ring"
            style={{
              background:
                'linear-gradient(to right, transparent, color-mix(in srgb, var(--muted) 85%, transparent) 40%)',
            }}
            aria-label="Next slide"
          >
            <ChevronRight size={16} className="text-muted-foreground/60" />
          </button>
        </>
      )}

      {/* Multi-message navigation (logger tip rotation across different messages) */}
      {!isCarousel && hasMultiMessageNav && (
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
