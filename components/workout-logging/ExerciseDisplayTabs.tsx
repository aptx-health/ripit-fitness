'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/radix/tabs'
import SetList from './SetList'
import { LoadingFrog } from '@/components/ui/loading-frog'
import type { LoggedSet } from '@/hooks/useWorkoutStorage'
import type { LoadState } from '@/hooks/useProgressiveExercises'

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
}: ExerciseDisplayTabsProps) {
  const loggedCount = loggedSets.length
  const totalCount = prescribedSets.length
  const hasNotes = !!(exercise.notes || exercise.exerciseDefinition?.instructions ||
    exercise.exerciseDefinition?.primaryFAUs?.length ||
    exercise.exerciseDefinition?.secondaryFAUs?.length ||
    exercise.exerciseDefinition?.equipment?.length)

  return (
    <Tabs defaultValue="log-sets" className="w-full h-full flex flex-col">
      <TabsList className="flex-shrink-0">
        <TabsTrigger value="log-sets">
          <span>Log Sets</span>
          {loggedCount > 0 && (
            <span className="ml-2 text-xs sm:text-sm px-2 py-0.5 rounded-full bg-success/20 text-success font-semibold">
              {loggedCount}/{totalCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="notes" className="relative">
          <span>Notes</span>
          {hasNotes && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
          )}
        </TabsTrigger>
        <TabsTrigger value="history" className="relative">
          <span>History</span>
          {hasHistoryIndicator && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="log-sets" className="flex-1 overflow-y-auto px-4 flex flex-col gap-3">
        <SetList
          prescribedSets={prescribedSets}
          loggedSets={loggedSets}
          exerciseHistory={null}
          onDeleteSet={onDeleteSet}
        />
        {loggingForm}
      </TabsContent>

      <TabsContent value="notes" className="flex-1 overflow-y-auto px-4">
        {hasNotes ? (
          <div className="space-y-6">
            {exercise.exerciseDefinition?.instructions && (
              <div>
                <h4 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Instructions</h4>
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
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
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {exercise.notes && (
              <div>
                <h4 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Notes</h4>
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                  {exercise.notes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full py-12">
            <p className="text-base sm:text-lg text-muted-foreground">No notes available for this exercise</p>
          </div>
        )}
      </TabsContent>

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
    </Tabs>
  )
}
