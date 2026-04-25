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
    <div>
      <span className="block text-sm text-muted-foreground mb-1 font-bold uppercase tracking-wider">
        REPS
      </span>
      <div className="flex items-center">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!hasValue || numericValue <= 0}
          className="flex-shrink-0 min-w-[56px] min-h-[56px] flex items-center justify-center
            border-2 border-border bg-muted text-foreground
            hover:bg-secondary hover:text-foreground
            active:bg-secondary active:text-foreground
            disabled:opacity-30
            transition-all duration-75"
          aria-label="Decrease reps"
        >
          <Minus size={24} strokeWidth={3} />
        </button>

        <div
          className="flex-1 min-h-[56px] flex items-center justify-center
            bg-card border-y-2 border-border
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
          className="flex-shrink-0 min-w-[56px] min-h-[56px] flex items-center justify-center
            border-2 border-success-border bg-success-muted text-success-text
            hover:bg-success hover:text-success-foreground
            active:bg-success-hover active:text-success-foreground
            transition-all duration-75"
          aria-label="Increase reps"
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </div>
    </div>
  )
}
