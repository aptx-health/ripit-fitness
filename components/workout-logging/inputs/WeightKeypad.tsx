'use client'

import { Dumbbell } from 'lucide-react'
import { LoggingEducationPanel } from './LoggingEducationPanel'
import { NumberKeypad } from './NumberKeypad'

interface WeightKeypadProps {
  value: string
  weightUnit: 'lbs' | 'kg'
  onChange: (value: string) => void
  isExpanded: boolean
  onExpand: () => void
  onCollapse: () => void
  onCancel: () => void
}

export function WeightKeypad({
  value,
  weightUnit,
  onChange,
  isExpanded,
  onExpand,
  onCollapse,
  onCancel,
}: WeightKeypadProps) {
  if (isExpanded) {
    return (
      <NumberKeypad
        value={value}
        onChange={onChange}
        onCollapse={onCollapse}
        onCancel={onCancel}
        label={`WEIGHT (${weightUnit.toUpperCase()})`}
        unit={weightUnit}
        educationPanel={<LoggingEducationPanel mode="weight" />}
      />
    )
  }

  return (
    <div>
      <span className="flex items-center gap-1.5 text-base text-muted-foreground mb-1 font-bold uppercase tracking-wider">
        <Dumbbell size={14} strokeWidth={3} aria-hidden="true" />
        WEIGHT ({weightUnit.toUpperCase()})
      </span>
      <button
        type="button"
        onClick={onExpand}
        className="readout-stamped w-full h-12 px-4 flex items-center justify-center
          text-2xl font-bold transition-all duration-75"
      >
        <span className="readout-stamped-digit">{value || '0'}</span>
        <span className="text-sm font-semibold ml-2 readout-stamped-digit opacity-70">
          {weightUnit}
        </span>
      </button>
    </div>
  )
}
