'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export type FilterChoiceOption = {
  value: string | null
  label: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  options: FilterChoiceOption[]
  selected: string | null
  onSelect: (value: string | null) => void
}

// Use inline styles for positioning. iOS Safari has had stacking-context
// quirks combined with Tailwind v4's `translate` CSS property and
// backdrop-filter that left the content invisible even when paint-wise
// nothing should obscure it. Explicit `transform` sidesteps the issue.
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isDesktop
}

export function FilterChoiceSheet({
  open,
  onOpenChange,
  title,
  options,
  selected,
  onSelect,
}: Props) {
  const isDesktop = useIsDesktop()

  const handlePick = (value: string | null) => {
    onSelect(value)
    onOpenChange(false)
  }

  const contentStyle: React.CSSProperties = isDesktop
    ? {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(96vw, 28rem)',
        zIndex: 201,
      }
    : {
        position: 'fixed',
        left: '50%',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        transform: 'translateX(-50%)',
        width: 'min(96vw, 28rem)',
        zIndex: 201,
      }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.55)',
          }}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          style={contentStyle}
        >
          <div
            className="bg-card border border-border doom-corners"
            style={{ boxShadow: '0 -8px 24px rgba(0,0,0,0.35)' }}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-border">
              <DialogPrimitive.Title className="doom-label text-foreground/80">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close"
                className="inline-flex items-center justify-center w-8 h-8 border border-border bg-muted/30 hover:bg-muted/60 active:bg-muted text-foreground/70 hover:text-foreground transition-colors doom-focus-ring"
              >
                <X size={16} strokeWidth={2.5} />
              </DialogPrimitive.Close>
            </div>
            <div className="relative">
              <div
                className="overscroll-contain"
                style={{
                  maxHeight: 'min(60vh, 420px)',
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y',
                }}
              >
                <ul className="py-1">
                {options.map((option) => {
                  const isSelected = option.value === selected
                  return (
                    <li key={option.value ?? '__all__'}>
                      <button
                        type="button"
                        onClick={() => handlePick(option.value)}
                        aria-pressed={isSelected}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-base font-bold border-b border-border/40 last:border-b-0 transition-colors ${
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-muted/40 active:bg-muted/60'
                        }`}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check size={18} strokeWidth={3} />}
                      </button>
                    </li>
                  )
                })}
              </ul>
              </div>
              {/* Bottom fade — hint that the list scrolls past the cutoff.
                  Pointer-events:none so it doesn't intercept the last row. */}
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 24,
                  pointerEvents: 'none',
                  background:
                    'linear-gradient(to bottom, color-mix(in srgb, var(--card) 0%, transparent), var(--card))',
                }}
              />
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
