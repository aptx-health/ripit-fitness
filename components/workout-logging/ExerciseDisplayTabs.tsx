'use client'

import Image from 'next/image'
import { useState } from 'react'
import { LoadingFrog } from '@/components/ui/loading-frog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/radix/tabs'
import type { LoadState } from '@/hooks/useProgressiveExercises'
import type { LoggedSet } from '@/types/workout'
import { EQUIPMENT_LABELS } from '@/lib/constants/program-metadata'
import SetList from './SetList'

interface PrescribedSet {
  id: string
  setNumber: number
  reps: string
  weight: string | null
  rpe: number | null
  rir: number | null
}

interface Exercise {
  id: string
  name: string
  notes: string | null
  exerciseDefinition?: {
    primaryFAUs: string[]
    secondaryFAUs: string[]
    equipment: string[]
    instructions?: string
    imageUrls?: string[]
  }
}

interface ExerciseHistorySet {
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
}

interface ExerciseHistory {
  completedAt: Date
  workoutName: string
  sets: ExerciseHistorySet[]
}

interface ExerciseDisplayTabsProps {
  exercise: Exercise
  prescribedSets: PrescribedSet[]
  loggedSets: LoggedSet[]
  exerciseHistory: ExerciseHistory | null
  historyState?: LoadState
  hasHistoryIndicator?: boolean // Pre-computed indicator for dot (updates reactively)
  onDeleteSet: (setNumber: number) => void
  loggingForm: React.ReactNode
  isInputExpanded?: boolean
}

const FAU_DISPLAY_NAMES: Record<string, string> = {
  chest: 'Chest',
  'mid-back': 'Mid Back',
  'lower-back': 'Lower Back',
  'front-delts': 'Front Delts',
  'side-delts': 'Side Delts',
  'rear-delts': 'Rear Delts',
  lats: 'Lats',
  traps: 'Traps',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quads',
  adductors: 'Adductors',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs',
  obliques: 'Obliques',
}

// Loading skeleton for history tab
function HistoryLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <LoadingFrog size={48} speed={0.8} />
      <p className="mt-4 text-muted-foreground uppercase tracking-wider font-bold animate-pulse">
        Loading history...
      </p>
    </div>
  )
}

export default function ExerciseDisplayTabs({
  exercise,
  prescribedSets,
  loggedSets,
  exerciseHistory,
  historyState = 'loaded',
  hasHistoryIndicator = false,
  onDeleteSet,
  loggingForm,
  isInputExpanded = false,
}: ExerciseDisplayTabsProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const loggedCount = loggedSets.length
  const totalCount = prescribedSets.length
  const hasNotes = !!exercise.notes

  return (
    <Tabs defaultValue="log-sets" className="w-full h-full flex flex-col">
      <TabsList className="flex-shrink-0 sticky top-0 z-10 overflow-hidden">
        <TabsTrigger value="log-sets">
          <span>Log Sets</span>
        </TabsTrigger>
        <TabsTrigger value="info">
          <span>Info</span>
        </TabsTrigger>
        {hasNotes && (
          <TabsTrigger value="notes" className="relative">
            <span>Notes</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
          </TabsTrigger>
        )}
        <TabsTrigger value="history" className="relative">
          <span>History</span>
          {hasHistoryIndicator && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="log-sets" className="flex-1 overflow-y-auto px-4 flex flex-col gap-2">
        {loggingForm}
        {!isInputExpanded && (
          <SetList
            prescribedSets={prescribedSets}
            loggedSets={loggedSets}
            exerciseHistory={null}
            onDeleteSet={onDeleteSet}
          />
        )}
      </TabsContent>

      <TabsContent value="info" className="flex-1 overflow-y-auto px-4">
        <div className="space-y-6">
          {exercise.exerciseDefinition?.imageUrls && exercise.exerciseDefinition.imageUrls.length > 0 && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                {exercise.exerciseDefinition.imageUrls.map((url, i) => {
                  const src = url.startsWith('http') ? url : `https://cdn.ripit.fit/exercise-images/${url}`
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setExpandedImage(src)}
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                    >
                      <Image
                        src={src}
                        alt={`${exercise.name} - ${i === 0 ? 'start' : 'end'} position`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 45vw, 300px"
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {exercise.exerciseDefinition?.instructions && (
            <div>
              <h4 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Instructions</h4>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed whitespace-pre-line">
                {exercise.exerciseDefinition.instructions}
              </p>
            </div>
          )}

          {exercise.exerciseDefinition?.primaryFAUs && exercise.exerciseDefinition.primaryFAUs.length > 0 && (
            <div>
              <h4 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Primary Muscles</h4>
              <div className="flex flex-wrap gap-2">
                {exercise.exerciseDefinition.primaryFAUs.map((fau) => (
                  <span
                    key={fau}
                    className="px-3 py-1.5 text-base sm:text-lg font-medium bg-primary/20 text-primary rounded-full"
                  >
                    {FAU_DISPLAY_NAMES[fau] || fau}
                  </span>
                ))}
              </div>
            </div>
          )}

          {exercise.exerciseDefinition?.secondaryFAUs && exercise.exerciseDefinition.secondaryFAUs.length > 0 && (
            <div>
              <h4 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Secondary Muscles</h4>
              <div className="flex flex-wrap gap-2">
                {exercise.exerciseDefinition.secondaryFAUs.map((fau) => (
                  <span
                    key={fau}
                    className="px-3 py-1.5 text-base sm:text-lg font-medium bg-muted text-foreground rounded-full"
                  >
                    {FAU_DISPLAY_NAMES[fau] || fau}
                  </span>
                ))}
              </div>
            </div>
          )}

          {exercise.exerciseDefinition?.equipment && exercise.exerciseDefinition.equipment.length > 0 && (
            <div>
              <h4 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Equipment</h4>
              <div className="flex flex-wrap gap-2">
                {exercise.exerciseDefinition.equipment.map((item) => (
                  <span
                    key={item}
                    className="px-3 py-1.5 text-base sm:text-lg font-medium bg-muted text-foreground rounded-full border border-border"
                  >
                    {EQUIPMENT_LABELS[item] || item.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!exercise.exerciseDefinition?.imageUrls?.length &&
            !exercise.exerciseDefinition?.instructions &&
            !exercise.exerciseDefinition?.primaryFAUs?.length &&
            !exercise.exerciseDefinition?.secondaryFAUs?.length &&
            !exercise.exerciseDefinition?.equipment?.length && (
            <div className="flex items-center justify-center h-full py-12">
              <p className="text-base sm:text-lg text-muted-foreground">No info available for this exercise</p>
            </div>
          )}
        </div>
      </TabsContent>

      {hasNotes && (
        <TabsContent value="notes" className="flex-1 overflow-y-auto px-4">
          <div className="space-y-6">
            <div>
              <h4 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Notes</h4>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                {exercise.notes}
              </p>
            </div>
          </div>
        </TabsContent>
      )}

      <TabsContent value="history" className="flex-1 overflow-y-auto px-4">
        {historyState === 'loading' || historyState === 'pending' ? (
          <HistoryLoadingSkeleton />
        ) : historyState === 'error' ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <p className="text-base sm:text-lg text-error">Failed to load history</p>
          </div>
        ) : exerciseHistory ? (
          <div className="space-y-6">
            <div>
              <h4 className="text-base sm:text-lg font-semibold text-foreground mb-2">Last Performed</h4>
              <p className="text-base sm:text-lg text-muted-foreground">
                {new Date(exerciseHistory.completedAt).toLocaleDateString()} -{' '}
                {exerciseHistory.workoutName}
              </p>
            </div>

            <div>
              <h4 className="text-base sm:text-lg font-semibold text-foreground mb-3">Sets Completed</h4>
              <div className="space-y-1.5">
                {exerciseHistory.sets.map((set) => (
                  <div
                    key={set.setNumber}
                    className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-base sm:text-lg"
                  >
                    <span className="font-semibold text-muted-foreground">Set {set.setNumber}:</span>
                    <span className="font-semibold text-foreground">{set.reps} reps @ {set.weight}{set.weightUnit}</span>
                    {set.rpe !== null && (
                      <span className="text-muted-foreground">• RPE {set.rpe}</span>
                    )}
                    {set.rir !== null && (
                      <span className="text-muted-foreground">• RIR {set.rir}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full py-12">
            <p className="text-base sm:text-lg text-muted-foreground">No history available for this exercise</p>
          </div>
        )}
      </TabsContent>

      {expandedImage && (
        <div
          role="button"
          tabIndex={0}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          onClick={() => setExpandedImage(null)}
          onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') setExpandedImage(null) }}
        >
          <div className="relative w-[90vw] max-w-lg aspect-square">
            <Image
              src={expandedImage}
              alt={exercise.name}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
        </div>
      )}
    </Tabs>
  )
}
