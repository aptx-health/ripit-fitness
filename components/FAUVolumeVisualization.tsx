'use client'

import { useState } from 'react'
import { calculateWeekFAUVolume, getSortedFAUVolumes, FAU_DISPLAY_NAMES } from '@/lib/fau-volume'

type Week = {
  id: string
  weekNumber: number
  workouts: Array<{
    id: string
    exercises: Array<{
      id: string
      prescribedSets: Array<{ id: string }>
      exerciseDefinition: {
        id: string
        primaryFAUs: string[]
        secondaryFAUs: string[]
      }
    }>
  }>
}

type FAUVolumeVisualizationProps = {
  week: Week | null
}

export default function FAUVolumeVisualization({ week }: FAUVolumeVisualizationProps) {
  const [includeSecondary, setIncludeSecondary] = useState(false)
  const [secondaryWeight, setSecondaryWeight] = useState(0.5)

  // If no week, show empty state
  if (!week) {
    return (
      <div className="bg-card rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-4">Muscle Group Balance</h3>
        <div className="text-muted-foreground text-sm">
          Add exercises to see volume distribution across muscle groups
        </div>
      </div>
    )
  }

  const volume = calculateWeekFAUVolume(week, { includeSecondary, secondaryWeight })
  const sortedVolumes = getSortedFAUVolumes(volume)
  const maxVolume = sortedVolumes.length > 0 ? sortedVolumes[0].volume : 0

  return (
    <div className="bg-card rounded-lg p-6">
      <h3 className="font-semibold text-foreground mb-4">
        Muscle Group Balance
        <span className="text-sm font-normal text-muted-foreground ml-2">
          Week {week.weekNumber}
        </span>
      </h3>

      {/* Secondary Volume Controls */}
      <div className="mb-4 pb-4 border-b border-border space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeSecondary}
            onChange={(e) => setIncludeSecondary(e.target.checked)}
            className="rounded border-input"
          />
          <span className="text-sm text-foreground">Include Secondary Volume</span>
        </label>

        {includeSecondary && (
          <div className="pl-6 space-y-2">
            <label className="text-xs text-muted-foreground">
              Secondary Weight: {secondaryWeight.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={secondaryWeight}
              onChange={(e) => setSecondaryWeight(parseFloat(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.1</span>
              <span>1.0</span>
            </div>
          </div>
        )}
      </div>

      {/* Volume Bars */}
      {sortedVolumes.length === 0 ? (
        <div className="text-muted-foreground text-sm">
          No exercises in this week yet
        </div>
      ) : (
        <div className="space-y-3">
          {sortedVolumes.map(({ fau, volume: vol }) => {
            const percentage = maxVolume > 0 ? (vol / maxVolume) * 100 : 0
            const displayName = FAU_DISPLAY_NAMES[fau] || fau

            return (
              <div key={fau}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {displayName}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {vol % 1 === 0 ? vol : vol.toFixed(1)} sets
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
