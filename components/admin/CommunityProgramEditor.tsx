'use client'

import { ChevronDown, ChevronRight, Save } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface ProgramExercise {
  name: string
  prescribedSets?: unknown[]
}

interface ProgramWorkout {
  name: string
  exercises?: ProgramExercise[]
}

interface ProgramWeek {
  weekNumber?: number
  description?: string
  workouts?: ProgramWorkout[]
}

interface ProgramDataJson {
  name?: string
  description?: string
  weeks?: ProgramWeek[]
}

interface ProgramData {
  id: string
  name: string
  description: string
  level: string | null
  curated: boolean
  goals: string[]
  equipmentNeeded: string[]
  focusAreas: string[]
  targetDaysPerWeek: number | null
  weekCount: number
  workoutCount: number
  exerciseCount: number
  programData: ProgramDataJson
}

interface Props {
  program: ProgramData
  onSave: () => void
  onCancel: () => void
}

const LEVELS = ['beginner', 'intermediate', 'advanced']

export default function CommunityProgramEditor({ program, onSave, onCancel }: Props) {
  const [name, setName] = useState(program.name)
  const [description, setDescription] = useState(program.description)
  const [level, setLevel] = useState(program.level || '')
  const [goals, setGoals] = useState(program.goals.join(', '))
  const [equipmentNeeded, setEquipmentNeeded] = useState(program.equipmentNeeded.join(', '))
  const [focusAreas, setFocusAreas] = useState(program.focusAreas.join(', '))
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(
    program.targetDaysPerWeek?.toString() || ''
  )

  const [weeks, setWeeks] = useState<ProgramWeek[]>(
    () => (program.programData?.weeks || []) as ProgramWeek[]
  )
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set())

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const toggleWeek = (index: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const updateWeekDescription = (weekIndex: number, value: string) => {
    setWeeks((prev) =>
      prev.map((w, i) => (i === weekIndex ? { ...w, description: value } : w))
    )
  }

  const updateWorkoutName = (weekIndex: number, workoutIndex: number, value: string) => {
    setWeeks((prev) =>
      prev.map((w, i) => {
        if (i !== weekIndex) return w
        const workouts = (w.workouts || []).map((wo, j) =>
          j === workoutIndex ? { ...wo, name: value } : wo
        )
        return { ...w, workouts }
      })
    )
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    const parsedGoals = goals.split(',').map((g) => g.trim()).filter(Boolean)
    const parsedEquipment = equipmentNeeded.split(',').map((e) => e.trim()).filter(Boolean)
    const parsedFocus = focusAreas.split(',').map((f) => f.trim()).filter(Boolean)
    const parsedDays = targetDaysPerWeek ? parseInt(targetDaysPerWeek, 10) : null

    // Build updated programData
    const updatedProgramData: ProgramDataJson = {
      ...program.programData,
      name: name.trim(),
      description: description.trim(),
      weeks,
    }

    try {
      const res = await fetch(`/api/admin/community-programs/${program.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          level: level || null,
          goals: parsedGoals,
          equipmentNeeded: parsedEquipment,
          focusAreas: parsedFocus,
          targetDaysPerWeek: parsedDays,
          programData: updatedProgramData,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error || 'Failed to save')
        setSaving(false)
        return
      }

      setSuccess(true)
      setSaving(false)
      onSave()
    } catch {
      setError('Network error')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Save/Cancel bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary text-primary-foreground border-2 border-primary hover:bg-primary-hover font-semibold uppercase tracking-wider text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-muted text-muted-foreground border-2 border-border hover:bg-secondary font-semibold uppercase tracking-wider text-sm transition-colors"
        >
          Cancel
        </button>
        {error && <span className="text-sm text-red-400">{error}</span>}
        {success && <span className="text-sm text-green-400">Saved</span>}
      </div>

      {/* Program metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Level
          </label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">-- Select --</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Goals (comma-separated)
          </label>
          <input
            type="text"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="strength, hypertrophy"
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Target Days/Week
          </label>
          <input
            type="number"
            min={1}
            max={7}
            value={targetDaysPerWeek}
            onChange={(e) => setTargetDaysPerWeek(e.target.value)}
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Equipment Needed (comma-separated)
          </label>
          <input
            type="text"
            value={equipmentNeeded}
            onChange={(e) => setEquipmentNeeded(e.target.value)}
            placeholder="barbell, dumbbells, bench"
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Focus Areas (comma-separated)
          </label>
          <input
            type="text"
            value={focusAreas}
            onChange={(e) => setFocusAreas(e.target.value)}
            placeholder="upper body, lower body"
            className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Stats (read-only) */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{program.weekCount} weeks</span>
        <span>{program.workoutCount} workouts</span>
        <span>{program.exerciseCount} exercises</span>
      </div>

      {/* Weeks section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold uppercase tracking-wider">Program Structure</h2>
          {program.curated && (
            <Link
              href={`/admin/community-programs/${program.id}/edit-structure`}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider border-2 border-primary hover:bg-primary-hover transition-colors"
            >
              Edit in Program Builder
            </Link>
          )}
        </div>
        <div className="space-y-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="border-2 border-border bg-card">
              <button
                type="button"
                onClick={() => toggleWeek(weekIndex)}
                className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-secondary transition-colors"
              >
                {expandedWeeks.has(weekIndex) ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
                <span className="font-semibold text-sm uppercase tracking-wider">
                  Week {week.weekNumber ?? weekIndex + 1}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {week.workouts?.length || 0} workouts
                </span>
              </button>

              {expandedWeeks.has(weekIndex) && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Week description */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Week Description
                    </label>
                    <textarea
                      value={week.description || ''}
                      onChange={(e) => updateWeekDescription(weekIndex, e.target.value)}
                      rows={2}
                      placeholder="Optional week description..."
                      className="w-full px-3 py-2 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y text-sm"
                    />
                  </div>

                  {/* Workouts */}
                  {week.workouts?.map((workout, workoutIndex) => (
                    <div key={workoutIndex} className="pl-4 border-l-2 border-border">
                      <div className="flex items-center gap-3 mb-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                          Workout {workoutIndex + 1}
                        </label>
                        <input
                          type="text"
                          value={workout.name}
                          onChange={(e) =>
                            updateWorkoutName(weekIndex, workoutIndex, e.target.value)
                          }
                          className="flex-1 px-3 py-1.5 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                      </div>
                      {/* Exercises (read-only) */}
                      {workout.exercises && workout.exercises.length > 0 && (
                        <div className="ml-4 space-y-0.5">
                          {workout.exercises.map((exercise, exIndex) => (
                            <div
                              key={exIndex}
                              className="text-xs text-muted-foreground flex items-center gap-2"
                            >
                              <span>{exercise.name}</span>
                              {exercise.prescribedSets && (
                                <span className="text-zinc-600">
                                  ({exercise.prescribedSets.length} sets)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom save bar */}
      <div className="flex items-center gap-3 pt-4 border-t-2 border-border">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary text-primary-foreground border-2 border-primary hover:bg-primary-hover font-semibold uppercase tracking-wider text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-muted text-muted-foreground border-2 border-border hover:bg-secondary font-semibold uppercase tracking-wider text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
