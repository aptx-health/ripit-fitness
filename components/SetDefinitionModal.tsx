'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface SetDefinitionModalProps {
  isOpen: boolean
  onClose: () => void
  exerciseName: string
  onSubmit: (sets: PrescribedSetInput[]) => void
}

export interface PrescribedSetInput {
  setNumber: number
  reps: string
  intensityType: 'RIR' | 'RPE' | 'NONE'
  intensityValue?: number
}

export default function SetDefinitionModal({
  isOpen,
  onClose,
  exerciseName,
  onSubmit
}: SetDefinitionModalProps) {
  const [setCount, setSetCount] = useState(3)
  const [exerciseIntensityType, setExerciseIntensityType] = useState<'RIR' | 'RPE' | 'NONE'>('NONE')
  const [sets, setSets] = useState<PrescribedSetInput[]>([
    { setNumber: 1, reps: '8-12', intensityType: 'NONE' },
    { setNumber: 2, reps: '8-12', intensityType: 'NONE' },
    { setNumber: 3, reps: '8-12', intensityType: 'NONE' }
  ])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSetCount(3)
      setExerciseIntensityType('NONE')
      setSets([
        { setNumber: 1, reps: '8-12', intensityType: 'NONE' },
        { setNumber: 2, reps: '8-12', intensityType: 'NONE' },
        { setNumber: 3, reps: '8-12', intensityType: 'NONE' }
      ])
    }
  }, [isOpen])

  const handleSetCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(20, count))
    setSetCount(validCount)

    // Adjust sets array
    if (validCount > sets.length) {
      const newSets = [...sets]
      for (let i = sets.length; i < validCount; i++) {
        newSets.push({
          setNumber: i + 1,
          reps: '8-12',
          intensityType: exerciseIntensityType
        })
      }
      setSets(newSets)
    } else {
      setSets(sets.slice(0, validCount))
    }
  }

  const handleIntensityTypeChange = (newType: 'RIR' | 'RPE' | 'NONE') => {
    setExerciseIntensityType(newType)

    // Update all sets with new intensity type
    setSets(sets.map(set => ({
      ...set,
      intensityType: newType,
      intensityValue: newType === 'NONE' ? undefined : set.intensityValue
    })))
  }

  const handleSetUpdate = (index: number, field: string, value: any) => {
    const updated = [...sets]
    updated[index] = { ...updated[index], [field]: value }
    setSets(updated)
  }

  const handleSubmit = () => {
    const finalSets = sets.map(set => ({
      ...set,
      intensityType: exerciseIntensityType,
      intensityValue: exerciseIntensityType === 'NONE' ? undefined : set.intensityValue
    }))
    onSubmit(finalSets)
    // Don't call onClose() - let parent handle closing after state updates
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            Define Sets for "{exerciseName}"
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Set Count & Intensity Type Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Number of Sets
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={setCount}
                onChange={(e) => handleSetCountChange(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-muted text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Intensity Type
              </label>
              <select
                value={exerciseIntensityType}
                onChange={(e) => handleIntensityTypeChange(e.target.value as 'RIR' | 'RPE' | 'NONE')}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-muted text-foreground"
              >
                <option value="NONE">None</option>
                <option value="RIR">RIR (Reps in Reserve)</option>
                <option value="RPE">RPE (Rate of Perceived Exertion)</option>
              </select>
            </div>
          </div>

          {/* Set Input Rows */}
          <div className="space-y-3">
            {sets.map((set, index) => (
              <div key={set.setNumber} className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12">
                    <span className="text-sm font-medium text-muted-foreground">
                      Set {set.setNumber}
                    </span>
                  </div>

                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1">Reps</label>
                    <input
                      type="text"
                      value={set.reps}
                      onChange={(e) => handleSetUpdate(index, 'reps', e.target.value)}
                      placeholder="8-12"
                      className="w-full px-3 py-2 text-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-muted text-foreground"
                    />
                  </div>

                  {exerciseIntensityType !== 'NONE' && (
                    <div className="flex-1">
                      <label className="block text-xs text-muted-foreground mb-1">
                        {exerciseIntensityType} Value
                      </label>
                      <input
                        type="number"
                        min={exerciseIntensityType === 'RIR' ? 0 : 1}
                        max={exerciseIntensityType === 'RIR' ? 5 : 10}
                        step={exerciseIntensityType === 'RPE' ? 0.5 : 1}
                        value={set.intensityValue ?? ''}
                        onChange={(e) => handleSetUpdate(index, 'intensityValue', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder={exerciseIntensityType === 'RIR' ? '0-5' : '1-10'}
                        className="w-full px-3 py-2 text-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-muted text-foreground"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
          >
            Add Exercise
          </button>
        </div>
      </div>
    </div>
  )
}
