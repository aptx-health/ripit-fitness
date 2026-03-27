export type LoggedSet = {
  id?: string
  exerciseId: string
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
  isWarmup?: boolean
  /** Client-only transient field for tracking per-set sync status */
  _syncStatus?: 'synced' | 'pending' | 'error'
}
