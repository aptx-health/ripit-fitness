'use client';

import { useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/radix/popover';
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

  const selectEquipment = (equipment: string) => {
    onChange([equipment]);
    setIsOpen(false); // Close popover after selection
  };

  const isSelected = (equipment: string) => value.includes(equipment);

  const getDisplayText = () => {
    if (value.length === 0) return 'Select equipment...';
    return EQUIPMENT_LABELS[value[0]];
  };

  const renderEquipmentButton = (equipment: string) => {
    const selected = isSelected(equipment);

    return (
      <button
        key={equipment}
        type="button"
        onClick={() => selectEquipment(equipment)}
        className={`w-full px-3 py-2 text-sm border-2 transition-colors font-bold text-left ${
          selected
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-muted text-foreground border-input hover:border-primary'
        }`}
      >
        {EQUIPMENT_LABELS[equipment]}
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
        <PopoverContent className="w-[500px] p-3" align="start">
          <div className="space-y-3">
            {/* Common Equipment */}
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                Common Equipment
              </div>
              <div className="grid grid-cols-2 gap-1">
                {EQUIPMENT_GROUPS.common.map((equipment) => renderEquipmentButton(equipment))}
              </div>
            </div>

            {/* Specialized Equipment */}
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                Specialized Equipment
              </div>
              <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                {EQUIPMENT_GROUPS.specialized.map((equipment) => renderEquipmentButton(equipment))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Error message */}
      {error && (
        <p className="text-sm text-error font-medium">{error}</p>
      )}
    </div>
  );
}
