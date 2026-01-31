'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import {
  EQUIPMENT_LABELS,
  INTENSITY_ZONE_LABELS,
  normalizeEquipment,
  isValidIntensityZone,
  type CardioEquipment,
  type IntensityZone
} from '@/lib/cardio'
import WeekNavigator from '@/components/ui/WeekNavigator'
import ActionsMenu from '@/components/ActionsMenu'
import LogCardioModal from '@/components/LogCardioModal'

type Session = {
  id: string
  dayNumber: number
  name: string
  description: string | null
  targetDuration: number
  intensityZone: string | null
  equipment: string | null
  targetHRRange: string | null
  targetPowerRange: string | null
  intervalStructure: string | null
  notes: string | null
  loggedSessions: Array<{
    id: string
    status: string
    completedAt: Date
  }>
}

type Week = {
  id: string
  weekNumber: number
  sessions: Session[]
}

type Props = {
  programId: string
  programName: string
  week: Week
  totalWeeks: number
}

export default function CardioWeekView({
  programId,
  programName,
  week,
  totalWeeks
}: Props) {
  const router = useRouter()
  const [loggingSession, setLoggingSession] = useState<Session | null>(null)
  const [skippingSession, setSkippingSession] = useState<string | null>(null)
  const [unskippingSession, setUnskippingSession] = useState<string | null>(null)
  const [completingWeek, setCompletingWeek] = useState(false)

  const handleSkipSession = async (sessionId: string) => {
    setSkippingSession(sessionId)
    try {
      const response = await fetch(`/api/cardio/sessions/${sessionId}/skip`, {
        method: 'POST'
      })

      if (response.ok) {
        router.refresh()
      } else {
        const data = await response.json()
        console.error('Failed to skip session:', data.error)
      }
    } catch (error) {
      console.error('Error skipping session:', error)
    } finally {
      setSkippingSession(null)
    }
  }

  const handleUnskipSession = async (sessionId: string) => {
    setUnskippingSession(sessionId)
    try {
      const response = await fetch(`/api/cardio/sessions/${sessionId}/clear`, {
        method: 'POST'
      })

      if (response.ok) {
        router.refresh()
      } else {
        const data = await response.json()
        console.error('Failed to unskip session:', data.error)
      }
    } catch (error) {
      console.error('Error unskipping session:', error)
    } finally {
      setUnskippingSession(null)
    }
  }

  const handleCompleteWeek = async () => {
    setCompletingWeek(true)
    try {
      const response = await fetch(`/api/cardio/weeks/${week.id}/complete`, {
        method: 'POST'
      })

      if (response.ok) {
        router.refresh()
      } else {
        const data = await response.json()
        console.error('Failed to complete week:', data.error)
      }
    } catch (error) {
      console.error('Error completing week:', error)
    } finally {
      setCompletingWeek(false)
    }
  }

  // Check if there are any incomplete sessions
  const hasIncompleteSessions = week.sessions.some(
    session => session.loggedSessions.length === 0
  )

  const weekActions = hasIncompleteSessions
    ? [
        {
          label: 'Complete Week',
          icon: CheckCircle,
          onClick: handleCompleteWeek,
          requiresConfirmation: true,
          confirmationMessage:
            'This will mark all remaining sessions as skipped. Are you sure?',
          variant: 'warning' as const,
          disabled: completingWeek
        }
      ]
    : []

  return (
    <>
      <div className="bg-card border-y sm:border border-border doom-noise doom-card p-4 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <WeekNavigator
            currentWeek={week.weekNumber}
            totalWeeks={totalWeeks}
            baseUrl="/cardio"
            programName={programName}
            actions={
              weekActions.length > 0 ? (
                <ActionsMenu actions={weekActions} size="sm" />
              ) : undefined
            }
          />
        </div>

        <div className="space-y-3">
          {week.sessions.map(session => {
            const latestLog = session.loggedSessions[0]
            const isCompleted = latestLog && latestLog.status === 'completed'
            const isSkipped = latestLog && latestLog.status === 'skipped'
            const isSkipping = skippingSession === session.id
            const isUnskipping = unskippingSession === session.id

            return (
              <div
                key={session.id}
                className={`border p-4 transition ${
                  isCompleted
                    ? 'border-success-border bg-success-muted/50 doom-workout-completed'
                    : isSkipped
                      ? 'border-muted-foreground/50 bg-muted/50'
                      : 'border-border bg-muted'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-lg font-bold text-foreground doom-heading">
                        DAY {session.dayNumber}: {session.name}
                      </h3>
                      {isCompleted && (
                        <span className="doom-badge doom-badge-completed">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          COMPLETED
                        </span>
                      )}
                      {isSkipped && (
                        <span className="doom-badge bg-muted-foreground/30 text-foreground/70">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 5l7 7-7 7M5 5l7 7-7 7"
                            />
                          </svg>
                          SKIPPED
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground doom-label">
                          DURATION
                        </span>
                        <p className="text-foreground doom-stat">
                          {session.targetDuration} min
                        </p>
                      </div>
                      {session.intensityZone && (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground doom-label">
                            ZONE
                          </span>
                          <p className="text-foreground">
                            {
                              INTENSITY_ZONE_LABELS[
                                session.intensityZone as IntensityZone
                              ]
                            }
                          </p>
                        </div>
                      )}
                      {session.equipment && (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground doom-label">
                            EQUIPMENT
                          </span>
                          <p className="text-foreground">
                            {EQUIPMENT_LABELS[normalizeEquipment(session.equipment)]}
                          </p>
                        </div>
                      )}
                    </div>

                    {latestLog && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last logged:{' '}
                        {new Date(latestLog.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-row items-center gap-2">
                    {/* Primary action button */}
                    {isSkipped ? (
                      <button
                        onClick={() => handleUnskipSession(session.id)}
                        disabled={isUnskipping}
                        className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider text-sm disabled:opacity-50"
                      >
                        {isUnskipping ? 'RESTORING...' : 'UNSKIP'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setLoggingSession(session)}
                        className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider text-sm"
                      >
                        {isCompleted ? 'LOG AGAIN' : 'LOG SESSION'}
                      </button>
                    )}

                    {/* Skip button - only show if no logged status */}
                    {!latestLog && (
                      <button
                        onClick={() => handleSkipSession(session.id)}
                        disabled={isSkipping}
                        className="px-3 py-2 border-2 border-border text-foreground bg-transparent hover:bg-muted hover:border-primary active:bg-muted/80 doom-focus-ring text-sm font-semibold uppercase tracking-wider disabled:opacity-50 transition-colors"
                      >
                        {isSkipping ? 'SKIPPING...' : 'SKIP'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Log Modal */}
      {loggingSession && (
        <LogCardioModal
          isOpen={true}
          onClose={() => setLoggingSession(null)}
          prescribedSessionId={loggingSession.id}
          prescribedData={{
            name: loggingSession.name,
            equipment: normalizeEquipment(loggingSession.equipment),
            targetDuration: loggingSession.targetDuration,
            intensityZone: loggingSession.intensityZone && isValidIntensityZone(loggingSession.intensityZone)
              ? loggingSession.intensityZone
              : undefined
          }}
        />
      )}
    </>
  )
}
