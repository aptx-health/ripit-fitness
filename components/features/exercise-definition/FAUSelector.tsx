'use client';

import { useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/radix/popover';
import { FAU_DISPLAY_NAMES } from '@/lib/fau-volume';

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

  const handleFAUClick = (fau: string) => {
    if (variant === 'primary') {
      // Single select for primary
      onChange([fau]);
      setIsOpen(false); // Close popover after selection
    } else {
      // Multi-select for secondary - keep popover open
      if (value.includes(fau)) {
        onChange(value.filter((f) => f !== fau));
      } else {
        onChange([...value, fau]);
      }
    }
  };

  const isSelected = (fau: string) => value.includes(fau);
  const isExcluded = (fau: string) => excludeFAUs.includes(fau);

  const allFAUs = Object.keys(FAU_DISPLAY_NAMES);

  const getDisplayText = () => {
    if (value.length === 0) {
      return variant === 'primary' ? 'Select primary muscle group...' : 'Select secondary muscle groups...';
    }
    if (value.length === 1) return FAU_DISPLAY_NAMES[value[0]];
    if (value.length === 2) {
      return `${FAU_DISPLAY_NAMES[value[0]]}, ${FAU_DISPLAY_NAMES[value[1]]}`;
    }
    return `${value.length} muscle groups selected`;
  };

  const renderFAUButton = (fau: string) => {
    const selected = isSelected(fau);
    const excluded = isExcluded(fau);

    return (
      <button
        key={fau}
        type="button"
        onClick={() => !excluded && handleFAUClick(fau)}
        disabled={excluded}
        className={`w-full px-3 py-2 text-sm border-2 transition-colors font-bold text-left ${
          excluded
            ? 'bg-muted/50 text-muted-foreground/50 border-border/50 cursor-not-allowed'
            : selected
            ? variant === 'primary'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-accent text-accent-foreground border-accent'
            : 'bg-muted text-foreground border-input hover:border-primary'
        }`}
      >
        <span className="flex items-center justify-between">
          {FAU_DISPLAY_NAMES[fau]}
          {selected && variant === 'secondary' && <span className="text-xs">✓</span>}
          {excluded && <span className="text-xs opacity-50">(primary)</span>}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`w-full px-4 py-2 border-2 hover:border-primary focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground text-left font-bold ${
              error ? 'border-error' : 'border-input'
            }`}
          >
            {getDisplayText()}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[600px] p-3" align="start">
          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
              {variant === 'primary' ? 'Select primary muscle group' : 'Select secondary muscle groups (optional)'}
            </div>
            <div className="grid grid-cols-3 gap-1 max-h-64 overflow-y-auto">
              {allFAUs.map((fau) => renderFAUButton(fau))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Error message */}
      {error && (
        <p className="text-sm text-error font-medium">{error}</p>
      )}

      {/* Selection count */}
      {value.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {value.length} {variant} muscle group{value.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
