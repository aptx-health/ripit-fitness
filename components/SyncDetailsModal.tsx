'use client'

import { type SyncState } from '@/hooks/useSyncState'

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
    <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-4 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">Sync Status</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Synced State */}
        {syncState.status === 'synced' && (
          <div className="text-green-700 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span className="font-medium">
                {hasUnsavedChanges ? 'Server synced, local changes pending' : 'All data synced'}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {syncState.totalSets} set{syncState.totalSets !== 1 ? 's' : ''} saved to server
            </p>
            {timeSinceSync && (
              <p className="text-sm text-gray-500">
                Last sync: {timeSinceSync}
              </p>
            )}
            
            {/* Unsaved Changes Warning */}
            {hasUnsavedChanges && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-600">⚠</span>
                  <span className="text-sm font-medium text-amber-800">Unsaved Changes</span>
                </div>
                <p className="text-xs text-amber-700">
                  You have local changes (new sets or deletions) that haven&apos;t been synced yet.
                  They will sync automatically after 3 sets or when you complete the workout.
                </p>
              </div>
            )}
            
            {/* Manual Sync Button for Testing */}
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-xs text-blue-600 mb-2">Testing Controls</p>
              <button 
                onClick={() => {
                  console.log('Force Sync Now button clicked!')
                  onSyncNow()
                }}
                className={`w-full py-2 px-4 rounded text-sm transition-colors ${
                  hasUnsavedChanges 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-400 text-gray-200'
                }`}
              >
                {hasUnsavedChanges ? 'Force Sync Now' : 'Force Sync (No Changes)'}
              </button>
              <p className="text-xs text-blue-600 mt-1">
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
          <div className="text-blue-700 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 animate-spin">↻</span>
              <span className="font-medium">Syncing workout data...</span>
            </div>
            <p className="text-sm text-gray-600">
              {syncState.pendingSets} set{syncState.pendingSets !== 1 ? 's' : ''} being saved
            </p>
            {syncState.isRetrying && (
              <p className="text-sm text-blue-600">
                Retry attempt {syncState.retryCount + 1}
              </p>
            )}
          </div>
        )}
        
        {/* Error State */}
        {syncState.status === 'error' && (
          <div className="text-amber-700 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-600">⚠</span>
              <span className="font-medium">Sync failed</span>
            </div>
            <p className="text-sm text-gray-600">
              {syncState.pendingSets} set{syncState.pendingSets !== 1 ? 's' : ''} not saved to server
            </p>
            
            {displayError && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                <p className="text-xs font-medium text-amber-800 mb-1">Error Details:</p>
                <p className="text-sm text-amber-700 font-mono break-words">
                  {displayError}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <button 
                onClick={onRetrySync}
                disabled={syncState.isRetrying}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 
                  disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {syncState.isRetrying ? 'Retrying...' : 'Retry Sync'}
              </button>
              
              <p className="text-xs text-gray-500 text-center">
                Data is safely stored locally until sync succeeds
              </p>
            </div>
          </div>
        )}
        
        {/* Offline State */}
        {syncState.status === 'offline' && (
          <div className="text-gray-700 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">📱</span>
              <span className="font-medium">Working offline</span>
            </div>
            <p className="text-sm text-gray-600">
              {syncState.pendingSets} set{syncState.pendingSets !== 1 ? 's' : ''} stored locally
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-700">
                Your workout data is safely stored on this device. 
                It will automatically sync when connection returns.
              </p>
            </div>
            {syncState.totalSets > 0 && (
              <p className="text-sm text-gray-500">
                {syncState.totalSets} set{syncState.totalSets !== 1 ? 's' : ''} previously synced
              </p>
            )}
          </div>
        )}

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">Debug Info</summary>
            <div className="mt-2 font-mono bg-gray-50 p-2 rounded text-xs">
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