'use client'

import Image from 'next/image'
import { useState } from 'react'
import { LoadingFrog } from '@/components/ui/loading-frog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/radix/tabs'
import type { LoadState } from '@/hooks/useProgressiveExercises'
import { EQUIPMENT_LABELS } from '@/lib/constants/program-metadata'
import type { LoggedSet } from '@/types/workout'
import RestStopwatch from './RestStopwatch'
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
  const hasNotes = !!exercise.notes

  return (
    <Tabs defaultValue="log-sets" className="w-full h-full flex flex-col">
      <TabsList className="flex-shrink-0 sticky top-0 z-10 overflow-hidden">
        <TabsTrigger value="log-sets">
          <span>Log Sets</span>
        </TabsTrigger>
        <TabsTrigger value="info" data-tour="info-tab">
          <span>Info</span>
        </TabsTrigger>
        {hasNotes && (
          <TabsTrigger value="notes" className="relative">
            <span>Notes</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary"></span>
          </TabsTrigger>
        )}
        <TabsTrigger value="history" className="relative">
          <span>History</span>
          {hasHistoryIndicator && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary"></span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="log-sets" className="flex-1 overflow-y-auto px-4 flex flex-col gap-2">
        {loggingForm}
        {!isInputExpanded && (
          <>
            <SetList
              prescribedSets={prescribedSets}
              loggedSets={loggedSets}
              exerciseHistory={null}
              onDeleteSet={onDeleteSet}
              exerciseId={exercise.id}
            />
            <RestStopwatch
              loggedSetCount={loggedSets.length}
              prescribedSetCount={prescribedSets.length}
              exerciseId={exercise.id}
            />
          </>
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
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">INSTRUCTIONS</h4>
              <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                {exercise.exerciseDefinition.instructions}
              </p>
            </div>
          )}

          {exercise.exerciseDefinition?.primaryFAUs && exercise.exerciseDefinition.primaryFAUs.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">PRIMARY MUSCLES</h4>
              <div className="flex flex-wrap gap-1.5">
                {exercise.exerciseDefinition.primaryFAUs.map((fau) => (
                  <span
                    key={fau}
                    className="px-2.5 py-1 text-sm font-bold uppercase tracking-wider border-2 border-primary text-primary bg-primary/10"
                  >
                    {FAU_DISPLAY_NAMES[fau] || fau}
                  </span>
                ))}
              </div>
            </div>
          )}

          {exercise.exerciseDefinition?.secondaryFAUs && exercise.exerciseDefinition.secondaryFAUs.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">SECONDARY MUSCLES</h4>
              <div className="flex flex-wrap gap-1.5">
                {exercise.exerciseDefinition.secondaryFAUs.map((fau) => (
                  <span
                    key={fau}
                    className="px-2.5 py-1 text-sm font-bold uppercase tracking-wider border border-border text-foreground bg-muted/50"
                  >
                    {FAU_DISPLAY_NAMES[fau] || fau}
                  </span>
                ))}
              </div>
            </div>
          )}

          {exercise.exerciseDefinition?.equipment && exercise.exerciseDefinition.equipment.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">EQUIPMENT</h4>
              <div className="flex flex-wrap gap-1.5">
                {exercise.exerciseDefinition.equipment.map((item) => (
                  <span
                    key={item}
                    className="px-2.5 py-1 text-sm font-bold uppercase tracking-wider border border-border text-muted-foreground bg-card"
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
          <div className="space-y-4">
            {/* Last performed header */}
            <div className="border border-border border-l-4 border-l-success bg-card doom-noise p-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                LAST PERFORMED
              </p>
              <p className="text-base font-bold text-foreground doom-heading">
                {new Date(exerciseHistory.completedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <p className="text-sm text-muted-foreground">{exerciseHistory.workoutName}</p>
            </div>

            {/* Sets table */}
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                SETS COMPLETED
              </h4>
              <div className="border border-border divide-y divide-border bg-card doom-noise">
                {/* Header row */}
                <div className="flex items-center px-3 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <span className="w-10">#</span>
                  <span className="flex-1">WEIGHT</span>
                  <span className="w-16 text-right">REPS</span>
                  <span className="w-16 text-right">
                    {exerciseHistory.sets.some(s => s.rir !== null) ? 'RIR' : exerciseHistory.sets.some(s => s.rpe !== null) ? 'RPE' : ''}
                  </span>
                </div>
                {exerciseHistory.sets.map((set) => (
                  <div
                    key={set.setNumber}
                    className="flex items-center px-3 py-2.5 text-base"
                  >
                    <span className="w-10 font-bold text-muted-foreground">{set.setNumber}</span>
                    <span className="flex-1 font-bold text-foreground">{set.weight}{set.weightUnit}</span>
                    <span className="w-16 text-right font-semibold text-foreground">{set.reps}</span>
                    <span className="w-16 text-right text-muted-foreground">
                      {set.rir !== null ? set.rir : set.rpe !== null ? set.rpe : ''}
                    </span>
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
