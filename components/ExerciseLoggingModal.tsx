'use client'

import { useState } from 'react'

type PrescribedSet = {
  id: string
  setNumber: number
  reps: string // Changed from number to support ranges like "8-12"
  weight: string | null
  rpe: number | null
  rir: number | null
}

type Exercise = {
  id: string
  name: string
  order: number
  exerciseGroup: string | null
  notes: string | null
  prescribedSets: PrescribedSet[]
}

type LoggedSet = {
  exerciseId: string
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
}

type ExerciseHistorySet = {
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
}

type ExerciseHistory = {
  completedAt: Date
  workoutName: string
  sets: ExerciseHistorySet[]
}

type Props = {
  isOpen: boolean
  onClose: () => void
  exercises: Exercise[]
  workoutId: string
  workoutName: string
  onComplete: (loggedSets: LoggedSet[]) => Promise<void>
  exerciseHistory?: Record<string, ExerciseHistory | null> // NEW: Exercise history map
}

export default function ExerciseLoggingModal({
  isOpen,
  onClose,
  exercises,
  workoutName,
  onComplete,
  exerciseHistory,
}: Props) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([])
  const [currentSet, setCurrentSet] = useState({
    reps: '',
    weight: '',
    weightUnit: 'lbs',
    rpe: '',
    rir: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const currentExercise = exercises[currentExerciseIndex]
  const currentPrescribedSets = currentExercise.prescribedSets
  const currentExerciseLoggedSets = loggedSets.filter(
    (s) => s.exerciseId === currentExercise.id
  )
  const nextSetNumber = currentExerciseLoggedSets.length + 1
  const prescribedSet = currentPrescribedSets.find(
    (s) => s.setNumber === nextSetNumber
  )

  // Check if current exercise has any prescribed RPE/RIR
  const hasRpe = currentPrescribedSets.some((s) => s.rpe !== null)
  const hasRir = currentPrescribedSets.some((s) => s.rir !== null)

  // Check if this exercise is part of a superset
  const isSuperset = currentExercise.exerciseGroup !== null
  const supersetLabel = currentExercise.exerciseGroup

  const handleLogSet = () => {
    if (!currentSet.reps || !currentSet.weight) return

    const newLoggedSet: LoggedSet = {
      exerciseId: currentExercise.id,
      setNumber: nextSetNumber,
      reps: parseInt(currentSet.reps, 10),
      weight: parseFloat(currentSet.weight),
      weightUnit: currentSet.weightUnit,
      rpe: currentSet.rpe ? parseInt(currentSet.rpe, 10) : null,
      rir: currentSet.rir ? parseInt(currentSet.rir, 10) : null,
    }

    setLoggedSets([...loggedSets, newLoggedSet])
    setCurrentSet({
      reps: '',
      weight: '',
      weightUnit: currentSet.weightUnit,
      rpe: '',
      rir: '',
    })
  }

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1)
      setCurrentSet({
        reps: '',
        weight: '',
        weightUnit: 'lbs',
        rpe: '',
        rir: '',
      })
    }
  }

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1)
      setCurrentSet({
        reps: '',
        weight: '',
        weightUnit: 'lbs',
        rpe: '',
        rir: '',
      })
    }
  }

  const handleCompleteWorkout = async () => {
    setIsSubmitting(true)
    try {
      await onComplete(loggedSets)
      onClose()
    } catch (error) {
      console.error('Error completing workout:', error)
      alert('Failed to save workout. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSet = (setNumber: number) => {
    setLoggedSets(
      loggedSets.filter(
        (s) => !(s.exerciseId === currentExercise.id && s.setNumber === setNumber)
      )
    )
  }

  const canLogSet = currentSet.reps && currentSet.weight
  const hasLoggedAllPrescribed =
    currentExerciseLoggedSets.length >= currentPrescribedSets.length
  const totalLoggedSets = loggedSets.length
  const totalPrescribedSets = exercises.reduce(
    (sum, ex) => sum + ex.prescribedSets.length,
    0
  )

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-50 flex items-end sm:items-center justify-center">
      {/* Modal - Full screen on mobile, centered on desktop */}
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-lg sm:max-w-2xl flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-4 sm:rounded-t-lg flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">{workoutName}</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 p-2 -mr-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-sm text-blue-100">
            Exercise {currentExerciseIndex + 1} of {exercises.length} • {totalLoggedSets}/
            {totalPrescribedSets} sets logged
          </div>
        </div>

        {/* Exercise Navigation */}
        <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-gray-50 flex-shrink-0">
          <button
            onClick={handlePreviousExercise}
            disabled={currentExerciseIndex === 0}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-2">
              {isSuperset && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded">
                  Superset {supersetLabel}
                </span>
              )}
              <h3 className="text-lg font-semibold">{currentExercise.name}</h3>
            </div>
            {currentExercise.notes && (
              <p className="text-sm text-gray-600 mt-1">{currentExercise.notes}</p>
            )}
          </div>

          <button
            onClick={handleNextExercise}
            disabled={currentExerciseIndex === exercises.length - 1}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Last Performance (if available) */}
          {exerciseHistory && exerciseHistory[currentExercise.id] && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Last Time ({new Date(exerciseHistory[currentExercise.id]!.completedAt).toLocaleDateString()})
              </h4>
              <div className="bg-blue-50 rounded-lg p-3 space-y-1 border border-blue-200">
                {exerciseHistory[currentExercise.id]!.sets.map((set) => (
                  <div key={set.setNumber} className="text-sm text-blue-900">
                    Set {set.setNumber}: {set.reps} reps @ {set.weight}{set.weightUnit}
                    {set.rir !== null && ` • RIR ${set.rir}`}
                    {set.rpe !== null && ` • RPE ${set.rpe}`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prescribed Sets Reference */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Today's Target</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              {currentPrescribedSets.map((set) => (
                <div key={set.id} className="text-sm text-gray-700">
                  Set {set.setNumber}: {set.reps} reps @ {set.weight || '—'}
                  {set.rir !== null && ` • RIR ${set.rir}`}
                  {set.rpe !== null && ` • RPE ${set.rpe}`}
                </div>
              ))}
            </div>
          </div>

          {/* Logged Sets */}
          {currentExerciseLoggedSets.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Logged Sets</h4>
              <div className="space-y-2">
                {currentExerciseLoggedSets.map((set) => (
                  <div
                    key={`${set.exerciseId}-${set.setNumber}`}
                    className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="text-sm">
                      <span className="font-semibold text-green-900">Set {set.setNumber}:</span>{' '}
                      <span className="text-green-800">
                        {set.reps} reps @ {set.weight}
                        {set.weightUnit}
                        {set.rir !== null && ` • RIR ${set.rir}`}
                        {set.rpe !== null && ` • RPE ${set.rpe}`}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteSet(set.setNumber)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Log Next Set */}
          {!hasLoggedAllPrescribed && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Log Set {nextSetNumber}
                {prescribedSet && (
                  <span className="text-gray-500 font-normal ml-2">
                    (Target: {prescribedSet.reps} reps @ {prescribedSet.weight || '—'})
                  </span>
                )}
              </h4>

              <div className="space-y-3">
                {/* Reps and Weight - Side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reps *
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={currentSet.reps}
                      onChange={(e) =>
                        setCurrentSet({ ...currentSet, reps: e.target.value })
                      }
                      placeholder={prescribedSet?.reps.toString() || '0'}
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight * ({currentSet.weightUnit})
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={currentSet.weight}
                      onChange={(e) =>
                        setCurrentSet({ ...currentSet, weight: e.target.value })
                      }
                      placeholder={prescribedSet?.weight?.replace(/[^0-9.]/g, '') || '0'}
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Weight Unit Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentSet({ ...currentSet, weightUnit: 'lbs' })}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      currentSet.weightUnit === 'lbs'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    lbs
                  </button>
                  <button
                    onClick={() => setCurrentSet({ ...currentSet, weightUnit: 'kg' })}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      currentSet.weightUnit === 'kg'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    kg
                  </button>
                </div>

                {/* Optional RPE/RIR */}
                {(hasRpe || hasRir) && (
                  <div className="grid grid-cols-2 gap-3">
                    {hasRir && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          RIR (optional)
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="10"
                          value={currentSet.rir}
                          onChange={(e) =>
                            setCurrentSet({ ...currentSet, rir: e.target.value })
                          }
                          placeholder={prescribedSet?.rir?.toString() || '—'}
                          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    {hasRpe && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          RPE (optional)
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max="10"
                          value={currentSet.rpe}
                          onChange={(e) =>
                            setCurrentSet({ ...currentSet, rpe: e.target.value })
                          }
                          placeholder={prescribedSet?.rpe?.toString() || '—'}
                          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Log Set Button */}
                <button
                  onClick={handleLogSet}
                  disabled={!canLogSet}
                  className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Log Set {nextSetNumber}
                </button>
              </div>
            </div>
          )}

          {/* Exercise Complete Message */}
          {hasLoggedAllPrescribed && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-green-700 font-semibold mb-2">
                ✓ All prescribed sets logged!
              </div>
              <p className="text-sm text-green-600">
                {currentExerciseIndex < exercises.length - 1
                  ? 'Continue to next exercise or complete workout'
                  : 'All exercises complete! Ready to finish workout.'}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-gray-200 px-4 py-4 bg-gray-50 flex-shrink-0 space-y-2">
          {currentExerciseIndex < exercises.length - 1 && (
            <button
              onClick={handleNextExercise}
              className="w-full py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 active:bg-gray-900 transition-colors"
            >
              Next Exercise →
            </button>
          )}

          <button
            onClick={handleCompleteWorkout}
            disabled={isSubmitting || totalLoggedSets === 0}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : `Complete Workout (${totalLoggedSets} sets)`}
          </button>
        </div>
      </div>
    </div>
  )
}
