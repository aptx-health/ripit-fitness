'use client'

import { Delete } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface WeightKeypadProps {
  value: string
  weightUnit: 'lbs' | 'kg'
  onChange: (value: string) => void
  isExpanded: boolean
  onExpand: () => void
  onCollapse: () => void
  onCancel: () => void
}

const KEYPAD_KEYS = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  'CLR', '0', 'DEL',
] as const

export function WeightKeypad({
  value,
  weightUnit,
  onChange,
  isExpanded,
  onExpand,
  onCollapse,
  onCancel,
}: WeightKeypadProps) {
  const replaceOnNext = useRef(false)

  // Set replaceOnNext when expanding
  useEffect(() => {
    if (isExpanded) {
      replaceOnNext.current = true
    }
  }, [isExpanded])

  const handleExpand = () => {
    onExpand()
  }

  const handleKeyPress = useCallback((key: string) => {
    if (key === 'CLR') {
      onChange('')
      replaceOnNext.current = false
      return
    }

    if (key === 'DEL') {
      if (replaceOnNext.current) {
        onChange('')
        replaceOnNext.current = false
        return
      }
      const newValue = value.slice(0, -1)
      onChange(newValue)
      return
    }

    // Digit
    if (replaceOnNext.current) {
      // First keystroke replaces the pre-filled value
      onChange(key === '0' ? '0' : key)
      replaceOnNext.current = false
      return
    }

    const candidate = value + key
    const numericCandidate = parseInt(candidate, 10)

    // Clamp to 0-999
    if (numericCandidate > 999) return

    // Prevent leading zeros (allow single "0")
    if (value === '0' && key === '0') return
    if (value === '0' && key !== '0') {
      onChange(key)
      return
    }

    onChange(candidate)
  }, [value, onChange])

  const handleDone = () => {
    replaceOnNext.current = false
    onCollapse()
  }

  // Compact view
  if (!isExpanded) {
    return (
      <div>
        <span className="block text-sm text-muted-foreground mb-1 font-bold uppercase tracking-wider">
          WEIGHT ({weightUnit.toUpperCase()})
        </span>
        <button
          type="button"
          onClick={handleExpand}
          className="w-full h-12 px-4 flex items-center justify-center
            text-2xl font-bold text-foreground tabular-nums
            hover:border-primary
            transition-all duration-75"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.50), inset 0 0 0 1px rgba(254,243,199,0.06)' }}
        >
          {value || '0'}
          <span className="text-sm font-semibold text-muted-foreground ml-2">
            {weightUnit}
          </span>
        </button>
      </div>
    )
  }

  // Expanded view with keypad - mt-auto pushes to bottom of flex container
  return (
    <div
      className="mt-auto"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <span className="block text-sm text-muted-foreground mb-1.5 font-bold uppercase tracking-wider">
        WEIGHT ({weightUnit.toUpperCase()})
      </span>

      {/* Current value display - recessed LCD screen */}
      <div
        className="w-full h-14 px-4 flex items-center justify-center
          border-2 border-primary
          text-3xl font-bold text-foreground tabular-nums bg-input"
        style={{
          boxShadow:
            'inset 0 2px 3px rgba(58, 40, 23, 0.18), inset 0 0 0 1px rgba(255,255,255,0.4), 0 0 12px rgba(var(--primary-rgb), 0.25)',
        }}
      >
        {value || '0'}
        <span className="text-base font-semibold text-muted-foreground ml-2">
          {weightUnit}
        </span>
      </div>

      {/* Number keypad grid - tactile molded keys on hairline rules */}
      <div className="grid grid-cols-3 gap-px mt-2 bg-border">
        {KEYPAD_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleKeyPress(key)}
            className={`h-14 flex items-center justify-center
              font-bold tabular-nums transition-all duration-75
              active:translate-y-[1px]
              active:bg-primary active:text-primary-foreground
              ${key === 'CLR'
                ? 'bg-muted text-muted-foreground hover:bg-secondary-hover text-sm uppercase tracking-wider'
                : key === 'DEL'
                  ? 'bg-muted text-muted-foreground hover:bg-secondary-hover'
                  : 'bg-card text-foreground text-2xl hover:bg-muted'
              }`}
            style={{
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(58, 40, 23, 0.08)',
            }}
          >
            {key === 'DEL' ? <Delete size={20} /> : key}
          </button>
        ))}
      </div>

      {/* Cancel + Done buttons */}
      <div className="flex gap-px mt-2">
        <Button
          variant="secondary"
          doom
          onClick={onCancel}
          aria-label="Cancel weight entry"
          className="flex-1 h-11 text-error uppercase tracking-wider text-sm"
        >
          CANCEL
        </Button>
        <Button
          variant="primary"
          doom
          onClick={handleDone}
          className="flex-[2] h-11 uppercase tracking-wider text-sm"
        >
          DONE
        </Button>
      </div>
    </div>
  )
}
