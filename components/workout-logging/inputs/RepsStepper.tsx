'use client'

import { Minus, Plus } from 'lucide-react'

const RAISED_SHADOW = 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.40)'
const RECESSED_SHADOW = 'inset 0 1px 2px rgba(0,0,0,0.50), inset 0 0 0 1px rgba(254,243,199,0.06)'

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
          className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center
            text-foreground
            disabled:opacity-30
            transition-all duration-75"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', boxShadow: RAISED_SHADOW }}
          aria-label="Decrease reps"
        >
          <Minus size={24} strokeWidth={3} />
        </button>

        <div
          className="flex-1 min-h-[44px] flex items-center justify-center
            text-2xl font-bold text-foreground tabular-nums min-w-[60px]"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', boxShadow: RECESSED_SHADOW }}
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
          className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center
            bg-success-muted text-success-text
            hover:bg-success hover:text-success-foreground
            active:bg-success-hover active:text-success-foreground
            transition-all duration-75"
          style={{ boxShadow: RAISED_SHADOW }}
          aria-label="Increase reps"
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </div>
    </div>
  )
}
