'use client'

import { useState, useEffect } from 'react'
import { EQUIPMENT_LABELS, INTENSITY_ZONE_LABELS, type CardioEquipment, type IntensityZone } from '@/lib/cardio'
import type { LoggedCardioSession } from '@prisma/client'

type Props = {
  count: number
}

export default function CardioHistoryList({ count }: Props) {
  const [sessions, setSessions] = useState<LoggedCardioSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Fetch session history on mount
  useEffect(() => {
    async function fetchSessions() {
      try {
        const response = await fetch('/api/cardio/history?limit=50')
        const data = await response.json()

        if (data.success) {
          setSessions(data.sessions)
        } else {
          console.error('Failed to fetch sessions:', data.error)
        }
      } catch (error) {
        console.error('Error fetching sessions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSessions()
  }, [])

  if (isLoading) {
    return (
      <div className="bg-card border border-border p-8 text-center doom-noise">
        <p className="text-muted-foreground">Loading session history...</p>
      </div>
    )
  }

  if (count === 0) {
    return (
      <div className="bg-card border border-border p-8 text-center doom-noise">
        <p className="text-muted-foreground text-lg">NO CARDIO SESSIONS LOGGED YET</p>
        <p className="text-muted-foreground text-sm mt-2">
          Click &ldquo;Log Cardio&rdquo; to record your first session
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <div
          key={session.id}
          className={`bg-card border transition doom-noise doom-card ${
            session.status === 'completed'
              ? 'border-success-border doom-workout-completed'
              : session.status === 'incomplete'
              ? 'border-warning-border'
              : 'border-border'
          }`}
        >
          {/* Session Header */}
          <button
            onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
            className="w-full p-4 text-left hover:bg-muted/50 transition"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-foreground doom-heading">
                    {session.name}
                  </h3>
                  {session.status === 'completed' && (
                    <span className="doom-badge doom-badge-completed">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      COMPLETED
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{EQUIPMENT_LABELS[session.equipment as CardioEquipment]}</span>
                  <span className="doom-stat text-primary">
                    {session.duration} min
                  </span>
                  {session.distance && (
                    <span>{session.distance} mi</span>
                  )}
                  {session.calories && (
                    <span>{session.calories} cal</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {new Date(session.completedAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(session.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </button>

          {/* Expanded Details */}
          {expandedId === session.id && (
            <div className="border-t border-border p-4 bg-muted/30 space-y-4">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {session.avgHR && (
                  <MetricDisplay label="Avg HR" value={`${session.avgHR} bpm`} />
                )}
                {session.peakHR && (
                  <MetricDisplay label="Peak HR" value={`${session.peakHR} bpm`} />
                )}
                {session.avgPower && (
                  <MetricDisplay label="Avg Power" value={`${session.avgPower}W`} />
                )}
                {session.peakPower && (
                  <MetricDisplay label="Peak Power" value={`${session.peakPower}W`} />
                )}
                {session.elevationGain && (
                  <MetricDisplay label="Elevation Gain" value={`${session.elevationGain} ft`} />
                )}
                {session.elevationLoss && (
                  <MetricDisplay label="Elevation Loss" value={`${session.elevationLoss} ft`} />
                )}
                {session.avgPace && (
                  <MetricDisplay label="Avg Pace" value={session.avgPace} />
                )}
                {session.cadence && (
                  <MetricDisplay label="Cadence" value={`${session.cadence} rpm`} />
                )}
                {session.strokeRate && (
                  <MetricDisplay label="Stroke Rate" value={`${session.strokeRate} spm`} />
                )}
                {session.strokeCount && (
                  <MetricDisplay label="Stroke Count" value={`${session.strokeCount}`} />
                )}
              </div>

              {/* Context */}
              <div className="space-y-2">
                {session.intensityZone && (
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground doom-label">
                      INTENSITY ZONE
                    </span>
                    <p className="text-sm text-foreground">
                      {INTENSITY_ZONE_LABELS[session.intensityZone as IntensityZone]}
                    </p>
                  </div>
                )}
                {session.intervalStructure && (
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground doom-label">
                      INTERVALS
                    </span>
                    <p className="text-sm text-foreground font-mono">
                      {session.intervalStructure}
                    </p>
                  </div>
                )}
                {session.notes && (
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground doom-label">
                      NOTES
                    </span>
                    <p className="text-sm text-foreground">
                      {session.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Helper component for metric display
function MetricDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border p-3">
      <p className="text-xs font-semibold text-muted-foreground doom-label mb-1">
        {label}
      </p>
      <p className="text-lg font-bold text-foreground doom-stat">
        {value}
      </p>
    </div>
  )
}
