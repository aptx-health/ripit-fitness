'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'
import ExerciseSearchModal from './ExerciseSearchModal'
import FAUVolumeVisualization from './FAUVolumeVisualization'

type Week = {
  id: string
  weekNumber: number
  workouts: Workout[]
}

type Workout = {
  id: string
  name: string
  dayNumber: number
  exercises: Exercise[]
}

type Exercise = {
  id: string
  name: string
  order: number
  notes?: string | null
  prescribedSets: PrescribedSet[]
  exerciseDefinition: {
    id: string
    name: string
    primaryFAUs: string[]
    secondaryFAUs: string[]
  }
}

type PrescribedSet = {
  id: string
  setNumber: number
  reps: string
  weight?: string | null
  rpe?: number | null
  rir?: number | null
}

type ExistingProgram = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  weeks: Array<{
    id: string
    weekNumber: number
    workouts: Array<{
      id: string
      name: string
      dayNumber: number
      exercises: Array<{
        id: string
        name: string
        order: number
        notes: string | null
        prescribedSets: Array<{
          id: string
          setNumber: number
          reps: string
          weight: string | null
          rpe: number | null
          rir: number | null
        }>
        exerciseDefinition: {
          id: string
          name: string
          primaryFAUs: string[]
          secondaryFAUs: string[]
        }
      }>
    }>
  }>
}

type ProgramBuilderProps = {
  editMode?: boolean
  existingProgram?: ExistingProgram
}

export default function ProgramBuilder({ editMode = false, existingProgram }: ProgramBuilderProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Program form state
  const [programName, setProgramName] = useState(editMode && existingProgram ? existingProgram.name : '')
  const [programDescription, setProgramDescription] = useState(editMode && existingProgram ? existingProgram.description || '' : '')
  const [programId, setProgramId] = useState<string | null>(editMode && existingProgram ? existingProgram.id : null)
  const [weeks, setWeeks] = useState<Week[]>(editMode && existingProgram ? existingProgram.weeks : [])
  
  // Exercise modal state
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  
  // Workout editing state
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null)
  const [editingWorkoutName, setEditingWorkoutName] = useState('')
  
  // Deletion state
  const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null)
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null)
  
  // Collapsed workouts state
  const [collapsedWorkouts, setCollapsedWorkouts] = useState<Set<string>>(new Set())

  const createProgram = useCallback(async () => {
    if (!programName.trim()) {
      setError('Program name is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: programName.trim(),
          description: programDescription.trim() || undefined,
          programType: 'strength',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create program')
      }

      const { program } = await response.json()
      setProgramId(program.id)
      setWeeks(program.weeks || [])
      
      console.log('Program created successfully:', program)
    } catch (error) {
      console.error('Error creating program:', error)
      setError(error instanceof Error ? error.message : 'Failed to create program')
    } finally {
      setIsLoading(false)
    }
  }, [programName, programDescription])

  const addWeek = useCallback(async (sourceWeekId?: string) => {
    if (!programId) return

    setIsLoading(true)
    setError(null)

    try {
      const nextWeekNumber = weeks.length > 0 ? Math.max(...weeks.map(w => w.weekNumber)) + 1 : 1

      const response = await fetch(`/api/programs/${programId}/weeks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekNumber: nextWeekNumber,
          sourceWeekId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add week')
      }

      const { week } = await response.json()
      setWeeks(prev => [...prev, week].sort((a, b) => a.weekNumber - b.weekNumber))
      
      console.log('Week added successfully:', week)
    } catch (error) {
      console.error('Error adding week:', error)
      setError(error instanceof Error ? error.message : 'Failed to add week')
    } finally {
      setIsLoading(false)
    }
  }, [programId, weeks])

  const addWorkout = useCallback(async (weekId: string, sourceWorkoutId?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/weeks/${weekId}/workouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceWorkoutId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add workout')
      }

      const { workout } = await response.json()
      
      // Update the weeks state
      setWeeks(prev => prev.map(week => 
        week.id === weekId 
          ? { ...week, workouts: [...week.workouts, workout].sort((a, b) => a.dayNumber - b.dayNumber) }
          : week
      ))
      
      console.log('Workout added successfully:', workout)
    } catch (error) {
      console.error('Error adding workout:', error)
      setError(error instanceof Error ? error.message : 'Failed to add workout')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleComplete = useCallback(() => {
    if (programId) {
      router.push(`/programs/${programId}`)
    }
  }, [programId, router])

  const handleAddExercise = useCallback((workoutId: string) => {
    setSelectedWorkoutId(workoutId)
    setEditingExercise(null)
    setShowExerciseModal(true)
  }, [])

  const handleEditExercise = useCallback((exercise: Exercise, workoutId: string) => {
    setSelectedWorkoutId(workoutId)
    setEditingExercise(exercise)
    setShowExerciseModal(true)
  }, [])

  const handleStartWorkoutEdit = useCallback((workoutId: string, currentName: string) => {
    setEditingWorkoutId(workoutId)
    setEditingWorkoutName(currentName)
  }, [])

  const handleCancelWorkoutEdit = useCallback(() => {
    setEditingWorkoutId(null)
    setEditingWorkoutName('')
  }, [])

  const handleSaveWorkoutName = useCallback(async (workoutId: string) => {
    if (!editingWorkoutName.trim()) {
      setError('Workout name cannot be empty')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingWorkoutName.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update workout name')
      }

      const { workout: updatedWorkout } = await response.json()
      
      // Update the weeks state
      setWeeks(prev => prev.map(week => ({
        ...week,
        workouts: week.workouts.map(workout => 
          workout.id === workoutId 
            ? { ...workout, name: updatedWorkout.name }
            : workout
        )
      })))
      
      setEditingWorkoutId(null)
      setEditingWorkoutName('')
      
      console.log('Workout name updated successfully:', updatedWorkout)
    } catch (error) {
      console.error('Error updating workout name:', error)
      setError(error instanceof Error ? error.message : 'Failed to update workout name')
    } finally {
      setIsLoading(false)
    }
  }, [editingWorkoutName])

  const handleDeleteExercise = useCallback(async (exerciseId: string, exerciseName: string) => {
    if (!confirm(`Are you sure you want to delete "${exerciseName}"? This cannot be undone.`)) {
      return
    }

    setDeletingExerciseId(exerciseId)
    setError(null)

    try {
      const response = await fetch(`/api/exercises/${exerciseId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete exercise')
      }
      
      // Remove exercise from weeks state
      setWeeks(prev => prev.map(week => ({
        ...week,
        workouts: week.workouts.map(workout => ({
          ...workout,
          exercises: workout.exercises.filter(exercise => exercise.id !== exerciseId)
        }))
      })))
      
      console.log('Exercise deleted successfully')
    } catch (error) {
      console.error('Error deleting exercise:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete exercise')
    } finally {
      setDeletingExerciseId(null)
    }
  }, [])

  const handleDeleteWorkout = useCallback(async (workoutId: string, workoutName: string) => {
    if (!confirm(`Are you sure you want to delete "${workoutName}" and all its exercises? This cannot be undone.`)) {
      return
    }

    setDeletingWorkoutId(workoutId)
    setError(null)

    try {
      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete workout')
      }
      
      // Remove workout from weeks state
      setWeeks(prev => prev.map(week => ({
        ...week,
        workouts: week.workouts.filter(workout => workout.id !== workoutId)
      })))
      
      console.log('Workout deleted successfully')
    } catch (error) {
      console.error('Error deleting workout:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete workout')
    } finally {
      setDeletingWorkoutId(null)
    }
  }, [])

  const toggleWorkoutCollapse = useCallback((workoutId: string) => {
    setCollapsedWorkouts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(workoutId)) {
        newSet.delete(workoutId)
      } else {
        newSet.add(workoutId)
      }
      return newSet
    })
  }, [])

  const handleExerciseSelect = useCallback(async (exercise: { id: string; name: string }, prescription: { sets: Array<{ setNumber: number; reps: string; intensityType: 'RIR' | 'RPE' | 'NONE'; intensityValue?: number }>; notes?: string }) => {
    if (!selectedWorkoutId) return

    setIsLoading(true)
    setError(null)

    try {
      if (editingExercise) {
        // Update existing exercise
        const response = await fetch(`/api/exercises/${editingExercise.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notes: prescription.notes,
            prescribedSets: prescription.sets.map(set => ({
              setNumber: set.setNumber,
              reps: set.reps,
              weight: '',
              rpe: set.intensityType === 'RPE' ? set.intensityValue : null,
              rir: set.intensityType === 'RIR' ? set.intensityValue : null
            }))
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update exercise')
        }

        const { exercise: updatedExercise } = await response.json()
        
        // Update the weeks state to include the updated exercise
        setWeeks(prev => prev.map(week => ({
          ...week,
          workouts: week.workouts.map(workout => 
            workout.id === selectedWorkoutId 
              ? { 
                  ...workout, 
                  exercises: workout.exercises.map(ex => 
                    ex.id === editingExercise.id ? updatedExercise : ex
                  )
                }
              : workout
          )
        })))
        
        console.log('Exercise updated successfully:', updatedExercise)
      } else {
        // Add new exercise
        const response = await fetch(`/api/workouts/${selectedWorkoutId}/exercises`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            exerciseDefinitionId: exercise.id,
            notes: prescription.notes,
            prescribedSets: prescription.sets.map(set => ({
              setNumber: set.setNumber,
              reps: set.reps,
              weight: '',
              rpe: set.intensityType === 'RPE' ? set.intensityValue : null,
              rir: set.intensityType === 'RIR' ? set.intensityValue : null
            }))
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to add exercise')
        }

        const { exercise: newExercise } = await response.json()
        
        // Update the weeks state to include the new exercise
        setWeeks(prev => prev.map(week => ({
          ...week,
          workouts: week.workouts.map(workout => 
            workout.id === selectedWorkoutId 
              ? { ...workout, exercises: [...workout.exercises, newExercise] }
              : workout
          )
        })))
        
        console.log('Exercise added successfully:', newExercise)
      }
    } catch (error) {
      console.error('Error with exercise:', error)
      setError(error instanceof Error ? error.message : `Failed to ${editingExercise ? 'update' : 'add'} exercise`)
    } finally {
      setIsLoading(false)
      setSelectedWorkoutId(null)
      setEditingExercise(null)
    }
  }, [selectedWorkoutId, editingExercise])

  const closeExerciseModal = useCallback(() => {
    setShowExerciseModal(false)
    setSelectedWorkoutId(null)
    setEditingExercise(null)
  }, [])

  // Auto-save program details in edit mode
  const updateProgramDetails = useCallback(async () => {
    if (!editMode || !programId || !programName.trim()) return

    try {
      const response = await fetch(`/api/programs/${programId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: programName.trim(),
          description: programDescription.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update program')
      }
    } catch (error) {
      console.error('Error updating program details:', error)
      setError(error instanceof Error ? error.message : 'Failed to update program')
    }
  }, [editMode, programId, programName, programDescription])

  // Debounce auto-save when program details change
  useEffect(() => {
    if (!editMode) return

    const timeoutId = setTimeout(() => {
      updateProgramDetails()
    }, 1000) // 1 second delay

    return () => clearTimeout(timeoutId)
  }, [editMode, updateProgramDetails])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-3">
        {/* Program Form */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editMode ? 'Edit Program Details' : 'Program Details'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="programName" className="block text-sm font-medium text-gray-700 mb-1">
                Program Name *
              </label>
              <input
                id="programName"
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Enter program name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="programDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                id="programDescription"
                value={programDescription}
                onChange={(e) => setProgramDescription(e.target.value)}
                placeholder="Describe your program goals and approach"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>

            <div className="text-sm text-gray-600">
              <strong>Type:</strong> Strength Training
            </div>

            {!editMode && !programId && (
              <button
                onClick={createProgram}
                disabled={isLoading || !programName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Program'}
              </button>
            )}
            {editMode && (
              <div className="text-sm text-gray-500">
                Program changes are saved automatically
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* Weeks Management */}
        {(programId || editMode) && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Training Weeks</h2>
            
            {weeks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No weeks created yet</p>
                <button
                  onClick={() => addWeek()}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Add Week 1
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {weeks.map((week) => (
                  <div key={week.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">Week {week.weekNumber}</h3>
                      <button
                        onClick={() => addWorkout(week.id)}
                        disabled={isLoading}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        Add Workout
                      </button>
                    </div>

                    {week.workouts.length === 0 ? (
                      <div className="text-gray-500 text-sm py-2">No workouts yet</div>
                    ) : (
                      <div className="space-y-2">
                        {week.workouts.map((workout) => {
                          const isCollapsed = collapsedWorkouts.has(workout.id)
                          return (
                            <div key={workout.id} className="bg-gray-50 rounded p-3">
                              <div className="flex items-center justify-between mb-2">
                                {editingWorkoutId === workout.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    value={editingWorkoutName}
                                    onChange={(e) => setEditingWorkoutName(e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveWorkoutName(workout.id)
                                      } else if (e.key === 'Escape') {
                                        handleCancelWorkoutEdit()
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveWorkoutName(workout.id)}
                                    disabled={isLoading}
                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelWorkoutEdit}
                                    className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-1">
                                  <button
                                    onClick={() => toggleWorkoutCollapse(workout.id)}
                                    className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors"
                                  >
                                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                  </button>
                                  <span className="font-medium">{workout.name}</span>
                                  <span className="text-xs text-gray-500">
                                    ({workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''})
                                  </span>
                                  <button
                                    onClick={() => handleStartWorkoutEdit(workout.id, workout.name)}
                                    className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                                  >
                                    Rename
                                  </button>
                                </div>
                              )}
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleAddExercise(workout.id)}
                                  disabled={isLoading || deletingWorkoutId === workout.id}
                                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                  Add Exercise
                                </button>
                                <button
                                  onClick={() => handleDeleteWorkout(workout.id, workout.name)}
                                  disabled={deletingWorkoutId === workout.id || editingWorkoutId === workout.id}
                                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  {deletingWorkoutId === workout.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </div>
                            
                            {!isCollapsed && (
                              <>
                                {workout.exercises.length === 0 ? (
                                  <div className="text-gray-500 text-xs">No exercises yet</div>
                                ) : (
                                  <div className="space-y-2">
                                    {workout.exercises.map((exercise) => (
                                      <div key={exercise.id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                                        <div className="flex-1">
                                          <span className="font-medium text-sm">{exercise.name}</span>
                                          <span className="text-gray-600 text-sm ml-2">
                                            ({exercise.prescribedSets.length} set{exercise.prescribedSets.length !== 1 ? 's' : ''})
                                          </span>
                                          {exercise.notes && (
                                            <div className="text-xs text-gray-500 mt-1">{exercise.notes}</div>
                                          )}
                                        </div>
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => handleEditExercise(exercise, workout.id)}
                                            disabled={isLoading || deletingExerciseId === exercise.id}
                                            className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 disabled:opacity-50"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteExercise(exercise.id, exercise.name)}
                                            disabled={deletingExerciseId === exercise.id}
                                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                                          >
                                            {deletingExerciseId === exercise.id ? 'Deleting...' : 'Delete'}
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex gap-2">
                  <button
                    onClick={() => addWeek()}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Add Week {weeks.length + 1}
                  </button>
                  
                  {weeks.length > 0 && (
                    <button
                      onClick={() => addWeek(weeks[weeks.length - 1].id)}
                      disabled={isLoading}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                    >
                      Duplicate Week {weeks.length}
                    </button>
                  )}
                </div>
              </div>
            )}

            {(programId || editMode) && weeks.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={handleComplete}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {editMode ? 'Done Editing' : 'Complete & View Program'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar - FAU Visualization */}
      <div className="lg:col-span-1">
        <FAUVolumeVisualization weeks={weeks} />
      </div>

      {/* Exercise Search Modal */}
      <ExerciseSearchModal
        isOpen={showExerciseModal}
        onClose={closeExerciseModal}
        onExerciseSelect={handleExerciseSelect}
        editingExercise={editingExercise}
      />
    </div>
  )
}