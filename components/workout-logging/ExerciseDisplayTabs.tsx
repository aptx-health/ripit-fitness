'use client'

import { Check, Sparkles } from 'lucide-react'
import { LoadingFrog } from '@/components/ui/loading-frog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/radix/tabs'
import type { LoadState } from '@/hooks/useProgressiveExercises'
import type { LoggedSet } from '@/types/workout'
import BeginnerTipCard from './BeginnerTipCard'
import ExerciseInfoContent from './ExerciseInfoContent'
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
  showIntensity?: boolean
  tip?: string
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
  showIntensity = true,
  tip,
}: ExerciseDisplayTabsProps) {
  const hasNotes = !!exercise.notes

  return (
    <Tabs defaultValue="log-sets" className="w-full h-full flex flex-col">
      <TabsList className="flex-shrink-0 sticky top-0 z-10 overflow-hidden">
        <TabsTrigger value="log-sets" className="flex-1">
          <span>Log Sets</span>
        </TabsTrigger>
        <TabsTrigger value="info" className="flex-1">
          <span>Info</span>
        </TabsTrigger>
        {hasNotes && (
          <TabsTrigger value="notes" className="relative flex-1">
            <span>Notes</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary"></span>
          </TabsTrigger>
        )}
        <TabsTrigger value="history" className="relative flex-1">
          <span>History</span>
          {hasHistoryIndicator && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary"></span>
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
              showIntensity={showIntensity}
            />
            {tip && <BeginnerTipCard tip={tip} />}
          </>
        )}
      </TabsContent>

      <TabsContent value="info" className="flex-1 overflow-y-auto px-4">
        <ExerciseInfoContent
          exerciseName={exercise.name}
          exerciseDefinition={exercise.exerciseDefinition}
        />
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
        ) : !exerciseHistory ? (
          <div className="flex items-center justify-center h-full py-12">
            <div
              role="note"
              className="flex items-start gap-2.5 p-3.5 border border-dashed border-border/40 bg-muted/35"
            >
              <Sparkles
                aria-hidden="true"
                size={18}
                className="shrink-0 mt-[5px] text-muted-foreground"
                strokeWidth={1.8}
              />
              <span className="text-lg leading-relaxed text-muted-foreground">
                First time doing this one. Log a set and your history starts here.
              </span>
            </div>
          </div>
        ) : (
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

            {/* Sets completed — matching logged set row format */}
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                SETS COMPLETED
              </h4>
              <div className="divide-y divide-border/30">
                {exerciseHistory.sets.map((set) => {
                  const weight = set.weight === 0 ? 'Bodyweight' : `${set.weight} ${set.weightUnit}`
                  const intensity = set.rir !== null ? `RIR ${set.rir}` : set.rpe !== null ? `RPE ${set.rpe}` : null
                  return (
                    <div key={set.setNumber} className="px-2 py-2">
                      <div className="flex items-start gap-2">
                        <Check size={16} className="text-success flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Set {set.setNumber}
                          </span>
                          <span className="block text-base font-bold text-foreground">
                            {weight} &times; {set.reps}
                            {intensity ? ` \u00b7 ${intensity}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
