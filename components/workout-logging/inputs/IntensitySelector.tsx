'use client'

import { Gauge } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TipAnnotation } from '@/components/ui/TipAnnotation'
import { type IntensityPreset, RIR_PRESETS, RPE_PRESETS } from '@/lib/constants/intensity-presets'

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
          className="w-full h-12 px-4 flex items-center justify-center
            hover:border-primary
            transition-all duration-75"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.50), inset 0 0 0 1px rgba(254,243,199,0.06)' }}
        >
          <span className="text-2xl font-bold text-foreground tabular-nums">
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
    <div>
      <TipAnnotation
        tint="primary"
        icon={<Gauge size={16} strokeWidth={2.2} aria-hidden="true" />}
        className="py-2 px-3"
      >
        <div className="text-base font-bold uppercase tracking-wider text-primary">
          {tipHeading}
        </div>
        <p className="mt-0.5 text-base text-foreground">{tipBody}</p>
      </TipAnnotation>

      <div className="mt-2 border border-border divide-y divide-border" style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.50), inset 0 0 0 1px rgba(254,243,199,0.06)' }}>
        {presets.map((preset) => {
          const isSelected = numericValue === preset.value
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleSelect(preset)}
              className={`w-full px-3 py-3 flex items-center gap-3
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

      {/* Cancel + Skip buttons — pulled out of the preset list and given
          the same doom-pressed treatment as the keypad action row. */}
      <div className="flex gap-px mt-2">
        <Button
          variant="secondary"
          doom
          onClick={onCancel}
          aria-label={`Cancel ${label} selection`}
          className="flex-1 h-11 text-error uppercase tracking-wider text-sm"
        >
          CANCEL
        </Button>
        <Button
          variant="secondary"
          doom
          onClick={() => {
            onChange('')
            onCollapse()
          }}
          className="flex-1 h-11 text-muted-foreground uppercase tracking-wider text-sm"
        >
          SKIP {label}
        </Button>
      </div>
    </div>
  )
}
