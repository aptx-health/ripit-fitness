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
}

export function IntensitySelector({
  type,
  value,
  onChange,
  isExpanded,
  onExpand,
  onCollapse,
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
        <span className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">
          {label} (optional)
        </span>
        <button
          type="button"
          onClick={onExpand}
          className="w-full h-14 px-4 flex items-center justify-center
            bg-muted border-2 border-input border-b-4
            hover:border-primary active:bg-secondary active:border-b-2 active:translate-y-[2px]
            transition-all duration-75"
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
      <span className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">
        {label} (optional)
      </span>

      <div className="space-y-1">
        {presets.map((preset) => {
          const isSelected = numericValue === preset.value
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleSelect(preset)}
              className={`w-full px-4 py-3 flex items-center gap-3
                border-2 transition-colors text-left
                active:bg-primary active:text-primary-foreground active:border-primary
                ${isSelected
                  ? 'bg-primary/10 border-primary text-foreground shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]'
                  : 'bg-muted border-input text-foreground hover:border-primary hover:bg-secondary'
                }`}
            >
              <span className={`text-xl font-bold tabular-nums min-w-[40px] ${
                isSelected ? 'text-primary' : ''
              }`}>
                {preset.label}
              </span>
              <span className="text-base text-muted-foreground font-medium">
                {preset.description}
              </span>
            </button>
          )
        })}

        {/* Clear / Skip button */}
        <button
          type="button"
          onClick={() => {
            onChange('')
            onCollapse()
          }}
          className="w-full px-4 py-3 bg-muted border-2 border-input
            text-muted-foreground font-bold uppercase tracking-wider text-base
            hover:border-primary hover:bg-secondary transition-colors"
        >
          Skip {label}
        </button>
      </div>
    </div>
  )
}
