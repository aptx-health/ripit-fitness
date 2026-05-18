'use client'

import { Gauge } from 'lucide-react'
import { TipAnnotation } from '@/components/ui/TipAnnotation'
import { type IntensityPreset, RIR_PRESETS, RPE_PRESETS } from '@/lib/constants/intensity-presets'

const TRACE_SHADOW =
  'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 0 rgba(58, 40, 23, 0.12)'
const TRACE_BUTTON_CLASS =
  'flex-1 h-11 bg-muted font-bold uppercase tracking-wider text-sm ' +
  'transition-all duration-75 hover:bg-secondary-hover ' +
  'active:translate-y-[2px] active:shadow-none'

interface IntensitySelectorProps {
  type: 'rpe' | 'rir'
  value: string
  onChange: (value: string) => void
  prescribedValue?: number | null
  isExpanded: boolean
  onExpand: () => void
  onCollapse: () => void
  onCancel: () => void
}

export function IntensitySelector({
  type,
  value,
  onChange,
  isExpanded,
  onExpand,
  onCollapse,
  onCancel,
}: IntensitySelectorProps) {
  const presets: IntensityPreset[] = type === 'rpe' ? RPE_PRESETS : RIR_PRESETS
  const label = type === 'rpe' ? 'RPE' : 'RIR'

  const numericValue = value ? parseFloat(value) : null

  const handleSelect = (preset: IntensityPreset) => {
    onChange(String(preset.value))
    onCollapse()
  }

  // Compact view
  if (!isExpanded) {
    return (
      <div>
        <span className="block text-base text-muted-foreground mb-1 font-bold uppercase tracking-wider">
          {label}
        </span>
        <button
          type="button"
          onClick={onExpand}
          className="readout-stamped w-full h-12 px-4 flex items-center justify-center
            transition-all duration-75"
        >
          <span className="readout-stamped-digit text-2xl font-bold">
            {value || '--'}
          </span>
        </button>
      </div>
    )
  }

  // Expanded view with preset grid
  const tipHeading = type === 'rir' ? 'REPS IN RESERVE' : 'PERCEIVED EXERTION'
  const tipBody =
    type === 'rir'
      ? 'How many more reps you could have done after stopping the set.'
      : 'How hard the last set felt, on a scale of 1 to 10.'

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <TipAnnotation
        tint="primary"
        icon={<Gauge size={16} strokeWidth={2.2} aria-hidden="true" />}
        className="flex-shrink-0 py-2 px-3"
      >
        <div className="text-base font-bold uppercase tracking-wider text-primary">
          {tipHeading}
        </div>
        <p className="mt-0.5 text-base text-foreground [@media(max-height:700px)]:hidden">{tipBody}</p>
      </TipAnnotation>

      {/* Preset list sits at natural height below the tip; on tight
          viewports it shrinks and scrolls internally so Cancel/Skip
          stay reachable. */}
      <div className="min-h-0 overflow-y-auto mt-2 border border-border divide-y divide-border" style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.50), inset 0 0 0 1px rgba(254,243,199,0.06)' }}>
        {presets.map((preset) => {
          const isSelected = numericValue === preset.value
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleSelect(preset)}
              className={`w-full px-3 py-2 flex items-center gap-3
                transition-colors text-left
                active:bg-primary active:text-primary-foreground
                ${isSelected
                  ? 'bg-primary/10 text-foreground'
                  : 'bg-card text-foreground hover:bg-muted'
                }`}
            >
              <span className={`text-2xl font-bold tabular-nums min-w-[44px] ${
                isSelected ? 'text-primary' : ''
              }`}>
                {preset.label}
              </span>
              <span className="text-base text-foreground">
                {preset.description}
              </span>
            </button>
          )
        })}
      </div>

      {/* Cancel + Skip buttons — square-edged with a subtle tonal
          underline trace for tactility (no primary-color emphasis). */}
      <div className="flex-shrink-0 flex gap-px mt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)' }}>
        <button
          type="button"
          onClick={onCancel}
          aria-label={`Cancel ${label} selection`}
          className={`${TRACE_BUTTON_CLASS} text-error`}
          style={{ boxShadow: TRACE_SHADOW }}
        >
          CANCEL
        </button>
        <button
          type="button"
          onClick={() => {
            onChange('')
            onCollapse()
          }}
          className={`${TRACE_BUTTON_CLASS} text-muted-foreground`}
          style={{ boxShadow: TRACE_SHADOW }}
        >
          SKIP {label}
        </button>
      </div>
    </div>
  )
}
