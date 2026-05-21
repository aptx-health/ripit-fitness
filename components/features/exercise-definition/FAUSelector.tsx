'use client';

import { useMemo, useState } from 'react';
import { FilterChoiceSheet } from '@/components/exercise-selection/FilterChoiceSheet';
import { FAU_DISPLAY_NAMES } from '@/lib/fau-volume';
import { pluralize } from '@/lib/format/pluralize';

export interface FAUSelectorProps {
  value: string[];
  onChange: (faus: string[]) => void;
  variant: 'primary' | 'secondary';
  excludeFAUs?: string[];
  error?: string;
}

export default function FAUSelector({
  value = [],
  onChange,
  variant,
  excludeFAUs = [],
  error,
}: FAUSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const options = useMemo(
    () =>
      Object.keys(FAU_DISPLAY_NAMES).map((fau) => ({
        value: fau,
        label: FAU_DISPLAY_NAMES[fau] || fau,
        disabled: excludeFAUs.includes(fau),
        disabledReason: excludeFAUs.includes(fau) ? 'primary' : undefined,
      })),
    [excludeFAUs],
  );

  const displayText = (() => {
    if (value.length === 0) {
      return variant === 'primary'
        ? 'Select primary muscle group...'
        : 'Select secondary muscle groups...';
    }
    if (value.length === 1) return FAU_DISPLAY_NAMES[value[0]] || value[0];
    if (value.length === 2) {
      return `${FAU_DISPLAY_NAMES[value[0]] || value[0]}, ${FAU_DISPLAY_NAMES[value[1]] || value[1]}`;
    }
    return `${value.length} muscle groups selected`;
  })();

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
      {variant === 'primary' ? (
        <FilterChoiceSheet
          open={isOpen}
          onOpenChange={setIsOpen}
          title="Select primary muscle group"
          options={options}
          selected={value[0] ?? null}
          onSelect={(next) => onChange(next ? [next] : [])}
        />
      ) : (
        <FilterChoiceSheet
          open={isOpen}
          onOpenChange={setIsOpen}
          title="Select secondary muscle groups"
          options={options}
          multi
          selected={value}
          onSelect={(next) => onChange(next)}
        />
      )}
      {error && <p className="text-sm text-error font-medium">{error}</p>}
      {value.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {pluralize(value.length, `${variant} muscle group`)} selected
        </p>
      )}
    </div>
  );
}
