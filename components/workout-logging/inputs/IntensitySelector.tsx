'use client'

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
        <span className="block text-sm text-muted-foreground mb-1 font-bold uppercase tracking-wider">
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
  return (
    <div>
      <span className="block text-sm text-muted-foreground mb-1 font-bold uppercase tracking-wider">
        {label}
      </span>

      <div className="border border-border divide-y divide-border" style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.50), inset 0 0 0 1px rgba(254,243,199,0.06)' }}>
        {presets.map((preset) => {
          const isSelected = numericValue === preset.value
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleSelect(preset)}
              className={`w-full px-3 py-2.5 flex items-center gap-3
                transition-colors text-left
                active:bg-primary active:text-primary-foreground
                ${isSelected
                  ? 'bg-primary/10 text-foreground'
                  : 'bg-card text-foreground hover:bg-muted'
                }`}
            >
              <span className={`text-lg font-bold tabular-nums min-w-[36px] ${
                isSelected ? 'text-primary' : ''
              }`}>
                {preset.label}
              </span>
              <span className="text-sm text-muted-foreground">
                {preset.description}
              </span>
            </button>
          )
        })}

        {/* Cancel + Skip buttons */}
        <div className="flex">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-3 py-2.5 bg-error text-error-foreground
              font-bold uppercase tracking-wider text-sm
              hover:bg-error-hover transition-colors"
            aria-label={`Cancel ${label} selection`}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => {
              onChange('')
              onCollapse()
            }}
            className="flex-1 px-3 py-2.5 bg-card
              text-muted-foreground font-bold uppercase tracking-wider text-sm
              hover:bg-muted transition-colors border-l border-border"
          >
            SKIP {label}
          </button>
        </div>
      </div>
    </div>
  )
}
