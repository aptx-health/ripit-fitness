'use client'

import {
  PATTERN_PREFERENCES,
  type PatternPreference,
  PREFERRED_DAYS,
  type PreferredDay,
} from '@/lib/user-training-profile'
import { PATTERN_PREFERENCE_LABELS, PREFERRED_DAY_LABELS } from '../constants'
import { PillToggle, SectionLabel, SelectCard } from '../shared'
import type { WizardAnswers } from '../types'

const SESSION_OPTIONS = [2, 3, 4, 5, 6]
const MINUTE_OPTIONS = [30, 45, 60, 75, 90]

export function RhythmStep({
  answers,
  patchLocal,
}: {
  answers: WizardAnswers
  patchLocal: (partial: Partial<WizardAnswers>) => void
}) {
  const setSessions = (n: number) => {
    patchLocal({
      targetSessionsPerWeek: answers.targetSessionsPerWeek === n ? null : n,
    })
  }

  const setMinutes = (n: number) => {
    patchLocal({
      targetMinutesPerSession: answers.targetMinutesPerSession === n ? null : n,
    })
  }

  const setPattern = (pattern: PatternPreference) => {
    patchLocal({
      patternPreference: answers.patternPreference === pattern ? null : pattern,
    })
  }

  const toggleDay = (day: PreferredDay) => {
    const selected = answers.preferredDays.includes(day)
    patchLocal({
      preferredDays: selected
        ? answers.preferredDays.filter((d) => d !== day)
        : [...answers.preferredDays, day],
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>Days per week</SectionLabel>
        <div className="flex gap-2">
          {SESSION_OPTIONS.map((n) => (
            <PillToggle
              key={n}
              label={String(n)}
              isSelected={answers.targetSessionsPerWeek === n}
              onClick={() => setSessions(n)}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Time per session</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {MINUTE_OPTIONS.map((n) => (
            <PillToggle
              key={n}
              label={`${n} min`}
              isSelected={answers.targetMinutesPerSession === n}
              onClick={() => setMinutes(n)}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>How to split it up</SectionLabel>
        <div className="flex flex-col gap-3">
          {PATTERN_PREFERENCES.map((pattern) => {
            const meta = PATTERN_PREFERENCE_LABELS[pattern]
            return (
              <SelectCard
                key={pattern}
                label={meta.label}
                description={meta.description}
                isSelected={answers.patternPreference === pattern}
                onClick={() => setPattern(pattern)}
              />
            )
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Preferred days (optional)</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {PREFERRED_DAYS.map((day) => (
            <PillToggle
              key={day}
              label={PREFERRED_DAY_LABELS[day]}
              isSelected={answers.preferredDays.includes(day)}
              onClick={() => toggleDay(day)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
