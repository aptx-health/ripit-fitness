import { useState, useCallback, useEffect, useRef } from 'react'
import type { Week, WeekSummary, ExistingProgram } from '@/types/program-builder'

type UseProgramWeekStateParams = {
  editMode: boolean
  existingProgram?: ExistingProgram
  programId: string | null
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export function useProgramWeekState({
  editMode,
  existingProgram,
  programId,
  setIsLoading,
  setError,
}: UseProgramWeekStateParams) {
  const [weeksSummary, setWeeksSummary] = useState<WeekSummary[]>(
    editMode && existingProgram ? existingProgram.weeksSummary : []
  )
  const [weeksCache, setWeeksCache] = useState<Map<number, Week>>(() => {
    const cache = new Map<number, Week>()
    if (editMode && existingProgram?.initialWeek) {
      cache.set(existingProgram.initialWeek.weekNumber, existingProgram.initialWeek)
    }
    return cache
  })
  const [weeks, setWeeks] = useState<Week[]>([])
  const [currentWeekIndex, setCurrentWeekIndex] = useState(() => {
    if (editMode && existingProgram?.initialWeek) {
      const idx = existingProgram.weeksSummary.findIndex(
        w => w.weekNumber === existingProgram.initialWeek?.weekNumber
      )
      return idx >= 0 ? idx : 0
    }
    return 0
  })
  const [isLoadingWeek, setIsLoadingWeek] = useState(false)
  const [collapsedWorkouts, setCollapsedWorkouts] = useState<Set<string>>(new Set())

  // Deletion/duplication loading states for weeks
  const [deletingWeekId, setDeletingWeekId] = useState<string | null>(null)
  const [duplicatingWeekId, setDuplicatingWeekId] = useState<string | null>(null)

  // Week name editing state
  const [editingWeekNameId, setEditingWeekNameId] = useState<string | null>(null)
  const [editingWeekName, setEditingWeekName] = useState('')
  const [editingWeekDescription, setEditingWeekDescription] = useState('')

  // Week transformation state
  const [showTransformModal, setShowTransformModal] = useState(false)
  const [transformWeekId, setTransformWeekId] = useState<string | null>(null)
  const [transformWeekNumber, setTransformWeekNumber] = useState<number>(0)

  const getCurrentWeekData = useCallback((): Week | null => {
    if (editMode) {
      const weekNumber = weeksSummary[currentWeekIndex]?.weekNumber
      return weekNumber ? weeksCache.get(weekNumber) || null : null
    }
    return weeks[currentWeekIndex] || null
  }, [editMode, weeksSummary, currentWeekIndex, weeksCache, weeks])

  const fetchWeek = useCallback(async (weekNumber: number): Promise<Week | null> => {
    if (!programId) return null

    try {
      setIsLoadingWeek(true)
      const response = await fetch(`/api/programs/${programId}/weeks/${weekNumber}`)
      const data = await response.json()

      if (data.success && data.week) {
        setWeeksCache(prev => new Map(prev).set(weekNumber, data.week))
        return data.week
      }
      return null
    } catch (error) {
      console.error('Error fetching week:', error)
      setError('Failed to load week data')
      return null
    } finally {
      setIsLoadingWeek(false)
    }
  }, [programId, setError])

  const updateWeekData = useCallback((updater: (week: Week) => Week) => {
    if (editMode) {
      setWeeksCache(prev => {
        const newCache = new Map(prev)
        for (const [weekNum, week] of newCache) {
          newCache.set(weekNum, updater(week))
        }
        return newCache
      })
    } else {
      setWeeks(prev => prev.map(updater))
    }
  }, [editMode])

  const navigateToWeek = useCallback(async (newIndex: number) => {
    if (newIndex < 0) return

    if (editMode) {
      if (newIndex >= weeksSummary.length) return
      setCurrentWeekIndex(newIndex)
      const weekNumber = weeksSummary[newIndex]?.weekNumber
      if (weekNumber && !weeksCache.has(weekNumber)) {
        await fetchWeek(weekNumber)
      }
    } else {
      if (newIndex >= weeks.length) return
      setCurrentWeekIndex(newIndex)
    }
  }, [editMode, weeksSummary, weeksCache, weeks, fetchWeek])

  const addWeek = useCallback(async (sourceWeekId?: string) => {
    if (!programId) return

    setIsLoading(true)
    setError(null)

    try {
      const existingWeeks = editMode ? weeksSummary : weeks
      const nextWeekNumber = existingWeeks.length > 0
        ? Math.max(...existingWeeks.map(w => w.weekNumber)) + 1
        : 1

      const response = await fetch(`/api/programs/${programId}/weeks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekNumber: nextWeekNumber, sourceWeekId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add week')
      }

      const { week } = await response.json()

      if (editMode) {
        setWeeksSummary(prev => {
          const updated = [...prev, { id: week.id, weekNumber: week.weekNumber }]
            .sort((a, b) => a.weekNumber - b.weekNumber)
          setCurrentWeekIndex(updated.length - 1)
          return updated
        })
        setWeeksCache(prev => new Map(prev).set(week.weekNumber, week))
      } else {
        setWeeks(prev => {
          const updated = [...prev, week].sort((a, b) => a.weekNumber - b.weekNumber)
          setCurrentWeekIndex(updated.length - 1)
          return updated
        })
      }

      console.log('Week added successfully:', week)
    } catch (error) {
      console.error('Error adding week:', error)
      setError(error instanceof Error ? error.message : 'Failed to add week')
    } finally {
      setIsLoading(false)
    }
  }, [programId, editMode, weeksSummary, weeks, setIsLoading, setError])

  const handleDeleteWeek = useCallback(async (weekId: string, weekNumber: number) => {
    if (!confirm(`Are you sure you want to delete Week ${weekNumber} and all its workouts? This cannot be undone.`)) {
      return
    }

    setDeletingWeekId(weekId)
    setError(null)

    try {
      const response = await fetch(`/api/weeks/${weekId}`, { method: 'DELETE' })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete week')
      }

      const { renumberedWeeks } = await response.json()

      if (editMode) {
        // Rebuild weeksSummary from renumbered data
        setWeeksSummary(() => {
          const updated = (renumberedWeeks as Array<{ id: string; weekNumber: number }>)
            .sort((a: { weekNumber: number }, b: { weekNumber: number }) => a.weekNumber - b.weekNumber)
          if (currentWeekIndex >= updated.length && updated.length > 0) {
            setCurrentWeekIndex(updated.length - 1)
          }
          return updated
        })
        // Rebuild cache with new week numbers
        setWeeksCache(prev => {
          const newCache = new Map<number, Week>()
          for (const rw of renumberedWeeks as Array<{ id: string; weekNumber: number }>) {
            // Find cached week by id (may be under old weekNumber key)
            for (const [, cachedWeek] of prev) {
              if (cachedWeek.id === rw.id) {
                newCache.set(rw.weekNumber, { ...cachedWeek, weekNumber: rw.weekNumber })
                break
              }
            }
          }
          return newCache
        })
      } else {
        setWeeks(prev => {
          const updated = prev
            .filter(w => w.id !== weekId)
            .map(w => {
              const renumbered = (renumberedWeeks as Array<{ id: string; weekNumber: number }>)
                .find((rw: { id: string }) => rw.id === w.id)
              return renumbered ? { ...w, weekNumber: renumbered.weekNumber } : w
            })
            .sort((a, b) => a.weekNumber - b.weekNumber)
          if (currentWeekIndex >= updated.length && updated.length > 0) {
            setCurrentWeekIndex(updated.length - 1)
          }
          return updated
        })
      }
    } catch (error) {
      console.error('Error deleting week:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete week')
    } finally {
      setDeletingWeekId(null)
    }
  }, [editMode, currentWeekIndex, setError])

  const handleDuplicateWeek = useCallback(async (weekId: string) => {
    setDuplicatingWeekId(weekId)
    setError(null)

    try {
      const response = await fetch(`/api/weeks/${weekId}/duplicate`, { method: 'POST' })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate week')
      }

      const { week: newWeek } = await response.json()

      if (editMode) {
        setWeeksSummary(prev => {
          const updated = [...prev, { id: newWeek.id, weekNumber: newWeek.weekNumber }]
          setCurrentWeekIndex(updated.length - 1)
          return updated
        })
        setWeeksCache(prev => new Map(prev).set(newWeek.weekNumber, newWeek))
      } else {
        setWeeks(prev => {
          const updated = [...prev, newWeek]
          setCurrentWeekIndex(updated.length - 1)
          return updated
        })
      }

      console.log('Week duplicated successfully')
    } catch (error) {
      console.error('Error duplicating week:', error)
      setError(error instanceof Error ? error.message : 'Failed to duplicate week')
    } finally {
      setDuplicatingWeekId(null)
    }
  }, [editMode, setError])

  const handleOpenTransformModal = useCallback((weekId: string, weekNumber: number) => {
    setTransformWeekId(weekId)
    setTransformWeekNumber(weekNumber)
    setShowTransformModal(true)
  }, [])

  const handleTransformWeek = useCallback(async (updatedWeek: Week) => {
    try {
      if (editMode) {
        setWeeksCache(prev => new Map(prev).set(updatedWeek.weekNumber, updatedWeek))
      } else {
        setWeeks(prev => prev.map(w => w.id === updatedWeek.id ? updatedWeek : w))
      }
      console.log('Week transformed successfully')
    } catch (error) {
      console.error('Error updating week after transform:', error)
      throw error
    }
  }, [editMode])

  const handleStartWeekNameEdit = useCallback((weekId: string, currentName?: string | null, currentDescription?: string | null) => {
    setEditingWeekNameId(weekId)
    setEditingWeekName(currentName || '')
    setEditingWeekDescription(currentDescription || '')
  }, [])

  const handleCancelWeekNameEdit = useCallback(() => {
    setEditingWeekNameId(null)
    setEditingWeekName('')
    setEditingWeekDescription('')
  }, [])

  const handleSaveWeekName = useCallback(async (weekId: string) => {
    setError(null)

    try {
      const response = await fetch(`/api/weeks/${weekId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingWeekName,
          description: editingWeekDescription,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update week name')
      }

      const { week: updatedWeek } = await response.json()

      // Update the week in cache/state
      if (editMode) {
        setWeeksCache(prev => {
          const newCache = new Map(prev)
          for (const [weekNum, week] of newCache) {
            if (week.id === weekId) {
              newCache.set(weekNum, { ...week, name: updatedWeek.name, description: updatedWeek.description })
              break
            }
          }
          return newCache
        })
        setWeeksSummary(prev =>
          prev.map(w => w.id === weekId ? { ...w, name: updatedWeek.name, description: updatedWeek.description } : w)
        )
      } else {
        setWeeks(prev => prev.map(w =>
          w.id === weekId ? { ...w, name: updatedWeek.name, description: updatedWeek.description } : w
        ))
      }

      setEditingWeekNameId(null)
      setEditingWeekName('')
      setEditingWeekDescription('')
    } catch (error) {
      console.error('Error updating week name:', error)
      setError(error instanceof Error ? error.message : 'Failed to update week name')
    }
  }, [editMode, editingWeekName, editingWeekDescription, setError])

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

  // Prefetch all weeks sequentially in background (edit mode only)
  const prefetchStarted = useRef(false)
  useEffect(() => {
    if (!editMode || !programId || prefetchStarted.current) return
    if (weeksSummary.length <= 1) return

    prefetchStarted.current = true

    const prefetchAllWeeks = async () => {
      for (const weekSummary of weeksSummary) {
        if (weeksCache.has(weekSummary.weekNumber)) continue

        try {
          const response = await fetch(`/api/programs/${programId}/weeks/${weekSummary.weekNumber}`)
          const data = await response.json()

          if (data.success && data.week) {
            setWeeksCache(prev => new Map(prev).set(weekSummary.weekNumber, data.week))
          }
        } catch (error) {
          console.error(`Failed to prefetch week ${weekSummary.weekNumber}:`, error)
        }
      }
    }

    const timeoutId = setTimeout(prefetchAllWeeks, 500)
    return () => clearTimeout(timeoutId)
  }, [editMode, programId, weeksSummary, weeksCache])

  return {
    weeksSummary,
    setWeeksSummary,
    weeksCache,
    setWeeksCache,
    weeks,
    setWeeks,
    currentWeekIndex,
    setCurrentWeekIndex,
    isLoadingWeek,
    collapsedWorkouts,
    deletingWeekId,
    duplicatingWeekId,
    showTransformModal,
    setShowTransformModal,
    transformWeekId,
    transformWeekNumber,
    getCurrentWeekData,
    fetchWeek,
    updateWeekData,
    navigateToWeek,
    addWeek,
    handleDeleteWeek,
    handleDuplicateWeek,
    handleOpenTransformModal,
    handleTransformWeek,
    toggleWorkoutCollapse,
    editingWeekNameId,
    editingWeekName,
    setEditingWeekName,
    editingWeekDescription,
    setEditingWeekDescription,
    handleStartWeekNameEdit,
    handleCancelWeekNameEdit,
    handleSaveWeekName,
  }
}
