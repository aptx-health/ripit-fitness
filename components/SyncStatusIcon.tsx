'use client'

import { type SyncStatus } from '@/hooks/useSyncState'

type Props = {
  status: SyncStatus
  pendingCount?: number
  onClick: () => void
}

export default function SyncStatusIcon({ status, pendingCount = 0, onClick }: Props) {
  const configs = {
    synced: {
      icon: '✓',
      color: 'text-green-400',
      bg: 'bg-green-950',
      border: 'border-green-600',
      animate: '',
      title: 'All data synced'
    },
    syncing: {
      icon: '↻',
      color: 'text-orange-400',
      bg: 'bg-orange-950',
      border: 'border-orange-600',
      animate: 'animate-spin',
      title: `Syncing ${pendingCount} set${pendingCount !== 1 ? 's' : ''}...`
    },
    error: {
      icon: '⚠',
      color: 'text-yellow-400',
      bg: 'bg-yellow-950',
      border: 'border-yellow-600',
      animate: '',
      title: `${pendingCount} set${pendingCount !== 1 ? 's' : ''} not saved - click for details`
    },
    offline: {
      icon: '📱',
      color: 'text-zinc-400',
      bg: 'bg-zinc-800',
      border: 'border-zinc-600',
      animate: '',
      title: `Working offline - ${pendingCount} set${pendingCount !== 1 ? 's' : ''} stored locally`
    }
  }

  const config = configs[status]

  return (
    <button
      onClick={onClick}
      title={config.title}
      className={`w-8 h-8 rounded-full
        ${config.bg} ${config.color} ${config.border} ${config.animate}
        flex items-center justify-center text-sm font-bold
        hover:scale-110 active:scale-95 transition-transform
        border-2 hover:shadow-md flex-shrink-0`}
    >
      {config.icon}
    </button>
  )
}