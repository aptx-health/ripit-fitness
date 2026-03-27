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
      <div>
        <span className="block text-sm font-semibold text-foreground mb-1 uppercase tracking-wider">
          Weight ({weightUnit})
        </span>
        <button
          type="button"
          onClick={handleExpand}
          className="w-full h-14 px-4 flex items-center justify-center
            bg-muted border-2 border-input border-b-4
            text-2xl font-bold text-foreground tabular-nums
            hover:border-primary active:bg-secondary active:border-b-2 active:translate-y-[2px]
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
      <span className="block text-sm font-semibold text-foreground mb-1 uppercase tracking-wider">
        Weight ({weightUnit})
      </span>

      {/* Current value display */}
      <div
        className="w-full h-14 px-4 flex items-center justify-center
          bg-card border-2 border-primary
          text-2xl font-bold text-foreground tabular-nums
          shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]"
      >
        {value || '0'}
        <span className="text-sm font-semibold text-muted-foreground ml-2">
          {weightUnit}
        </span>
      </div>

      {/* Number keypad grid */}
      <div className="grid grid-cols-3 gap-1 mt-1">
        {KEYPAD_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleKeyPress(key)}
            className={`h-12 flex items-center justify-center
              font-bold text-lg border-2 transition-colors
              active:bg-primary active:text-primary-foreground active:border-primary
              ${key === 'CLR'
                ? 'bg-muted text-muted-foreground border-input hover:border-primary text-sm uppercase tracking-wider'
                : key === 'DEL'
                  ? 'bg-muted text-muted-foreground border-input hover:border-primary'
                  : 'bg-muted text-foreground border-input hover:border-primary hover:bg-secondary'
              }`}
          >
            {key === 'DEL' ? <Delete size={20} /> : key}
          </button>
        ))}
      </div>

      {/* Done button */}
      <button
        type="button"
        onClick={handleDone}
        className="w-full mt-1 h-12 bg-primary text-primary-foreground
          font-bold uppercase tracking-wider text-base
          hover:bg-primary/90 active:bg-primary/80
          transition-colors doom-button-3d"
      >
        Done
      </button>
    </div>
  )
}
