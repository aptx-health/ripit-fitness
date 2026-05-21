'use client';

import { useMemo, useState } from 'react';
import { FilterChoiceSheet } from '@/components/exercise-selection/FilterChoiceSheet';
import { EQUIPMENT_GROUPS, EQUIPMENT_LABELS } from '@/lib/constants/program-metadata';

export interface EquipmentSelectorProps {
  value: string[];
  onChange: (equipment: string[]) => void;
  error?: string;
}

export default function EquipmentSelector({
  value = [],
  onChange,
  error,
}: EquipmentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const options = useMemo(
    () =>
      [...EQUIPMENT_GROUPS.common, ...EQUIPMENT_GROUPS.specialized].map((eq) => ({
        value: eq,
        label: EQUIPMENT_LABELS[eq] || eq,
      })),
    [],
  );

  const displayText =
    value.length === 0 ? 'Select equipment...' : EQUIPMENT_LABELS[value[0]] || value[0];

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`w-full px-4 py-2 border-2 hover:border-primary focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground text-left font-bold ${
          error ? 'border-error' : 'border-input'
        }`}
      >
        {displayText}
      </button>
      <FilterChoiceSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Select equipment"
        options={options}
        selected={value[0] ?? null}
        onSelect={(next) => onChange(next ? [next] : [])}
      />
      {error && <p className="text-sm text-error font-medium">{error}</p>}
    </div>
  );
}
