'use client'

import { useState } from 'react'
import Link from 'next/link'
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

type Program = {
  id: string
  name: string
}

type Props = {
  program: Program
  week: Week
}

export default function CardioCurrentWeek({ program, week }: Props) {
  const [loggingSession, setLoggingSession] = useState<Session | null>(null)

  return (
    <>
      <div className="bg-card border border-border doom-noise doom-card p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground doom-heading">
              THIS WEEK
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {program.name} - Week {week.weekNumber}
            </p>
          </div>
          <Link
            href={`/cardio/programs/${program.id}`}
            className="text-sm text-primary hover:underline doom-focus-ring"
          >
            VIEW FULL PROGRAM →
          </Link>
        </div>

        <div className="space-y-3">
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

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
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
                    </div>

                    {latestLog && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last logged: {new Date(latestLog.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

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
