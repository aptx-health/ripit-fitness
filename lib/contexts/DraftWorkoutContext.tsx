'use client'

import { usePathname } from 'next/navigation'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { fetchJsonWithRetry } from '@/lib/api/fetch'
import { clientLogger } from '@/lib/client-logger'

type ActiveDraft = {
  completionId: string
  workoutId: string | null
  workoutName: string
  isAdHoc: boolean
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
  const pathname = usePathname()

  const fetchDraft = useCallback(async () => {
    try {
      const data = await fetchJsonWithRetry<{ draft: ActiveDraft | null }>(
        '/api/workouts/active-draft',
        { cache: 'no-store' }
      )
      setActiveDraft(data.draft)
    } catch (err) {
      clientLogger.error('Failed to fetch active draft:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Refresh on mount AND on pathname change. The logger surfaces (programmed
  // and ad-hoc) mutate draft state — save / discard / complete — and then
  // navigate back to /training. Re-fetching on navigation propagates the
  // server state into the context without each handler having to remember
  // to call refreshDraft itself.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not a value used inside
  useEffect(() => {
    fetchDraft()
  }, [fetchDraft, pathname])

  // Also refresh whenever the window regains focus, so a PWA backgrounded
  // mid-workout and resumed later sees current state.
  useEffect(() => {
    const onFocus = () => fetchDraft()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
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
