import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import type { Week } from '@/types/program-builder'

type UseProgramActionsParams = {
  editMode: boolean
  existingProgramId?: string
  existingProgramName?: string
  existingProgramDescription?: string
  weeksCache: Map<number, Week>
  weeks: Week[]
  programId: string | null
  setProgramId: (id: string | null) => void
  setWeeks: React.Dispatch<React.SetStateAction<Week[]>>
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  onComplete?: () => void
}

export function useProgramActions({
  editMode,
  existingProgramId: _existingProgramId,
  existingProgramName,
  existingProgramDescription,
  weeksCache,
  weeks,
  programId,
  setProgramId,
  setWeeks,
  setIsLoading,
  setError,
  onComplete,
}: UseProgramActionsParams) {
  const router = useRouter()

  const [programName, setProgramName] = useState(
    editMode && existingProgramName ? existingProgramName : ''
  )
  const [programDescription, setProgramDescription] = useState(
    editMode && existingProgramDescription ? existingProgramDescription : ''
  )

  // Activation modal state
  const [showActivationModal, setShowActivationModal] = useState(false)
  const [existingActiveProgram, setExistingActiveProgram] = useState<{ id: string; name: string } | null>(null)

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
        headers: { 'Content-Type': 'application/json' },
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

      clientLogger.debug('Program created successfully:', program)
    } catch (error) {
      clientLogger.error('Error creating program:', error)
      setError(error instanceof Error ? error.message : 'Failed to create program')
    } finally {
      setIsLoading(false)
    }
  }, [programName, programDescription, setProgramId, setWeeks, setIsLoading, setError])

  const updateProgramDetails = useCallback(async () => {
    if (!editMode || !programId || !programName.trim()) return

    try {
      const response = await fetch(`/api/programs/${programId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      clientLogger.error('Error updating program details:', error)
      setError(error instanceof Error ? error.message : 'Failed to update program')
    }
  }, [editMode, programId, programName, programDescription, setError])

  // Debounce auto-save when program details change
  useEffect(() => {
    if (!editMode) return

    const timeoutId = setTimeout(() => {
      updateProgramDetails()
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [editMode, updateProgramDetails])

  const handleComplete = useCallback(async () => {
    const emptyWorkouts: string[] = []
    const weeksToValidate = editMode ? Array.from(weeksCache.values()) : weeks

    weeksToValidate.forEach(week => {
      week.workouts.forEach(workout => {
        if (workout.exercises.length === 0) {
          emptyWorkouts.push(`Week ${week.weekNumber} - ${workout.name}`)
        }
      })
    })

    if (emptyWorkouts.length > 0) {
      setError(
        `Cannot save program with empty workouts: ${emptyWorkouts.join(', ')}. ` +
        `Add at least one exercise to each workout or delete them.`
      )
      return
    }

    if (editMode) {
      if (onComplete) {
        onComplete()
        return
      }
      router.push('/training')
      return
    }

    if (!programId) return

    try {
      const response = await fetch('/api/programs')
      const data = await response.json()

      if (data.success && data.programs) {
        const activeProgram = data.programs.find((p: { isActive: boolean; id: string }) => p.isActive && p.id !== programId)
        if (activeProgram) {
          setExistingActiveProgram({ id: activeProgram.id, name: activeProgram.name })
        }
      }
    } catch (error) {
      clientLogger.error('Error checking for active programs:', error)
    }

    setShowActivationModal(true)
  }, [router, editMode, weeksCache, weeks, programId, setError, onComplete])

  const handleDuplicateProgram = useCallback(async () => {
    if (!programId) return

    if (!confirm('Duplicate this program? A copy will be created with all weeks, workouts, and exercises.')) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/duplicate`, { method: 'POST' })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate program')
      }

      const { program: duplicatedProgram } = await response.json()
      clientLogger.debug('Program duplicated successfully:', duplicatedProgram)
      router.push(`/programs/${duplicatedProgram.id}/edit`)
    } catch (error) {
      clientLogger.error('Error duplicating program:', error)
      setError(error instanceof Error ? error.message : 'Failed to duplicate program')
    } finally {
      setIsLoading(false)
    }
  }, [programId, router, setIsLoading, setError])

  return {
    programName,
    setProgramName,
    programDescription,
    setProgramDescription,
    showActivationModal,
    setShowActivationModal,
    existingActiveProgram,
    createProgram,
    updateProgramDetails,
    handleComplete,
    handleDuplicateProgram,
  }
}
