'use client'

import { Minus, Plus } from 'lucide-react'

interface RepsStepperProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function RepsStepper({ value, onChange, placeholder }: RepsStepperProps) {
  const numericValue = value ? parseInt(value, 10) : 0
  const hasValue = value !== ''

  const handleDecrement = () => {
    if (!hasValue) return
    const next = Math.max(0, numericValue - 1)
    onChange(next === 0 ? '' : String(next))
  }

  const handleIncrement = () => {
    const next = hasValue ? numericValue + 1 : 1
    onChange(String(next))
  }

  return (
    <div data-tour="reps-stepper">
      <span className="block text-sm text-muted-foreground mb-1 font-bold uppercase tracking-wider">
        REPS
      </span>
      <div className="flex items-center">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!hasValue || numericValue <= 0}
          className="flex-shrink-0 w-12 h-12 flex items-center justify-center
            border border-border text-muted-foreground
            hover:text-error hover:border-error hover:bg-error/10
            active:bg-error active:text-white
            disabled:opacity-20 disabled:hover:text-muted-foreground disabled:hover:border-border disabled:hover:bg-transparent
            transition-all duration-75"
          aria-label="Decrease reps"
        >
          <Minus size={18} strokeWidth={2.5} />
        </button>

        <div
          className="flex-1 h-12 flex items-center justify-center
            bg-card border-y border-border
            text-2xl font-bold text-foreground tabular-nums min-w-[60px]"
        >
          {hasValue ? numericValue : (
            <span className="text-muted-foreground text-lg">
              {placeholder || '0'}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          className="flex-shrink-0 w-12 h-12 flex items-center justify-center
            border border-border text-muted-foreground
            hover:text-success hover:border-success hover:bg-success/10
            active:bg-success active:text-white
            transition-all duration-75"
          aria-label="Increase reps"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
