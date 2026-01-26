'use client'

import SyncStatusIcon from '../SyncStatusIcon'
import { type SyncStatus } from '@/hooks/useSyncState'

interface ExerciseLoggingHeaderProps {
  currentExerciseIndex: number
  totalExercises: number
  totalLoggedSets: number
  totalPrescribedSets: number
  syncStatus: SyncStatus
  pendingSetsCount: number
  onSyncClick: () => void
}

export default function ExerciseLoggingHeader({
  currentExerciseIndex,
  totalExercises,
  totalLoggedSets,
  totalPrescribedSets,
  syncStatus,
  pendingSetsCount,
  onSyncClick,
}: ExerciseLoggingHeaderProps) {
  return (
    <div className="bg-primary text-white px-4 py-3 border-b border-primary-muted-dark flex-shrink-0 sm:rounded-t-2xl">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-primary-foreground opacity-80">
          Exercise {currentExerciseIndex + 1} of {totalExercises} • {totalLoggedSets}/
          {totalPrescribedSets} sets logged
        </div>

        {/* Sync Status Icon */}
        <SyncStatusIcon
          status={syncStatus}
          pendingCount={pendingSetsCount}
          onClick={onSyncClick}
        />
      </div>
    </div>
  )
}
