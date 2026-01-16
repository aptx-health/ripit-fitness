'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, MoreVertical } from 'lucide-react'
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
  const [deletingWeekId, setDeletingWeekId] = useState<string | null>(null)

  // Collapsed workouts state
  const [collapsedWorkouts, setCollapsedWorkouts] = useState<Set<string>>(new Set())

  // Week menu state
  const [openWeekMenuId, setOpenWeekMenuId] = useState<string | null>(null)
  const weekMenuRef = useRef<HTMLDivElement>(null)

  // Workout menu state
  const [openWorkoutMenuId, setOpenWorkoutMenuId] = useState<string | null>(null)
  const workoutMenuRef = useRef<HTMLDivElement>(null)

  // Workout action modals
  const [showDuplicateWorkoutModal, setShowDuplicateWorkoutModal] = useState(false)
  const [showSwapWorkoutModal, setShowSwapWorkoutModal] = useState(false)
  const [selectedWorkoutForAction, setSelectedWorkoutForAction] = useState<{ id: string; name: string } | null>(null)
  const [targetWeekForDuplicate, setTargetWeekForDuplicate] = useState<string>('')
  const [targetWeekForSwap, setTargetWeekForSwap] = useState<string>('')

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

  const handleDeleteWeek = useCallback(async (weekId: string, weekNumber: number) => {
    if (!confirm(`Are you sure you want to delete Week ${weekNumber} and all its workouts? This cannot be undone.`)) {
      return
    }

    setDeletingWeekId(weekId)
    setError(null)

    try {
      // Delete all workouts in the week
      const week = weeks.find(w => w.id === weekId)
      if (!week) return

      for (const workout of week.workouts) {
        await fetch(`/api/workouts/${workout.id}`, {
          method: 'DELETE',
        })
      }

      // Remove week from state
      setWeeks(prev => prev.filter(w => w.id !== weekId))

      console.log('Week deleted successfully')
    } catch (error) {
      console.error('Error deleting week:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete week')
    } finally {
      setDeletingWeekId(null)
      setOpenWeekMenuId(null)
    }
  }, [weeks])

  const handleDuplicateWeek = useCallback(async (weekId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/weeks/${weekId}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate week')
      }

      const { week: newWeek } = await response.json()

      // Add duplicated week to state
      setWeeks(prev => [...prev, newWeek])

      console.log('Week duplicated successfully')
    } catch (error) {
      console.error('Error duplicating week:', error)
      setError(error instanceof Error ? error.message : 'Failed to duplicate week')
    } finally {
      setIsLoading(false)
      setOpenWeekMenuId(null)
    }
  }, [])

  const handleDuplicateWorkout = useCallback(async () => {
    if (!selectedWorkoutForAction || !targetWeekForDuplicate) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/workouts/${selectedWorkoutForAction.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWeekId: targetWeekForDuplicate }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate workout')
      }

      const { workout: newWorkout } = await response.json()

      // Add duplicated workout to the target week
      setWeeks(prev => prev.map(week =>
        week.id === targetWeekForDuplicate
          ? { ...week, workouts: [...week.workouts, newWorkout] }
          : week
      ))

      console.log('Workout duplicated successfully')
      setShowDuplicateWorkoutModal(false)
      setSelectedWorkoutForAction(null)
      setTargetWeekForDuplicate('')
    } catch (error) {
      console.error('Error duplicating workout:', error)
      setError(error instanceof Error ? error.message : 'Failed to duplicate workout')
    } finally {
      setIsLoading(false)
    }
  }, [selectedWorkoutForAction, targetWeekForDuplicate])

  const handleSwapWorkout = useCallback(async () => {
    if (!selectedWorkoutForAction || !targetWeekForSwap) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/workouts/${selectedWorkoutForAction.id}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWeekId: targetWeekForSwap }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to swap workout')
      }

      const { workout: updatedWorkout } = await response.json()

      // Move workout to target week
      setWeeks(prev => prev.map(week => ({
        ...week,
        workouts: week.id === targetWeekForSwap
          ? [...week.workouts.filter(w => w.id !== selectedWorkoutForAction.id), updatedWorkout]
          : week.workouts.filter(w => w.id !== selectedWorkoutForAction.id)
      })))

      console.log('Workout swapped successfully')
      setShowSwapWorkoutModal(false)
      setSelectedWorkoutForAction(null)
      setTargetWeekForSwap('')
    } catch (error) {
      console.error('Error swapping workout:', error)
      setError(error instanceof Error ? error.message : 'Failed to swap workout')
    } finally {
      setIsLoading(false)
    }
  }, [selectedWorkoutForAction, targetWeekForSwap])

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

  // Close week menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (weekMenuRef.current && !weekMenuRef.current.contains(event.target as Node)) {
        setOpenWeekMenuId(null)
      }
    }

    if (openWeekMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openWeekMenuId])

  // Close workout menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (workoutMenuRef.current && !workoutMenuRef.current.contains(event.target as Node)) {
        setOpenWorkoutMenuId(null)
      }
    }

    if (openWorkoutMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openWorkoutMenuId])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-3">
        {/* Program Form */}
        <div className="bg-card p-6 mb-6 doom-noise doom-card">
          <h2 className="text-xl font-semibold text-foreground mb-4 doom-heading">
            {editMode ? 'EDIT PROGRAM DETAILS' : 'PROGRAM DETAILS'}
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="programName" className="block text-sm font-medium text-foreground mb-1 doom-label">
                PROGRAM NAME *
              </label>
              <input
                id="programName"
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Enter program name"
                className="w-full doom-input"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="programDescription" className="block text-sm font-medium text-foreground mb-1 doom-label">
                DESCRIPTION (OPTIONAL)
              </label>
              <textarea
                id="programDescription"
                value={programDescription}
                onChange={(e) => setProgramDescription(e.target.value)}
                placeholder="Describe your program goals and approach"
                rows={3}
                className="w-full doom-input"
                disabled={isLoading}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <strong>Type:</strong> Strength Training
            </div>

            {!editMode && !programId && (
              <button
                onClick={createProgram}
                disabled={isLoading || !programName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
              >
                {isLoading ? 'CREATING...' : 'CREATE PROGRAM'}
              </button>
            )}
            {editMode && (
              <div className="text-sm text-muted-foreground">
                Program changes are saved automatically
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-error-muted border border-error-border rounded-lg p-4 mb-6">
            <div className="text-error">{error}</div>
          </div>
        )}

        {/* Weeks Management */}
        {(programId || editMode) && (
          <div className="bg-card p-6 doom-noise doom-card">
            <h2 className="text-xl font-semibold text-foreground mb-4 doom-heading">TRAINING WEEKS</h2>

            {weeks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No weeks created yet</p>
                <button
                  onClick={() => addWeek()}
                  disabled={isLoading}
                  className="px-4 py-2 bg-success text-success-foreground hover:bg-success-hover disabled:opacity-50 doom-button-3d font-semibold uppercase tracking-wider"
                >
                  ADD WEEK 1
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {weeks.map((week) => (
                  <div key={week.id} className="border border-border p-4 doom-noise doom-corners">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground doom-heading">WEEK {week.weekNumber}</h3>

                        {/* Week Menu */}
                        <div className="relative" ref={openWeekMenuId === week.id ? weekMenuRef : null}>
                          <button
                            onClick={() => setOpenWeekMenuId(openWeekMenuId === week.id ? null : week.id)}
                            disabled={isLoading || deletingWeekId === week.id}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded disabled:opacity-50 transition-colors"
                            title="Week options"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {openWeekMenuId === week.id && (
                            <div className="absolute left-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-10 doom-corners">
                              <button
                                onClick={() => handleDuplicateWeek(week.id)}
                                disabled={isLoading}
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                Duplicate Week
                              </button>
                              <button
                                onClick={() => handleDeleteWeek(week.id, week.weekNumber)}
                                disabled={deletingWeekId === week.id}
                                className="w-full px-4 py-2 text-left text-sm text-error hover:bg-error-muted transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                {deletingWeekId === week.id ? 'Deleting...' : 'Delete Week'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => addWorkout(week.id)}
                        disabled={isLoading}
                        className="px-3 py-1 bg-primary text-primary-foreground text-sm hover:bg-primary-hover disabled:opacity-50 doom-button-3d font-semibold uppercase"
                      >
                        ADD WORKOUT
                      </button>
                    </div>

                    {week.workouts.length === 0 ? (
                      <div className="text-muted-foreground text-sm py-2">No workouts yet</div>
                    ) : (
                      <div className="space-y-2">
                        {week.workouts.map((workout) => {
                          const isCollapsed = collapsedWorkouts.has(workout.id)
                          return (
                            <div key={workout.id} className="bg-muted p-3 doom-card">
                              <div className="flex items-center justify-between mb-2">
                                {editingWorkoutId === workout.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    value={editingWorkoutName}
                                    onChange={(e) => setEditingWorkoutName(e.target.value)}
                                    className="px-2 py-1 border border-input rounded text-sm flex-1 bg-muted text-foreground"
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
                                    className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary-hover disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelWorkoutEdit}
                                    className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded hover:bg-secondary-hover"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-1">
                                  <button
                                    onClick={() => toggleWorkoutCollapse(workout.id)}
                                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                  </button>
                                  <span className="font-medium text-foreground doom-heading">{workout.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''})
                                  </span>

                                  {/* Workout Menu */}
                                  <div className="relative" ref={openWorkoutMenuId === workout.id ? workoutMenuRef : null}>
                                    <button
                                      onClick={() => setOpenWorkoutMenuId(openWorkoutMenuId === workout.id ? null : workout.id)}
                                      disabled={isLoading || deletingWorkoutId === workout.id}
                                      className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded disabled:opacity-50 transition-colors"
                                      title="Workout options"
                                    >
                                      <MoreVertical size={16} />
                                    </button>

                                    {openWorkoutMenuId === workout.id && (
                                      <div className="absolute left-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-10 doom-corners">
                                        <button
                                          onClick={() => {
                                            handleStartWorkoutEdit(workout.id, workout.name)
                                            setOpenWorkoutMenuId(null)
                                          }}
                                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                                        >
                                          Rename
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedWorkoutForAction({ id: workout.id, name: workout.name })
                                            setShowDuplicateWorkoutModal(true)
                                            setOpenWorkoutMenuId(null)
                                          }}
                                          disabled={isLoading}
                                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                          Duplicate
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedWorkoutForAction({ id: workout.id, name: workout.name })
                                            setShowSwapWorkoutModal(true)
                                            setOpenWorkoutMenuId(null)
                                          }}
                                          disabled={isLoading}
                                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                          Move to Week
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleDeleteWorkout(workout.id, workout.name)
                                            setOpenWorkoutMenuId(null)
                                          }}
                                          disabled={deletingWorkoutId === workout.id}
                                          className="w-full px-4 py-2 text-left text-sm text-error hover:bg-error-muted transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                          {deletingWorkoutId === workout.id ? 'Deleting...' : 'Delete'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleAddExercise(workout.id)}
                                  disabled={isLoading || deletingWorkoutId === workout.id}
                                  className="px-2 py-1 bg-success text-success-foreground text-xs rounded hover:bg-success-hover disabled:opacity-50"
                                >
                                  Add Exercise
                                </button>
                              </div>
                            </div>
                            
                            {!isCollapsed && (
                              <>
                                {workout.exercises.length === 0 ? (
                                  <div className="text-muted-foreground text-xs">No exercises yet</div>
                                ) : (
                                  <div className="space-y-2">
                                    {workout.exercises.map((exercise) => (
                                      <div key={exercise.id} className="flex items-center justify-between bg-muted rounded p-2">
                                        <div className="flex-1">
                                          <span className="font-medium text-sm text-foreground">{exercise.name}</span>
                                          <span className="text-muted-foreground text-sm ml-2">
                                            ({exercise.prescribedSets.length} set{exercise.prescribedSets.length !== 1 ? 's' : ''})
                                          </span>
                                          {exercise.notes && (
                                            <div className="text-xs text-muted-foreground mt-1">{exercise.notes}</div>
                                          )}
                                        </div>
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => handleEditExercise(exercise, workout.id)}
                                            disabled={isLoading || deletingExerciseId === exercise.id}
                                            className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded hover:bg-secondary-hover disabled:opacity-50"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteExercise(exercise.id, exercise.name)}
                                            disabled={deletingExerciseId === exercise.id}
                                            className="px-2 py-1 bg-error text-error-foreground text-xs rounded hover:bg-error-hover disabled:opacity-50"
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

                <button
                  onClick={() => addWeek()}
                  disabled={isLoading}
                  className="px-4 py-2 bg-success text-success-foreground hover:bg-success-hover disabled:opacity-50 doom-button-3d font-semibold uppercase tracking-wider"
                >
                  ADD WEEK {weeks.length + 1}
                </button>
              </div>
            )}

            {(programId || editMode) && weeks.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={handleComplete}
                  className="px-6 py-2 bg-success text-success-foreground hover:bg-success-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
                >
                  {editMode ? 'DONE EDITING' : 'COMPLETE & VIEW PROGRAM'}
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

      {/* Duplicate Workout Modal */}
      {showDuplicateWorkoutModal && selectedWorkoutForAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 doom-corners">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Duplicate "{selectedWorkoutForAction.name}"
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select the week to duplicate this workout into:
            </p>
            <select
              value={targetWeekForDuplicate}
              onChange={(e) => setTargetWeekForDuplicate(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-muted text-foreground mb-4"
            >
              <option value="">Select a week...</option>
              {weeks.map(week => (
                <option key={week.id} value={week.id}>
                  Week {week.weekNumber}
                </option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDuplicateWorkoutModal(false)
                  setSelectedWorkoutForAction(null)
                  setTargetWeekForDuplicate('')
                }}
                className="px-4 py-2 text-foreground bg-card border border-input rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicateWorkout}
                disabled={!targetWeekForDuplicate || isLoading}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
              >
                {isLoading ? 'Duplicating...' : 'Duplicate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swap Workout Modal */}
      {showSwapWorkoutModal && selectedWorkoutForAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 doom-corners">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Move "{selectedWorkoutForAction.name}"
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select the week to move this workout to:
            </p>
            <select
              value={targetWeekForSwap}
              onChange={(e) => setTargetWeekForSwap(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-muted text-foreground mb-4"
            >
              <option value="">Select a week...</option>
              {weeks.map(week => (
                <option key={week.id} value={week.id}>
                  Week {week.weekNumber}
                </option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSwapWorkoutModal(false)
                  setSelectedWorkoutForAction(null)
                  setTargetWeekForSwap('')
                }}
                className="px-4 py-2 text-foreground bg-card border border-input rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleSwapWorkout}
                disabled={!targetWeekForSwap || isLoading}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
              >
                {isLoading ? 'Moving...' : 'Move'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}