import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

/**
 * SSR-safe hook that returns true after hydration (client-side only).
 * Uses useSyncExternalStore to avoid setState-in-useEffect lint warnings.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}
