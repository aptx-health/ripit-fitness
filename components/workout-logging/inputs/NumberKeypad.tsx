'use client'

import { Delete } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface NumberKeypadProps {
  value: string
  onChange: (value: string) => void
  onCollapse: () => void
  onCancel: () => void
  label: string
  unit?: string
  max?: number
}

const KEYPAD_KEYS = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  'CLR', '0', 'DEL',
] as const

export function NumberKeypad({
  value,
  onChange,
  onCollapse,
  onCancel,
  label,
  unit,
  max = 999,
}: NumberKeypadProps) {
  const replaceOnNext = useRef(true)

  // First keystroke after opening replaces any pre-filled value
  useEffect(() => {
    replaceOnNext.current = true
  }, [])

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
      onChange(value.slice(0, -1))
      return
    }

    if (replaceOnNext.current) {
      onChange(key === '0' ? '0' : key)
      replaceOnNext.current = false
      return
    }

    const candidate = value + key
    if (parseInt(candidate, 10) > max) return

    if (value === '0' && key === '0') return
    if (value === '0' && key !== '0') {
      onChange(key)
      return
    }

    onChange(candidate)
  }, [value, onChange, max])

  const handleDone = () => {
    replaceOnNext.current = false
    onCollapse()
  }

  return (
    <div
      className="mt-auto"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <span className="block text-sm text-muted-foreground mb-1.5 font-bold uppercase tracking-wider">
        {label}
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
        {unit && (
          <span className="text-base font-semibold text-muted-foreground ml-2">
            {unit}
          </span>
        )}
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
          aria-label={`Cancel ${label.toLowerCase()} entry`}
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
