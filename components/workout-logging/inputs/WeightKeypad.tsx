'use client'

import { Delete } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'

interface WeightKeypadProps {
  value: string
  weightUnit: 'lbs' | 'kg'
  onChange: (value: string) => void
  isExpanded: boolean
  onExpand: () => void
  onCollapse: () => void
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
      <div data-tour="weight-input">
        <span className="block text-xs text-muted-foreground mb-1 font-bold uppercase tracking-wider">
          WEIGHT ({weightUnit.toUpperCase()})
        </span>
        <button
          type="button"
          onClick={handleExpand}
          className="w-full h-12 px-4 flex items-center justify-center
            bg-card border border-border
            text-2xl font-bold text-foreground tabular-nums
            hover:border-primary
            transition-all duration-75"
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
    <div className="mt-auto">
      <span className="block text-xs text-muted-foreground mb-1 font-bold uppercase tracking-wider">
        WEIGHT ({weightUnit.toUpperCase()})
      </span>

      {/* Current value display */}
      <div
        className="w-full h-12 px-4 flex items-center justify-center
          bg-card border-2 border-primary
          text-2xl font-bold text-foreground tabular-nums
          shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]"
      >
        {value || '0'}
        <span className="text-sm font-semibold text-muted-foreground ml-2">
          {weightUnit}
        </span>
      </div>

      {/* Number keypad grid */}
      <div className="grid grid-cols-3 gap-px mt-px bg-border">
        {KEYPAD_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleKeyPress(key)}
            className={`h-11 flex items-center justify-center
              font-bold text-lg transition-colors
              active:bg-primary active:text-primary-foreground
              ${key === 'CLR'
                ? 'bg-muted text-muted-foreground hover:bg-secondary text-sm uppercase tracking-wider'
                : key === 'DEL'
                  ? 'bg-muted text-muted-foreground hover:bg-secondary'
                  : 'bg-card text-foreground hover:bg-secondary'
              }`}
          >
            {key === 'DEL' ? <Delete size={18} /> : key}
          </button>
        ))}
      </div>

      {/* Done button */}
      <button
        type="button"
        onClick={handleDone}
        className="w-full mt-px h-11 bg-primary text-primary-foreground
          font-bold uppercase tracking-wider text-sm
          hover:bg-primary/90 active:bg-primary/80
          transition-colors"
      >
        DONE
      </button>
    </div>
  )
}
