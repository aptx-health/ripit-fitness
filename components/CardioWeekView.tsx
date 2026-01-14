'use client'

import { useState } from 'react'
import { EQUIPMENT_LABELS, INTENSITY_ZONE_LABELS, type CardioEquipment, type IntensityZone } from '@/lib/cardio'
import LogCardioModal from './LogCardioModal'

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
  week: Week
  programId: string
}

export default function CardioWeekView({ week, programId }: Props) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [loggingSession, setLoggingSession] = useState<Session | null>(null)

  const completedCount = week.sessions.filter(s =>
    s.loggedSessions.length > 0 && s.loggedSessions[0].status === 'completed'
  ).length

  return (
    <>
      <div className="bg-card border border-border doom-noise doom-card">
        {/* Week Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 text-left hover:bg-muted/50 transition flex justify-between items-center"
        >
          <div className="flex items-center gap-4">
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div>
              <h2 className="text-2xl font-bold text-foreground doom-heading">
                WEEK {week.weekNumber}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {completedCount}/{week.sessions.length} sessions completed
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-success transition-all"
                style={{ width: `${(completedCount / week.sessions.length) * 100}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {Math.round((completedCount / week.sessions.length) * 100)}%
            </span>
          </div>
        </button>

        {/* Week Content */}
        {isExpanded && (
          <div className="border-t border-border p-4 space-y-3">
            {week.sessions.map((session) => {
              const latestLog = session.loggedSessions[0]
              const isCompleted = latestLog && latestLog.status === 'completed'

              return (
                <div
                  key={session.id}
                  className={`border p-4 transition ${
                    isCompleted
                      ? 'border-success-border bg-success-muted/50 doom-workout-completed'
                      : 'border-border bg-muted'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-foreground doom-heading">
                          DAY {session.dayNumber}: {session.name}
                        </h3>
                        {isCompleted && (
                          <span className="doom-badge doom-badge-completed">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            COMPLETED
                          </span>
                        )}
                      </div>

                      {/* Session Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground doom-label">DURATION</span>
                          <p className="text-foreground doom-stat">{session.targetDuration} min</p>
                        </div>
                        {session.intensityZone && (
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground doom-label">ZONE</span>
                            <p className="text-foreground">{INTENSITY_ZONE_LABELS[session.intensityZone as IntensityZone]}</p>
                          </div>
                        )}
                        {session.equipment && (
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground doom-label">EQUIPMENT</span>
                            <p className="text-foreground">{EQUIPMENT_LABELS[session.equipment as CardioEquipment]}</p>
                          </div>
                        )}
                        {session.targetHRRange && (
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground doom-label">TARGET HR</span>
                            <p className="text-foreground">{session.targetHRRange} bpm</p>
                          </div>
                        )}
                      </div>

                      {/* Optional Details */}
                      {(session.targetPowerRange || session.intervalStructure || session.notes) && (
                        <div className="mt-3 space-y-1 text-sm">
                          {session.targetPowerRange && (
                            <p className="text-muted-foreground">
                              <span className="font-semibold">Target Power:</span> {session.targetPowerRange}
                            </p>
                          )}
                          {session.intervalStructure && (
                            <p className="text-muted-foreground">
                              <span className="font-semibold">Intervals:</span> <span className="font-mono">{session.intervalStructure}</span>
                            </p>
                          )}
                          {session.notes && (
                            <p className="text-muted-foreground">
                              <span className="font-semibold">Notes:</span> {session.notes}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Latest Log Info */}
                      {latestLog && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Last logged: {new Date(latestLog.completedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => setLoggingSession(session)}
                      className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider text-sm"
                    >
                      {isCompleted ? 'LOG AGAIN' : 'LOG WORKOUT'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Log Modal */}
      {loggingSession && (
        <LogCardioModal
          isOpen={true}
          onClose={() => setLoggingSession(null)}
          prescribedSessionId={loggingSession.id}
          prescribedData={{
            name: loggingSession.name,
            equipment: (loggingSession.equipment as CardioEquipment) || 'other',
            targetDuration: loggingSession.targetDuration,
            intensityZone: (loggingSession.intensityZone as IntensityZone) || undefined
          }}
        />
      )}
    </>
  )
}
