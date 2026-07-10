'use client'

import {
  INJURY_AREAS,
  INJURY_SEVERITIES,
  type InjuryArea,
  type InjurySeverity,
} from '@/lib/user-training-profile'
import { INJURY_AREA_LABELS, INJURY_SEVERITY_LABELS } from '../constants'
import { SectionLabel, SelectCard } from '../shared'
import type { WizardAnswers } from '../types'

const DEFAULT_SEVERITY: InjurySeverity = 'caution'

export function InjuriesStep({
  answers,
  patchLocal,
}: {
  answers: WizardAnswers
  patchLocal: (partial: Partial<WizardAnswers>) => void
}) {
  const toggleArea = (area: InjuryArea) => {
    const existing = answers.injuryAreas.find((i) => i.area === area)
    if (existing) {
      patchLocal({
        injuryAreas: answers.injuryAreas.filter((i) => i.area !== area),
      })
    } else {
      patchLocal({
        injuryAreas: [
          ...answers.injuryAreas,
          { area, severity: DEFAULT_SEVERITY },
        ],
      })
    }
  }

  const setSeverity = (area: InjuryArea, severity: InjurySeverity) => {
    patchLocal({
      injuryAreas: answers.injuryAreas.map((i) =>
        i.area === area ? { ...i, severity } : i
      ),
    })
  }

  return (
    <div>
      <SectionLabel>Where does it bother you?</SectionLabel>
      <div className="flex flex-col gap-3">
        {INJURY_AREAS.map((area) => {
          const entry = answers.injuryAreas.find((i) => i.area === area)
          return (
            <div key={area}>
              <SelectCard
                label={INJURY_AREA_LABELS[area]}
                isSelected={!!entry}
                onClick={() => toggleArea(area)}
              />
              {entry && (
                <div className="mt-3 flex flex-col gap-2">
                  {INJURY_SEVERITIES.map((severity) => {
                    const meta = INJURY_SEVERITY_LABELS[severity]
                    const active = entry.severity === severity
                    return (
                      <button
                        key={severity}
                        type="button"
                        onClick={() => setSeverity(area, severity)}
                        aria-pressed={active}
                        className={`w-full min-h-12 px-4 py-2 text-left border transition-colors ${
                          active
                            ? 'bg-success/10 border-success'
                            : 'bg-card border-border hover:border-muted-foreground/40'
                        }`}
                      >
                        <span className="block text-sm font-medium text-foreground">
                          {meta.label}
                        </span>
                        <span className="block text-sm text-muted-foreground">
                          {meta.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
