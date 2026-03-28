'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { clientLogger } from '@/lib/client-logger'

type ActiveDraft = {
  completionId: string
  workoutId: string
  workoutName: string
}

type DraftWorkoutContextValue = {
  activeDraft: ActiveDraft | null
  isLoading: boolean
  refreshDraft: () => Promise<void>
  clearDraft: () => void
}

const DraftWorkoutContext = createContext<DraftWorkoutContextValue>({
  activeDraft: null,
  isLoading: true,
  refreshDraft: async () => {},
  clearDraft: () => {},
})

export function DraftWorkoutProvider({ children }: { children: ReactNode }) {
  const [activeDraft, setActiveDraft] = useState<ActiveDraft | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchDraft = useCallback(async () => {
    try {
      const res = await fetch('/api/workouts/active-draft')
      if (!res.ok) return
      const data = await res.json()
      setActiveDraft(data.draft)
    } catch (err) {
      clientLogger.error('Failed to fetch active draft:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDraft()
  }, [fetchDraft])

  const clearDraft = useCallback(() => {
    setActiveDraft(null)
  }, [])

  return (
    <DraftWorkoutContext.Provider
      value={{
        activeDraft,
        isLoading,
        refreshDraft: fetchDraft,
        clearDraft,
      }}
    >
      {children}
    </DraftWorkoutContext.Provider>
  )
}

export function useDraftWorkout() {
  return useContext(DraftWorkoutContext)
}
