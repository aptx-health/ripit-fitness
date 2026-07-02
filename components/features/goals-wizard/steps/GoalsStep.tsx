'use client'

import {
  GOAL_CATEGORIES,
  type GoalCategory,
  INTENSITY_PREFERENCES,
  type IntensityPreference,
  OTHER_ACTIVITIES,
  type OtherActivity,
} from '@/lib/user-training-profile'
import {
  GOAL_CATEGORY_LABELS,
  OTHER_ACTIVITY_LABELS,
} from '../constants'
import { ImportancePicker, SectionLabel, SelectCard } from '../shared'
import type { WizardAnswers } from '../types'

const DEFAULT_IMPORTANCE = 3

const INTENSITY_OPTIONS: Record<
  IntensityPreference,
  { label: string; description: string }
> = {
  hypertrophy: { label: 'Muscle & size', description: 'More reps, moderate weight' },
  strength: { label: 'Strength', description: 'Heavier weight, fewer reps' },
  balanced: { label: 'A bit of both', description: 'Mix strength and size' },
}

export function GoalsStep({
  answers,
  patchLocal,
}: {
  answers: WizardAnswers
  patchLocal: (partial: Partial<WizardAnswers>) => void
}) {
  const toggleGoal = (category: GoalCategory) => {
    const existing = answers.goalCategories.find((g) => g.category === category)
    if (existing) {
      patchLocal({
        goalCategories: answers.goalCategories.filter(
          (g) => g.category !== category
        ),
      })
    } else {
      patchLocal({
        goalCategories: [
          ...answers.goalCategories,
          { category, importance: DEFAULT_IMPORTANCE },
        ],
      })
    }
  }

  const setGoalImportance = (category: GoalCategory, importance: number) => {
    patchLocal({
      goalCategories: answers.goalCategories.map((g) =>
        g.category === category ? { ...g, importance } : g
      ),
    })
  }

  const toggleActivity = (activity: OtherActivity) => {
    const existing = answers.otherActivities.find((a) => a.activity === activity)
    if (existing) {
      patchLocal({
        otherActivities: answers.otherActivities.filter(
          (a) => a.activity !== activity
        ),
      })
    } else {
      patchLocal({
        otherActivities: [
          ...answers.otherActivities,
          { activity, importance: DEFAULT_IMPORTANCE },
        ],
      })
    }
  }

  const setActivityImportance = (activity: OtherActivity, importance: number) => {
    patchLocal({
      otherActivities: answers.otherActivities.map((a) =>
        a.activity === activity ? { ...a, importance } : a
      ),
    })
  }

  const setIntensity = (pref: IntensityPreference) => {
    patchLocal({
      defaultIntensityPreference:
        answers.defaultIntensityPreference === pref ? null : pref,
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>My goals</SectionLabel>
        <div className="flex flex-col gap-3">
          {GOAL_CATEGORIES.map((category) => {
            const entry = answers.goalCategories.find(
              (g) => g.category === category
            )
            const meta = GOAL_CATEGORY_LABELS[category]
            return (
              <div key={category}>
                <SelectCard
                  label={meta.label}
                  description={meta.description}
                  isSelected={!!entry}
                  onClick={() => toggleGoal(category)}
                />
                {entry && (
                  <ImportancePicker
                    value={entry.importance}
                    onChange={(n) => setGoalImportance(category, n)}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Other activities I do</SectionLabel>
        <p className="-mt-2 mb-3 text-sm text-muted-foreground">
          So we can leave you fresh for them.
        </p>
        <div className="flex flex-col gap-3">
          {OTHER_ACTIVITIES.map((activity) => {
            const entry = answers.otherActivities.find(
              (a) => a.activity === activity
            )
            return (
              <div key={activity}>
                <SelectCard
                  label={OTHER_ACTIVITY_LABELS[activity]}
                  isSelected={!!entry}
                  onClick={() => toggleActivity(activity)}
                />
                {entry && (
                  <ImportancePicker
                    value={entry.importance}
                    onChange={(n) => setActivityImportance(activity, n)}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Training style (optional)</SectionLabel>
        <div className="flex flex-col gap-3">
          {INTENSITY_PREFERENCES.map((pref) => (
            <SelectCard
              key={pref}
              label={INTENSITY_OPTIONS[pref].label}
              description={INTENSITY_OPTIONS[pref].description}
              isSelected={answers.defaultIntensityPreference === pref}
              onClick={() => setIntensity(pref)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
