'use client'

import { History, Info, ListChecks, Sparkles, StickyNote } from 'lucide-react'
import { useState } from 'react'
import { LoadingFrog } from '@/components/ui/loading-frog'
import type { MessageData } from '@/components/ui/MessageCard'
import { MessageCard } from '@/components/ui/MessageCard'
import PaperTabs, { type PaperTab } from '@/components/ui/PaperTabs'
import { TipAnnotation } from '@/components/ui/TipAnnotation'
import type { LoadState } from '@/hooks/useProgressiveExercises'
import { pluralize } from '@/lib/format/pluralize'
import type { ApplicableSet } from '@/lib/workout/prefill'
import type { LoggedSet } from '@/types/workout'
import DrawerContextBanner from './DrawerContextBanner'
import ExerciseHistoryPanel from './ExerciseHistoryPanel'
import ExerciseInfoContent from './ExerciseInfoContent'
import LastSessionReference from './LastSessionReference'
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
  exerciseGroup?: string | null
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
  isWarmup: boolean
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
  /** Recent sessions (newest first) for the multi-session History panel.
      Falls back to `[exerciseHistory]` when omitted. */
  sessions?: ExerciseHistory[]
  historyState?: LoadState
  /** No longer drawn (the History tab counts sessions); kept so callers need not change. */
  hasHistoryIndicator?: boolean
  onDeleteSet: (setNumber: number) => void
  /** Copy a set's numbers into the logging form (tap-to-prefill). */
  onApplySet?: (set: ApplicableSet) => void
  loggingForm: React.ReactNode
  isInputExpanded?: boolean
  showIntensity?: boolean
  message?: MessageData | null
  onMessageSeen?: (messageId: string) => void
  onMessageDismissed?: (messageId: string) => void
  /** 1-indexed set number the user is currently logging. */
  currentSetNumber: number
  /** Total prescribed sets for the current exercise. Omit when unknown (e.g. ad-hoc mode). */
  totalSets?: number
  /** Pre-formatted prescription summary for the current set. Omit to drop the line. */
  prescribedSummary?: string
  /** Exercise-scoped actions (edit / swap / delete) rendered as a gear menu
      next to the exercise name in the context banner. Omit to hide. */
  menuActions?: import('./ExerciseQuickActionsMenu').QuickAction[]
}

type TabId = 'log' | 'info' | 'notes' | 'history'

function ExerciseTabTitle({ exercise }: { exercise: Exercise }) {
  const supersetLabel = exercise.exerciseGroup ?? null
  return (
    <div className="pt-3 pb-2 mb-3 border-b border-border/60 -mx-4 px-4">
      {supersetLabel && (
        <span className="inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-accent border border-accent mb-1">
          Superset {supersetLabel}
        </span>
      )}
      <h2 className="text-xl font-bold uppercase tracking-wider text-foreground break-words">{exercise.name}</h2>
    </div>
  )
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
  sessions,
  historyState = 'loaded',
  onDeleteSet,
  onApplySet,
  loggingForm,
  isInputExpanded = false,
  showIntensity = true,
  message,
  onMessageSeen,
  onMessageDismissed,
  currentSetNumber,
  totalSets,
  prescribedSummary,
  menuActions,
}: ExerciseDisplayTabsProps) {
  const hasNotes = !!exercise.notes
  const [activeTab, setActiveTab] = useState<TabId>('log')

  // Prefer the full sessions list; fall back to the single last session so
  // callers that only wire `exerciseHistory` still render a one-session panel.
  const historySessions: ExerciseHistory[] =
    sessions ?? (exerciseHistory ? [exerciseHistory] : [])

  // When the exercise changes, reset to "log-sets" if the current tab is
  // unavailable on the new exercise (e.g. "notes" tab when there are no notes).
  // Adjusted during render, so there is no extra effect pass.
  if (activeTab === 'notes' && !hasNotes) {
    setActiveTab('log')
  }

  // Count chips, spoken: "1 note", "3 sessions" (none while history loads or when there is none).
  const historyCount = historyState === 'loaded' && historySessions.length > 0 ? historySessions.length : undefined
  const tabs: PaperTab[] = [
    { id: 'log', label: 'Log', icon: <ListChecks size={16} aria-hidden="true" /> },
    { id: 'info', label: 'Info', icon: <Info size={16} aria-hidden="true" /> },
    ...(hasNotes
      ? [{ id: 'notes', label: 'Notes', icon: <StickyNote size={16} aria-hidden="true" />, count: 1, countLabel: '1 note' }]
      : []),
    {
      id: 'history',
      label: 'History',
      icon: <History size={16} aria-hidden="true" />,
      count: historyCount,
      countLabel: historyCount ? pluralize(historyCount, 'session') : undefined,
    },
  ]
  const panel = (id: TabId) => ({
    role: 'tabpanel' as const,
    id: `exercise-panel-${id}`,
    'aria-labelledby': `exercise-tab-${id}`,
    hidden: activeTab !== id,
  })

  const historyBody =
    historyState === 'loading' || historyState === 'pending' ? (
      <HistoryLoadingSkeleton />
    ) : historyState === 'error' ? (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <p className="text-base sm:text-lg text-error">Failed to load history</p>
      </div>
    ) : historySessions.length === 0 ? (
      <div className="flex items-center justify-center h-full py-12">
        <TipAnnotation icon={<Sparkles aria-hidden="true" size={16} strokeWidth={1.8} />}>
          <span className="text-lg leading-relaxed text-muted-foreground">
            First time doing this one. Log a set and your history starts here.
          </span>
        </TipAnnotation>
      </div>
    ) : (
      <ExerciseHistoryPanel sessions={historySessions} />
    )

  return (
    // Paper tabs (tone mine) over the exercise's folder box, as on Training. Only the
    // selected panel renders its content; the others stay as empty, hidden panels.
    <div className="w-full h-full flex flex-col">
      <div className="flex-shrink-0 px-3 pt-2">
        <PaperTabs
          name="Exercise"
          idPrefix="exercise"
          tone="mine"
          tabs={tabs}
          value={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />
      </div>
      <div className="folder-box mx-3 mb-2 flex min-h-0 flex-1 flex-col border-2 border-secondary bg-card">
        <div {...panel('log')} className="flex-1 overflow-y-auto flex flex-col">
          {activeTab === 'log' && (
            <>
              <DrawerContextBanner
                exerciseName={exercise.name}
                currentSet={currentSetNumber}
                totalSets={totalSets}
                prescribed={prescribedSummary}
                isInputExpanded={isInputExpanded}
                menuActions={menuActions}
              />
              <div className="px-4 pt-4 flex-1 flex flex-col gap-2">
                {!isInputExpanded && (
                  <LastSessionReference
                    history={exerciseHistory}
                    isLoading={historyState === 'loading' || historyState === 'pending'}
                    onApply={onApplySet}
                    hasLoggedSets={loggedSets.length > 0}
                  />
                )}
                {loggingForm}
                {!isInputExpanded && (
                  <>
                    <SetList
                      prescribedSets={prescribedSets}
                      loggedSets={loggedSets}
                      exerciseHistory={exerciseHistory}
                      onDeleteSet={onDeleteSet}
                      onApplySet={onApplySet}
                      exerciseId={exercise.id}
                      showIntensity={showIntensity}
                    />
                    {message && (
                      <MessageCard
                        message={message}
                        variant="exercise_logger"
                        onSeen={onMessageSeen}
                        onDismiss={onMessageDismissed}
                      />
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div {...panel('info')} className="flex-1 overflow-y-auto px-4">
          {activeTab === 'info' && (
            <>
              <ExerciseTabTitle exercise={exercise} />
              <ExerciseInfoContent exerciseName={exercise.name} exerciseDefinition={exercise.exerciseDefinition} />
            </>
          )}
        </div>

        {hasNotes && (
          <div {...panel('notes')} className="flex-1 overflow-y-auto px-4">
            {activeTab === 'notes' && (
              <>
                <ExerciseTabTitle exercise={exercise} />
                <h4 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Notes</h4>
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">{exercise.notes}</p>
              </>
            )}
          </div>
        )}

        <div {...panel('history')} className="flex-1 overflow-y-auto px-4">
          {activeTab === 'history' && (
            <>
              <ExerciseTabTitle exercise={exercise} />
              {historyBody}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
