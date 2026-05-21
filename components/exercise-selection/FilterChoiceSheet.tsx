'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Check, X } from 'lucide-react'

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

// Bottom-anchored on mobile, centered on desktop — same pattern as
// QuickActionSheet. A bottom sheet handles long option lists on phones
// far better than a popover trying to fit a 500px grid in a 375px viewport.
const MOBILE_BOTTOM = 'bottom-[calc(env(safe-area-inset-bottom,0px)+12px)]'
const DESKTOP_CENTER = 'md:bottom-auto md:top-1/2 md:-translate-y-1/2'

export function FilterChoiceSheet({
  open,
  onOpenChange,
  title,
  options,
  selected,
  onSelect,
}: Props) {
  const handlePick = (value: string | null) => {
    onSelect(value)
    onOpenChange(false)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(2px)',
          }}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={`fixed left-1/2 -translate-x-1/2 z-[51] w-[min(96vw,28rem)] ${MOBILE_BOTTOM} ${DESKTOP_CENTER} data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom md:data-[state=closed]:fade-out-0 md:data-[state=open]:fade-in-0 data-[state=open]:duration-200 data-[state=closed]:duration-150`}
        >
          <div
            className="flex flex-col bg-card border border-border doom-corners max-h-[min(80vh,32rem)]"
            style={{ boxShadow: '0 -8px 24px rgba(0,0,0,0.35)' }}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-border shrink-0">
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
            <div
              className="overflow-y-auto overscroll-contain [touch-action:pan-y] [-webkit-overflow-scrolling:touch]"
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
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
