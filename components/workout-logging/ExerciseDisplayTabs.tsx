'use client'

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
        <TabsTrigger value="log-sets">
          <span>Log Sets</span>
        </TabsTrigger>
        <TabsTrigger value="info">
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
    </Tabs>
  )
}
