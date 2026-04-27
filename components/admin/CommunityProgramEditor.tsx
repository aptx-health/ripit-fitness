'use client'

import { Save } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

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

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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

      {/* Program structure summary + link to builder */}
      <div className="bg-card border-2 border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wider mb-1">Program Structure</h2>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{program.weekCount} weeks</span>
              <span>{program.workoutCount} workouts</span>
              <span>{program.exerciseCount} exercises</span>
            </div>
          </div>
          {program.curated && (
            <Link
              href={`/admin/community-programs/${program.id}/edit-structure`}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-wider border-2 border-primary hover:bg-primary-hover transition-colors"
            >
              Edit in Program Builder
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
