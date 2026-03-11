'use client'

import type { SyncState } from '@/hooks/useSyncState'

type Props = {
  isOpen: boolean
  onClose: () => void
  syncState: SyncState
  onRetrySync: () => void
  onSyncNow: () => void
  hasUnsavedChanges: boolean
  getDisplayError: () => string | null
  getTimeSinceLastSync: () => string | null
}

export default function SyncDetailsModal({ 
  isOpen, 
  onClose, 
  syncState, 
  onRetrySync,
  onSyncNow,
  hasUnsavedChanges,
  getDisplayError,
  getTimeSinceLastSync 
}: Props) {
  if (!isOpen) return null

  const displayError = getDisplayError()
  const timeSinceSync = getTimeSinceLastSync()

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg max-w-md w-full p-4 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-foreground">Sync Status</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Synced State */}
        {syncState.status === 'synced' && (
          <div className="text-success-text space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span className="font-medium">
                {hasUnsavedChanges ? 'Server synced, local changes pending' : 'All data synced'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {syncState.totalSets} set{syncState.totalSets !== 1 ? 's' : ''} saved to server
            </p>
            {timeSinceSync && (
              <p className="text-sm text-muted-foreground">
                Last sync: {timeSinceSync}
              </p>
            )}

            {/* Unsaved Changes Warning */}
            {hasUnsavedChanges && (
              <div className="bg-warning-muted border border-warning-border rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-warning">⚠</span>
                  <span className="text-sm font-medium text-warning-text">Unsaved Changes</span>
                </div>
                <p className="text-xs text-warning-text">
                  You have local changes (new sets or deletions) that haven&apos;t been synced yet.
                  They will sync automatically after 3 sets or when you complete the workout.
                </p>
              </div>
            )}

            {/* Manual Sync Button for Testing */}
            <div className="bg-primary-muted border border-primary-muted-dark rounded p-3">
              <p className="text-xs text-primary mb-2">Testing Controls</p>
              <button
                onClick={() => {
                  console.log('Force Sync Now button clicked!')
                  onSyncNow()
                }}
                className={`w-full py-2 px-4 rounded text-sm transition-colors ${
                  hasUnsavedChanges
                    ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {hasUnsavedChanges ? 'Force Sync Now' : 'Force Sync (No Changes)'}
              </button>
              <p className="text-xs text-primary mt-1">
                {hasUnsavedChanges
                  ? 'Immediately sync unsaved changes to server'
                  : 'Immediately sync current workout state'
                }
              </p>
            </div>
          </div>
        )}
        
        {/* Syncing State */}
        {syncState.status === 'syncing' && (
          <div className="text-primary space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-primary animate-spin">↻</span>
              <span className="font-medium">Syncing workout data...</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {syncState.pendingSets} set{syncState.pendingSets !== 1 ? 's' : ''} being saved
            </p>
            {syncState.isRetrying && (
              <p className="text-sm text-primary">
                Retry attempt {syncState.retryCount + 1}
              </p>
            )}
          </div>
        )}

        {/* Error State */}
        {syncState.status === 'error' && (
          <div className="text-warning space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-warning">⚠</span>
              <span className="font-medium">Sync failed</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {syncState.pendingSets} set{syncState.pendingSets !== 1 ? 's' : ''} not saved to server
            </p>

            {displayError && (
              <div className="bg-warning-muted border border-warning-border rounded p-3">
                <p className="text-xs font-medium text-warning-text mb-1">Error Details:</p>
                <p className="text-sm text-warning-text font-mono break-words">
                  {displayError}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={onRetrySync}
                disabled={syncState.isRetrying}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded hover:bg-primary-hover
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {syncState.isRetrying ? 'Retrying...' : 'Retry Sync'}
              </button>

              <p className="text-xs text-muted-foreground text-center">
                Data is safely stored locally until sync succeeds
              </p>
            </div>
          </div>
        )}

        {/* Offline State */}
        {syncState.status === 'offline' && (
          <div className="text-foreground space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">📱</span>
              <span className="font-medium">Working offline</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {syncState.pendingSets} set{syncState.pendingSets !== 1 ? 's' : ''} stored locally
            </p>
            <div className="bg-primary-muted border border-primary-muted-dark rounded p-3">
              <p className="text-sm text-primary">
                Your workout data is safely stored on this device.
                It will automatically sync when connection returns.
              </p>
            </div>
            {syncState.totalSets > 0 && (
              <p className="text-sm text-muted-foreground">
                {syncState.totalSets} set{syncState.totalSets !== 1 ? 's' : ''} previously synced
              </p>
            )}
          </div>
        )}

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">Debug Info</summary>
            <div className="mt-2 font-mono bg-muted p-2 rounded text-xs">
              <div>Status: {syncState.status}</div>
              <div>Pending: {syncState.pendingSets}</div>
              <div>Total: {syncState.totalSets}</div>
              <div>Retries: {syncState.retryCount}</div>
              <div>Is Retrying: {syncState.isRetrying ? 'Yes' : 'No'}</div>
              {syncState.lastSync && (
                <div>Last Sync: {syncState.lastSync.toISOString()}</div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}