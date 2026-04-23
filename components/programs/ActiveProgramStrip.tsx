'use client'

import { ChevronDown, ChevronRight, Dumbbell, Pencil, Star, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import { clientLogger } from '@/lib/client-logger'

type Props = {
  programId: string
  programName: string
  description: string | null
  currentWeek: number | null
  totalWeeks: number | null
  weekCount: number
  targetDaysPerWeek: number | null
}

export default function ActiveProgramStrip({
  programId,
  programName,
  description,
  currentWeek,
  totalWeeks,
  weekCount,
  targetDaysPerWeek,
}: Props) {
  const router = useRouter()
  const toast = useToast()
  const [isExpanded, setIsExpanded] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/programs/${programId}/delete`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Program deleted')
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete program')
      }
    } catch (error) {
      clientLogger.error('Error deleting active program:', error)
      toast.error('Failed to delete program')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(false)
    }
  }

  return (
    <div className="border border-primary/40 border-l-4 border-l-primary bg-primary/5 doom-noise">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-muted/50 active:bg-muted/70"
      >
        <Star size={18} className="text-success shrink-0" fill="currentColor" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground doom-heading uppercase truncate">
              {programName}
            </h3>
            <span className="text-xs font-bold text-primary uppercase tracking-wider shrink-0">
              ACTIVE
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {currentWeek && totalWeeks && (
              <span>Week {currentWeek} of {totalWeeks}</span>
            )}
            {currentWeek && totalWeeks && targetDaysPerWeek && (
              <span aria-hidden="true">&middot;</span>
            )}
            {!currentWeek && weekCount > 0 && (
              <span>{weekCount}wk</span>
            )}
            {!currentWeek && weekCount > 0 && targetDaysPerWeek && (
              <span aria-hidden="true">&middot;</span>
            )}
            {targetDaysPerWeek && (
              <span>{targetDaysPerWeek}x/wk</span>
            )}
          </div>
        </div>
        {isExpanded
          ? <ChevronDown size={18} className="text-muted-foreground shrink-0" />
          : <ChevronRight size={18} className="text-muted-foreground shrink-0" />
        }
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 bg-muted/20">
          {description && (
            <p className="text-sm text-muted-foreground py-3 leading-relaxed">
              {description}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href="/training"
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-wider doom-button-3d doom-focus-ring"
            >
              <Dumbbell size={14} />
              TRAIN
            </Link>
            <Link
              href={`/programs/${programId}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 border border-border text-foreground text-sm font-semibold uppercase tracking-wider hover:bg-muted transition-colors doom-focus-ring"
            >
              <Pencil size={14} />
              EDIT
            </Link>
            <button
              type="button"
              onClick={() => setDeleteTarget(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-error/50 text-error text-sm font-semibold uppercase tracking-wider hover:bg-error/10 transition-colors doom-focus-ring"
            >
              <Trash2 size={14} />
              DELETE
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 backdrop-blur-md bg-background/80 flex items-center justify-center z-[60] p-4"
          style={{ position: 'fixed', inset: 0, zIndex: 60 }}
        >
          <div className="bg-card border-2 border-error p-6 sm:p-8 text-center max-w-sm w-full shadow-xl doom-corners">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 uppercase tracking-wider">
              Delete Program?
            </h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              This will deactivate and remove <span className="font-semibold text-foreground">{programName}</span> from
              your programs. Your workout history will be kept.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setDeleteTarget(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-border text-foreground text-sm font-semibold uppercase tracking-wider hover:bg-muted transition-colors doom-focus-ring disabled:opacity-50 min-h-12"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-error text-error-foreground text-sm font-semibold uppercase tracking-wider hover:bg-error/90 transition-colors doom-focus-ring disabled:opacity-50 min-h-12"
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-error-foreground border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
