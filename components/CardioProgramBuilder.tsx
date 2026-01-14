'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  EQUIPMENT_LABELS,
  INTENSITY_ZONE_LABELS,
  type CardioEquipment,
  type IntensityZone
} from '@/lib/cardio'

type Week = {
  weekNumber: number
  sessions: Session[]
}

type Session = {
  dayNumber: number
  name: string
  description?: string
  targetDuration: number
  intensityZone?: IntensityZone
  equipment?: CardioEquipment
  targetHRRange?: string
  targetPowerRange?: string
  intervalStructure?: string
  notes?: string
}

type ExistingProgram = {
  id: string
  name: string
  description: string | null
  weeks: Array<{
    weekNumber: number
    sessions: Array<{
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
    }>
  }>
}

type Props = {
  editMode?: boolean
  existingProgram?: ExistingProgram
}

export default function CardioProgramBuilder({ editMode = false, existingProgram }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Program state
  const [programName, setProgramName] = useState(editMode && existingProgram ? existingProgram.name : '')
  const [programDescription, setProgramDescription] = useState(editMode && existingProgram ? existingProgram.description || '' : '')
  const [programId, setProgramId] = useState<string | null>(editMode && existingProgram ? existingProgram.id : null)
  const [weeks, setWeeks] = useState<Week[]>(
    editMode && existingProgram
      ? existingProgram.weeks.map(w => ({
          weekNumber: w.weekNumber,
          sessions: w.sessions.map(s => ({
            dayNumber: s.dayNumber,
            name: s.name,
            description: s.description || undefined,
            targetDuration: s.targetDuration,
            intensityZone: (s.intensityZone as IntensityZone) || undefined,
            equipment: (s.equipment as CardioEquipment) || undefined,
            targetHRRange: s.targetHRRange || undefined,
            targetPowerRange: s.targetPowerRange || undefined,
            intervalStructure: s.intervalStructure || undefined,
            notes: s.notes || undefined
          }))
        }))
      : []
  )

  // UI state
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]))
  const [editingSession, setEditingSession] = useState<{ weekNum: number; dayNum: number } | null>(null)

  // Add week
  const handleAddWeek = () => {
    const newWeekNumber = weeks.length + 1
    setWeeks([...weeks, { weekNumber: newWeekNumber, sessions: [] }])
    setExpandedWeeks(prev => new Set([...prev, newWeekNumber]))
  }

  // Remove week
  const handleRemoveWeek = (weekNumber: number) => {
    setWeeks(weeks.filter(w => w.weekNumber !== weekNumber).map((w, idx) => ({ ...w, weekNumber: idx + 1 })))
  }

  // Toggle week expansion
  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(weekNumber)) {
        newSet.delete(weekNumber)
      } else {
        newSet.add(weekNumber)
      }
      return newSet
    })
  }

  // Add session to week
  const handleAddSession = (weekNumber: number) => {
    setWeeks(weeks.map(week => {
      if (week.weekNumber === weekNumber) {
        const newDayNumber = week.sessions.length + 1
        return {
          ...week,
          sessions: [
            ...week.sessions,
            {
              dayNumber: newDayNumber,
              name: `Cardio Session ${newDayNumber}`,
              targetDuration: 30,
              intensityZone: 'zone2'
            }
          ]
        }
      }
      return week
    }))
  }

  // Remove session
  const handleRemoveSession = (weekNumber: number, dayNumber: number) => {
    setWeeks(weeks.map(week => {
      if (week.weekNumber === weekNumber) {
        return {
          ...week,
          sessions: week.sessions
            .filter(s => s.dayNumber !== dayNumber)
            .map((s, idx) => ({ ...s, dayNumber: idx + 1 }))
        }
      }
      return week
    }))
  }

  // Update session
  const handleUpdateSession = (weekNumber: number, dayNumber: number, updates: Partial<Session>) => {
    setWeeks(weeks.map(week => {
      if (week.weekNumber === weekNumber) {
        return {
          ...week,
          sessions: week.sessions.map(s =>
            s.dayNumber === dayNumber ? { ...s, ...updates } : s
          )
        }
      }
      return week
    }))
  }

  // Save program
  const handleSave = async () => {
    setError(null)

    // Validate
    if (!programName.trim()) {
      setError('Program name is required')
      return
    }

    if (weeks.length === 0) {
      setError('Program must have at least one week')
      return
    }

    setIsLoading(true)

    try {
      let currentProgramId = programId

      // Create program if new
      if (!editMode || !currentProgramId) {
        const createResponse = await fetch('/api/cardio/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: programName,
            description: programDescription
          })
        })

        const createData = await createResponse.json()
        if (!createData.success) {
          throw new Error(createData.error || 'Failed to create program')
        }

        currentProgramId = createData.program.id
        setProgramId(currentProgramId)
      } else {
        // Update program metadata
        await fetch(`/api/cardio/programs/${currentProgramId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: programName,
            description: programDescription
          })
        })
      }

      // Update program structure
      const builderResponse = await fetch(`/api/cardio/programs/${currentProgramId}/builder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeks })
      })

      const builderData = await builderResponse.json()
      if (!builderData.success) {
        throw new Error(builderData.error || 'Failed to save program structure')
      }

      // Redirect to programs page
      router.push('/cardio/programs')
      router.refresh()
    } catch (err) {
      console.error('Error saving program:', err)
      setError(err instanceof Error ? err.message : 'Failed to save program')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Program Details */}
      <div className="bg-card border border-border p-6 doom-noise doom-card">
        <h2 className="text-2xl font-bold text-foreground doom-heading mb-4">
          PROGRAM DETAILS
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2 doom-label">
              PROGRAM NAME *
            </label>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="12-Week Zone 2 Program"
              className="doom-input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2 doom-label">
              DESCRIPTION
            </label>
            <textarea
              value={programDescription}
              onChange={(e) => setProgramDescription(e.target.value)}
              placeholder="Focus on building aerobic base..."
              rows={3}
              className="doom-input w-full resize-none"
            />
          </div>
        </div>
      </div>

      {/* Weeks */}
      <div className="space-y-4">
        {weeks.map((week) => (
          <div key={week.weekNumber} className="bg-card border border-border doom-noise doom-card">
            {/* Week Header */}
            <div className="p-4 border-b border-border flex justify-between items-center">
              <button
                onClick={() => toggleWeek(week.weekNumber)}
                className="flex items-center gap-2 text-foreground hover:text-primary transition"
              >
                {expandedWeeks.has(week.weekNumber) ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <span className="text-xl font-bold doom-heading">
                  WEEK {week.weekNumber}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({week.sessions.length} session{week.sessions.length !== 1 ? 's' : ''})
                </span>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddSession(week.weekNumber)}
                  className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary-hover text-sm doom-button-3d uppercase tracking-wider"
                >
                  ADD SESSION
                </button>
                <button
                  onClick={() => handleRemoveWeek(week.weekNumber)}
                  className="px-3 py-1 bg-error text-error-foreground hover:bg-error-hover text-sm doom-button-3d uppercase tracking-wider"
                >
                  REMOVE WEEK
                </button>
              </div>
            </div>

            {/* Week Content */}
            {expandedWeeks.has(week.weekNumber) && (
              <div className="p-4 space-y-3">
                {week.sessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No sessions yet. Click "Add Session" to get started.
                  </p>
                ) : (
                  week.sessions.map((session) => (
                    <SessionCard
                      key={session.dayNumber}
                      session={session}
                      weekNumber={week.weekNumber}
                      onUpdate={(updates) => handleUpdateSession(week.weekNumber, session.dayNumber, updates)}
                      onRemove={() => handleRemoveSession(week.weekNumber, session.dayNumber)}
                      isEditing={editingSession?.weekNum === week.weekNumber && editingSession?.dayNum === session.dayNumber}
                      onEdit={() => setEditingSession({ weekNum: week.weekNumber, dayNum: session.dayNumber })}
                      onCancelEdit={() => setEditingSession(null)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Week Button */}
      <button
        onClick={handleAddWeek}
        className="w-full px-4 py-3 border-2 border-dashed border-primary text-primary hover:bg-primary-muted transition font-semibold uppercase tracking-wider"
      >
        + ADD WEEK
      </button>

      {/* Error */}
      {error && (
        <div className="bg-error-muted border border-error-border p-4">
          <p className="text-error-text text-sm">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push('/cardio/programs')}
          className="flex-1 px-4 py-3 border-2 border-border text-foreground hover:bg-muted doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
        >
          CANCEL
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex-1 px-4 py-3 bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
        >
          {isLoading ? 'SAVING...' : 'SAVE PROGRAM'}
        </button>
      </div>
    </div>
  )
}

// Session Card Component
function SessionCard({
  session,
  weekNumber,
  onUpdate,
  onRemove,
  isEditing,
  onEdit,
  onCancelEdit
}: {
  session: Session
  weekNumber: number
  onUpdate: (updates: Partial<Session>) => void
  onRemove: () => void
  isEditing: boolean
  onEdit: () => void
  onCancelEdit: () => void
}) {
  if (!isEditing) {
    return (
      <div className="bg-muted border border-border p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h4 className="text-lg font-bold text-foreground doom-heading mb-2">
              DAY {session.dayNumber}: {session.name}
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Duration: <span className="text-foreground font-semibold">{session.targetDuration} min</span></p>
              {session.intensityZone && <p>Zone: <span className="text-foreground">{INTENSITY_ZONE_LABELS[session.intensityZone]}</span></p>}
              {session.equipment && <p>Equipment: <span className="text-foreground">{EQUIPMENT_LABELS[session.equipment]}</span></p>}
              {session.targetHRRange && <p>Target HR: <span className="text-foreground">{session.targetHRRange} bpm</span></p>}
              {session.intervalStructure && <p>Intervals: <span className="text-foreground font-mono">{session.intervalStructure}</span></p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1 bg-secondary text-secondary-foreground hover:bg-secondary-hover text-sm doom-button-3d uppercase"
            >
              EDIT
            </button>
            <button
              onClick={onRemove}
              className="px-3 py-1 bg-error text-error-foreground hover:bg-error-hover text-sm doom-button-3d uppercase"
            >
              REMOVE
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-muted border-2 border-primary p-4 space-y-4">
      <h4 className="text-lg font-bold text-foreground doom-heading">
        EDIT DAY {session.dayNumber}
      </h4>

      <div className="grid grid-cols-2 gap-4">
        {/* Name */}
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-foreground mb-2 doom-label">NAME *</label>
          <input
            type="text"
            value={session.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="doom-input w-full"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2 doom-label">DURATION (min) *</label>
          <input
            type="number"
            value={session.targetDuration}
            onChange={(e) => onUpdate({ targetDuration: parseInt(e.target.value) || 0 })}
            min="1"
            className="doom-input w-full"
          />
        </div>

        {/* Intensity Zone */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2 doom-label">INTENSITY ZONE</label>
          <select
            value={session.intensityZone || ''}
            onChange={(e) => onUpdate({ intensityZone: (e.target.value as IntensityZone) || undefined })}
            className="doom-input w-full"
          >
            <option value="">SELECT ZONE</option>
            {Object.entries(INTENSITY_ZONE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Equipment */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2 doom-label">EQUIPMENT</label>
          <select
            value={session.equipment || ''}
            onChange={(e) => onUpdate({ equipment: (e.target.value as CardioEquipment) || undefined })}
            className="doom-input w-full"
          >
            <option value="">SELECT EQUIPMENT</option>
            {Object.entries(EQUIPMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Target HR Range */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2 doom-label">TARGET HR RANGE</label>
          <input
            type="text"
            value={session.targetHRRange || ''}
            onChange={(e) => onUpdate({ targetHRRange: e.target.value || undefined })}
            placeholder="140-150"
            className="doom-input w-full"
          />
        </div>

        {/* Target Power Range */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2 doom-label">TARGET POWER RANGE</label>
          <input
            type="text"
            value={session.targetPowerRange || ''}
            onChange={(e) => onUpdate({ targetPowerRange: e.target.value || undefined })}
            placeholder="150-180W"
            className="doom-input w-full"
          />
        </div>

        {/* Interval Structure */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2 doom-label">INTERVAL STRUCTURE</label>
          <input
            type="text"
            value={session.intervalStructure || ''}
            onChange={(e) => onUpdate({ intervalStructure: e.target.value || undefined })}
            placeholder="8x30s/90s"
            className="doom-input w-full"
          />
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-foreground mb-2 doom-label">NOTES</label>
          <textarea
            value={session.notes || ''}
            onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
            placeholder="Optional notes..."
            rows={2}
            className="doom-input w-full resize-none"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancelEdit}
          className="flex-1 px-3 py-2 border-2 border-border text-foreground hover:bg-card doom-button-3d uppercase"
        >
          DONE
        </button>
      </div>
    </div>
  )
}
