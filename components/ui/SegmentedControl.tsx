'use client'

import { type KeyboardEvent, useCallback, useRef } from 'react'

/**
 * Use `<SegmentedControl>` for filter / mode-switch controls (two or three
 * exclusive options that change what data is shown elsewhere on the screen).
 * Use `<Tabs>` (Radix) when the control has explicit tab-panel pairs (each
 * tab swaps the entire content below it).
 *
 * Visual treatment follows DESIGN.md card-lift + underline:
 *   - `lift` (default for ≤3 options): active option gets a card-cream lift
 *     (`bg-card text-foreground`) plus a 2px primary bottom underline; inactive
 *     options sit on a muted background with muted-foreground text.
 *   - `underline` (default for 4+ options): active option drops the card lift
 *     and uses only the 2px primary bottom underline, so the lift doesn't
 *     fight horizontal density.
 *
 * All colors flow through theme tokens — works across every theme.
 */
export type SegmentedControlOption<T extends string> = {
  value: T
  label: string
  /**
   * When true, renders a small primary-color dot in the top-right corner of
   * the option (used to flag new/unread content on a tab).
   */
  pip?: boolean
  disabled?: boolean
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedControlOption<T>>
  value: T
  onChange: (next: T) => void
  /**
   * Visual treatment. When omitted, auto-picks `lift` for ≤3 options and
   * `underline` for 4+ options.
   */
  presentation?: 'lift' | 'underline'
  className?: string
  'aria-label'?: string
}

export function SegmentedControl<const T extends string>({
  options,
  value,
  onChange,
  presentation,
  className = '',
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  const resolvedPresentation = presentation ?? (options.length <= 3 ? 'lift' : 'underline')
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  const focusOption = useCallback(
    (index: number) => {
      const clamped = ((index % options.length) + options.length) % options.length
      const target = buttonRefs.current[clamped]
      if (target) {
        target.focus()
        const opt = options[clamped]
        if (opt && !opt.disabled) {
          onChange(opt.value)
        }
      }
    },
    [options, onChange]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault()
          focusOption(index + 1)
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault()
          focusOption(index - 1)
          break
        case 'Home':
          event.preventDefault()
          focusOption(0)
          break
        case 'End':
          event.preventDefault()
          focusOption(options.length - 1)
          break
        default:
          break
      }
    },
    [focusOption, options.length]
  )

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex border-b border-border bg-muted/40 ${className}`}
    >
      {options.map((option, index) => {
        const isActive = option.value === value
        const baseStyles =
          'relative flex-1 min-h-12 px-3 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors doom-focus-ring whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'

        let stateStyles: string
        if (resolvedPresentation === 'lift') {
          stateStyles = isActive
            ? 'bg-card text-foreground'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
        } else {
          stateStyles = isActive
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground'
        }

        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[index] = el
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`${baseStyles} ${stateStyles}`}
          >
            {option.label}
            {option.pip && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-2 w-2 h-2 bg-primary"
              />
            )}
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 bottom-0 h-[2px] bg-primary"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
