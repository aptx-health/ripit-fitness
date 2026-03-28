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
      <span className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">
        Reps
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!hasValue || numericValue <= 0}
          className="flex-shrink-0 w-14 h-14 flex items-center justify-center
            bg-error/15 border-2 border-error/40 border-b-4
            text-error hover:bg-error/25 hover:border-error
            active:bg-error active:text-white active:border-b-2 active:translate-y-[2px]
            disabled:opacity-30 disabled:hover:bg-error/15 disabled:hover:border-error/40
            transition-all duration-75"
          aria-label="Decrease reps"
        >
          <Minus size={24} strokeWidth={3} />
        </button>

        <div
          className="flex-1 h-14 flex items-center justify-center
            bg-muted border-2 border-input
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
          className="flex-shrink-0 w-14 h-14 flex items-center justify-center
            bg-success/15 border-2 border-success/40 border-b-4
            text-success hover:bg-success/25 hover:border-success
            active:bg-success active:text-white active:border-b-2 active:translate-y-[2px]
            transition-all duration-75"
          aria-label="Increase reps"
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </div>
    </div>
  )
}
