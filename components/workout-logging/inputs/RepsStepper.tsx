'use client'

import { Hash, Minus, Plus } from 'lucide-react'
import { LoggingEducationPanel } from './LoggingEducationPanel'
import { NumberKeypad } from './NumberKeypad'

const RAISED_SHADOW = 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.40)'
const RECESSED_SHADOW = 'inset 0 1px 2px rgba(0,0,0,0.50), inset 0 0 0 1px rgba(254,243,199,0.06)'

interface RepsStepperProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  isExpanded?: boolean
  onExpand?: () => void
  onCollapse?: () => void
  onCancel?: () => void
}

export function RepsStepper({
  value,
  onChange,
  placeholder,
  isExpanded = false,
  onExpand,
  onCollapse,
  onCancel,
}: RepsStepperProps) {
  const numericValue = value ? parseInt(value, 10) : 0
  const hasValue = value !== ''

  if (isExpanded && onCollapse && onCancel) {
    return (
      <NumberKeypad
        value={value}
        onChange={onChange}
        onCollapse={onCollapse}
        onCancel={onCancel}
        label="REPETITIONS"
        educationPanel={<LoggingEducationPanel mode="reps" />}
      />
    )
  }

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
      <span className="flex items-center gap-1.5 text-base text-muted-foreground mb-1 font-bold uppercase tracking-wider">
        <Hash size={14} strokeWidth={3} aria-hidden="true" />
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

        <button
          type="button"
          onClick={onExpand}
          disabled={!onExpand}
          aria-label="Edit reps with keypad"
          className="flex-1 min-h-[44px] flex items-center justify-center
            text-2xl font-bold text-foreground tabular-nums min-w-[60px]
            transition-all duration-75
            disabled:cursor-default"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', boxShadow: RECESSED_SHADOW }}
        >
          {hasValue ? (
            <>
              {numericValue}
              <span className="text-sm font-semibold text-muted-foreground ml-2">
                reps
              </span>
            </>
          ) : (
            <span className="text-muted-foreground text-lg">
              {placeholder ? `${placeholder} reps` : '0 reps'}
            </span>
          )}
        </button>

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
