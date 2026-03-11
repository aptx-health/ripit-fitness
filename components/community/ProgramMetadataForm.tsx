'use client';

import { Check, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/radix/popover';
import {
  COMMON_EQUIPMENT,
  EQUIPMENT_LABELS,
  FITNESS_LEVELS,
  GOAL_LABELS,
  LEVEL_DESCRIPTIONS,
  LEVEL_LABELS,
  PROGRAM_GOALS,
  type ProgramMetadata,
  SPECIALIZED_EQUIPMENT,
} from '@/lib/constants/program-metadata';

type ProgramMetadataFormProps = {
  metadata: ProgramMetadata;
  onChange: (metadata: ProgramMetadata) => void;
  weekCount?: number;
};

export default function ProgramMetadataForm({
  metadata,
  onChange,
  weekCount,
}: ProgramMetadataFormProps) {
  const [levelPopoverOpen, setLevelPopoverOpen] = useState(false);
  const [equipmentPopoverOpen, setEquipmentPopoverOpen] = useState(false);

  const handleGoalToggle = (goal: string) => {
    const newGoals = metadata.goals.includes(goal)
      ? metadata.goals.filter((g) => g !== goal)
      : [...metadata.goals, goal];
    onChange({ ...metadata, goals: newGoals });
  };

  const handleEquipmentToggle = (eq: string) => {
    const newEquipment = metadata.equipmentNeeded.includes(eq)
      ? metadata.equipmentNeeded.filter((e) => e !== eq)
      : [...metadata.equipmentNeeded, eq];
    onChange({ ...metadata, equipmentNeeded: newEquipment });
  };

  return (
    <div className="space-y-6">
      {/* Fitness Level - REQUIRED */}
      <div>
        <span id="fitness-level-label" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Fitness Level <span className="text-error">*</span>
        </span>
        <Popover open={levelPopoverOpen} onOpenChange={setLevelPopoverOpen}>
          <PopoverTrigger asChild>
            <button type="button" aria-labelledby="fitness-level-label" className="w-full px-4 py-2 border-2 border-border text-foreground hover:border-primary transition-colors uppercase tracking-wider font-semibold doom-focus-ring flex items-center justify-between text-sm">
              {metadata.level ? LEVEL_LABELS[metadata.level] : 'SELECT LEVEL'}
              <ChevronDown size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <div className="space-y-1">
              {Object.values(FITNESS_LEVELS).map((level) => (
                <button type="button"
                  key={level}
                  onClick={() => {
                    onChange({ ...metadata, level: level });
                    setLevelPopoverOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-primary/10 transition-colors doom-focus-ring flex items-start justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-wider">
                      {LEVEL_LABELS[level]}
                    </div>
                    <div className="text-xs text-muted-foreground normal-case mt-0.5">
                      {LEVEL_DESCRIPTIONS[level]}
                    </div>
                  </div>
                  {metadata.level === level && <Check size={16} className="text-primary mt-0.5 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Training Goals - REQUIRED */}
      <div>
        <span id="training-goals-label" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Training Goals <span className="text-error">*</span>
          <span className="text-xs font-normal normal-case ml-2 text-muted-foreground/70">
            (Select at least one)
          </span>
        </span>
        <fieldset className="grid grid-cols-2 gap-2" aria-labelledby="training-goals-label">
          {Object.values(PROGRAM_GOALS).map((goal) => (
            <label
              key={goal}
              className="flex items-center gap-2 p-2 border-2 border-border bg-input hover:border-primary/50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={metadata.goals.includes(goal)}
                onChange={() => handleGoalToggle(goal)}
                className="w-4 h-4 border-2 border-border bg-background checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm font-medium text-foreground uppercase tracking-wide">
                {GOAL_LABELS[goal]}
              </span>
            </label>
          ))}
        </fieldset>
      </div>

      {/* Equipment Needed - OPTIONAL */}
      <div>
        <span id="equipment-needed-label" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Equipment Needed <span className="text-xs font-normal normal-case">(Optional)</span>
        </span>
        <div className="flex gap-2 items-center">
          <Popover open={equipmentPopoverOpen} onOpenChange={setEquipmentPopoverOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="flex-1 px-4 py-2 border-2 border-border text-foreground hover:border-primary transition-colors uppercase tracking-wider font-semibold doom-focus-ring flex items-center justify-between text-sm">
                {metadata.equipmentNeeded.length > 0
                  ? `${metadata.equipmentNeeded.length} selected`
                  : 'None selected'}
                <ChevronDown size={16} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-72 p-0 max-h-[400px] overflow-hidden flex flex-col"
              align="start"
            >
              <div className="overflow-y-auto flex-1">
                <div className="p-2 space-y-1">
                  {/* Common Equipment Section */}
                  <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider sticky top-0 bg-card z-10">
                    Common
                  </div>
                  {Object.values(COMMON_EQUIPMENT).map((eq) => (
                    <label
                      key={eq}
                      className="flex items-center gap-2 p-2 hover:bg-primary/10 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={metadata.equipmentNeeded.includes(eq)}
                        onChange={() => handleEquipmentToggle(eq)}
                        className="w-4 h-4 border-2 border-border bg-background checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary flex-shrink-0"
                      />
                      <span className="text-sm font-medium text-foreground uppercase tracking-wide">
                        {EQUIPMENT_LABELS[eq]}
                      </span>
                    </label>
                  ))}

                  {/* Specialized Equipment Section */}
                  <div className="px-2 py-1 mt-2 text-xs font-bold text-muted-foreground uppercase tracking-wider sticky top-0 bg-card z-10">
                    Specialized
                  </div>
                  {Object.values(SPECIALIZED_EQUIPMENT).map((eq) => (
                    <label
                      key={eq}
                      className="flex items-center gap-2 p-2 hover:bg-primary/10 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={metadata.equipmentNeeded.includes(eq)}
                        onChange={() => handleEquipmentToggle(eq)}
                        className="w-4 h-4 border-2 border-border bg-background checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary flex-shrink-0"
                      />
                      <span className="text-sm font-medium text-foreground uppercase tracking-wide">
                        {EQUIPMENT_LABELS[eq]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {metadata.equipmentNeeded.length > 0 && (
            <button type="button"
              onClick={() => onChange({ ...metadata, equipmentNeeded: [] })}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider flex items-center gap-1 doom-focus-ring"
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Target Days Per Week - OPTIONAL */}
      <div>
        <label htmlFor="target-days-per-week" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Target Days Per Week <span className="text-xs font-normal normal-case">(Optional)</span>
        </label>
        <input
          id="target-days-per-week"
          type="number"
          min="1"
          max="7"
          value={metadata.targetDaysPerWeek || ''}
          onChange={(e) =>
            onChange({
              ...metadata,
              targetDaysPerWeek: e.target.value ? parseInt(e.target.value, 10) : null,
            })
          }
          placeholder="e.g., 4"
          className="w-full px-3 py-2 border-2 border-border bg-input text-foreground text-sm focus:ring-2 focus:ring-primary focus:border-primary doom-focus-ring"
        />
        <p className="text-xs text-muted-foreground mt-1 normal-case">
          How many days per week should this program be followed?
        </p>
      </div>

      {/* Duration Display - OPTIONAL */}
      <div>
        <label htmlFor="duration-display" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Duration Display <span className="text-xs font-normal normal-case">(Optional)</span>
        </label>
        <input
          id="duration-display"
          type="text"
          value={metadata.durationDisplay || ''}
          onChange={(e) =>
            onChange({ ...metadata, durationDisplay: e.target.value })
          }
          placeholder={weekCount ? `${weekCount} weeks` : 'e.g., 12 weeks'}
          className="w-full px-3 py-2 border-2 border-border bg-input text-foreground text-sm focus:ring-2 focus:ring-primary focus:border-primary doom-focus-ring"
        />
        <p className="text-xs text-muted-foreground mt-1 normal-case">
          Override the default duration text (e.g., &quot;8-12 weeks&quot;, &quot;Until competition&quot;)
        </p>
      </div>
    </div>
  );
}
