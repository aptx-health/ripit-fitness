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
