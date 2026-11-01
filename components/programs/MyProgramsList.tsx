'use client'

import { ChevronDown, ChevronRight, Copy, Eye, Lock, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import { clientLogger } from '@/lib/client-logger'
import { programDetailHref } from '@/lib/training/program-href'
import ActivationConfirmModal from './ActivationConfirmModal'

type Program = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  isUserCreated: boolean
  createdAt: Date
  copyStatus: string | null
  targetDaysPerWeek: number | null
  _count: { weeks: number }
}

type Props = {
  programs: Program[]
  cloningProgress: Record<string, { currentWeek: number; totalWeeks: number }>
  localCopyStatuses: Record<string, string>
  deletedPrograms: Set<string>
  activeProgram?: { id: string; name: string } | null
  /** The active program's current week, shown on its row. */
  activeWeekInfo?: { weekNumber: number; totalWeeks: number } | null
  programCount: number
  hasAccess: boolean
  bypassLimit: boolean
  maxPrograms: number
}

const INITIAL_SHOW = 5

export default function MyProgramsList({
  programs,
  cloningProgress,
  localCopyStatuses,
  deletedPrograms,
  activeProgram,
  activeWeekInfo = null,
  programCount,
  hasAccess,
  bypassLimit,
  maxPrograms,
}: Props) {
  const router = useRouter()
  const toast = useToast()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [activationTarget, setActivationTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [showPremiumModal, setShowPremiumModal] = useState(false)

  // The active program first, then the rest newest first; deleted ones drop out.
  const listedPrograms = programs
    .filter(p => !deletedPrograms.has(p.id))
    .sort(
      (a, b) =>
        Number(b.isActive) - Number(a.isActive) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

  const displayedPrograms = showAll ? listedPrograms : listedPrograms.slice(0, INITIAL_SHOW)
  const hasMore = listedPrograms.length > INITIAL_SHOW

  const handleActivate = (programId: string, programName: string) => {
    setActivationTarget({ id: programId, name: programName })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(deleteTarget.id)
    try {
      const response = await fetch(`/api/programs/${deleteTarget.id}/delete`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Program deleted')
        router.refresh()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete program')
      }
    } catch (error) {
      clientLogger.error('Error deleting program:', error)
      toast.error('Failed to delete program')
    } finally {
      setDeleting(null)
      setDeleteTarget(null)
    }
  }

  const handleDuplicate = async (programId: string) => {
    if (!confirm('Create a copy of this program?')) return
    setDuplicating(programId)
    try {
      const response = await fetch(`/api/programs/${programId}/duplicate`, { method: 'POST' })
      if (response.ok) {
        toast.success('Program duplicated')
        router.refresh()
      } else {
        const data = await response.json().catch(() => ({}))
        if (data.code === 'PROGRAM_LIMIT_REACHED') {
          setShowPremiumModal(true)
        } else {
          toast.error(data.error || 'Failed to duplicate program')
        }
      }
    } catch (error) {
      clientLogger.error('Error duplicating program:', error)
      toast.error('Failed to duplicate program')
    } finally {
      setDuplicating(null)
    }
  }

  if (listedPrograms.length === 0) {
    return (
      <div>
        {/* Training's EmptyLine */}
        <p className="px-4 py-5 text-sm text-muted-foreground">
          No programs yet. Browse community programs or create your own.
        </p>
        <CreateProgramRow
          hasAccess={hasAccess}
          bypassLimit={bypassLimit}
          programCount={programCount}
          maxPrograms={maxPrograms}
          onPremiumGate={() => setShowPremiumModal(true)}
        />
        {showPremiumModal && (
          <PremiumGateModal maxPrograms={maxPrograms} onClose={() => setShowPremiumModal(false)} />
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Rows in the Programs folder box, like Training's: no box of their own. */}
      <div className="divide-y divide-border">
        {displayedPrograms.map(program => {
          const copyStatus = localCopyStatuses[program.id] ?? program.copyStatus
          const isCloning = copyStatus === 'cloning' || copyStatus?.startsWith('cloning_week_')
          const progress = cloningProgress[program.id]
          const isExpanded = expandedId === program.id
          const isLoading = deleting === program.id || duplicating === program.id

          return (
            <div key={program.id}>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : program.id)}
                disabled={isCloning}
                className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-muted/50 active:bg-muted/70 disabled:opacity-60"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground uppercase tracking-wider truncate">
                      {program.name}
                    </h3>
                    {program.isActive && !isCloning && (
                      <span className="shrink-0 bg-primary px-1.5 text-xs font-bold uppercase leading-5 tracking-wider text-primary-foreground">
                        Active
                      </span>
                    )}
                    {isCloning && (
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider animate-pulse shrink-0">
                        CLONING{progress ? ` ${progress.currentWeek}/${progress.totalWeeks}` : '...'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {program.isActive && activeWeekInfo && (
                      <>
                        <span>
                          Week {activeWeekInfo.weekNumber} of {activeWeekInfo.totalWeeks}
                        </span>
                        <span aria-hidden="true">&middot;</span>
                      </>
                    )}
                    {program._count.weeks > 0 && (
                      <span>{program._count.weeks}wk</span>
                    )}
                    {program._count.weeks > 0 && program.targetDaysPerWeek && (
                      <span aria-hidden="true">&middot;</span>
                    )}
                    {program.targetDaysPerWeek && (
                      <span>{program.targetDaysPerWeek}x/wk</span>
                    )}
                  </div>
                </div>
                {isCloning ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  isExpanded
                    ? <ChevronDown size={18} className="text-muted-foreground shrink-0" />
                    : <ChevronRight size={18} className="text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Expanded details */}
              {isExpanded && !isCloning && (
                <div className="px-4 pb-4 border-t border-border/50 bg-muted/20">
                  {program.description && (
                    <p className="text-sm text-muted-foreground py-3 leading-relaxed">
                      {program.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Link
                      href={programDetailHref(program.id)}
                      className="flex min-h-12 items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-wider doom-focus-ring"
                      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.40)' }}
                    >
                      <Eye size={14} />
                      VIEW
                    </Link>
                    {!program.isActive && (
                      <button
                        type="button"
                        onClick={() => handleActivate(program.id, program.name)}
                        disabled={isLoading}
                        className="flex min-h-12 items-center gap-1.5 px-3 py-2 border border-border text-foreground text-sm font-semibold uppercase tracking-wider hover:bg-muted transition-colors doom-focus-ring disabled:opacity-50"
                        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(0,0,0,0.20), 0 1px 0 rgba(0,0,0,0.30)' }}
                      >
                        <Star size={14} />
                        ACTIVATE
                      </button>
                    )}
                    <Link
                      href={`/programs/${program.id}/edit`}
                      className="flex min-h-12 items-center gap-1.5 px-3 py-2 border border-border text-foreground text-sm font-semibold uppercase tracking-wider hover:bg-muted transition-colors doom-focus-ring"
                      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(0,0,0,0.20), 0 1px 0 rgba(0,0,0,0.30)' }}
                    >
                      <Pencil size={14} />
                      EDIT
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(program.id)}
                      disabled={isLoading}
                      className="flex min-h-12 items-center gap-1.5 px-3 py-2 border border-border text-foreground text-sm font-semibold uppercase tracking-wider hover:bg-muted transition-colors doom-focus-ring disabled:opacity-50"
                      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(0,0,0,0.20), 0 1px 0 rgba(0,0,0,0.30)' }}
                    >
                      {duplicating === program.id ? (
                        <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Copy size={14} />
                      )}
                      DUPLICATE
                    </button>
                    {program.isUserCreated && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: program.id, name: program.name })}
                        disabled={isLoading}
                        className="flex min-h-12 items-center gap-1.5 px-3 py-2 border border-error/50 text-error text-sm font-semibold uppercase tracking-wider hover:bg-error/10 transition-colors doom-focus-ring disabled:opacity-50"
                        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(0,0,0,0.20), 0 1px 0 rgba(0,0,0,0.30)' }}
                      >
                        {deleting === program.id ? (
                          <div className="w-4 h-4 border-2 border-error border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        DELETE
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Show more */}
      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full min-h-12 border-t border-border py-2 text-sm text-muted-foreground hover:text-foreground font-semibold uppercase tracking-wider transition-colors doom-focus-ring"
        >
          SHOW ALL ({listedPrograms.length})
        </button>
      )}

      <CreateProgramRow
        hasAccess={hasAccess}
        bypassLimit={bypassLimit}
        programCount={programCount}
        maxPrograms={maxPrograms}
        onPremiumGate={() => setShowPremiumModal(true)}
      />

      {activationTarget && (
        <ActivationConfirmModal
          programId={activationTarget.id}
          programName={activationTarget.name}
          existingActiveProgram={activeProgram}
          onClose={() => setActivationTarget(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          programName={deleteTarget.name}
          isDeleting={deleting === deleteTarget.id}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Premium Gate Modal */}
      {showPremiumModal && (
        <PremiumGateModal maxPrograms={maxPrograms} onClose={() => setShowPremiumModal(false)} />
      )}
    </div>
  )
}

function CreateProgramRow({
  hasAccess,
  bypassLimit,
  programCount,
  maxPrograms,
  onPremiumGate,
}: {
  hasAccess: boolean
  bypassLimit: boolean
  programCount: number
  maxPrograms: number
  onPremiumGate: () => void
}) {
  // A quiet last row: the slots used, and Training's outline button.
  const slots = (
    <p className="text-sm text-muted-foreground">
      {programCount} of {maxPrograms} program slots used
    </p>
  )
  const button =
    'shrink-0 inline-flex min-h-12 items-center gap-1.5 px-3 border border-border text-foreground hover:bg-muted doom-focus-ring text-sm font-semibold uppercase tracking-wider'

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
      {hasAccess && bypassLimit ? <span /> : slots}
      {hasAccess ? (
        <Link href="/programs/new" className={button}>
          <Plus size={14} aria-hidden="true" />
          Create new program
        </Link>
      ) : (
        <button type="button" onClick={onPremiumGate} className={`${button} text-muted-foreground opacity-70`}>
          <Lock size={14} aria-hidden="true" />
          Create new program
        </button>
      )}
    </div>
  )
}

function DeleteConfirmModal({
  programName,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  programName: string
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 backdrop-blur-md bg-background/80 flex items-center justify-center z-[60] p-4"
      style={{ position: 'fixed', inset: 0, zIndex: 60 }}
    >
      <div className="folder-box bg-card border-2 border-error p-6 sm:p-8 text-center max-w-sm w-full shadow-xl">
        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 uppercase tracking-wider">
          Delete Program?
        </h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          This will remove <span className="font-semibold text-foreground">{programName}</span> from
          your programs. Your workout history will be kept.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 border border-border text-foreground text-sm font-semibold uppercase tracking-wider hover:bg-muted transition-colors doom-focus-ring disabled:opacity-50 min-h-12"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
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
  )
}

function PremiumGateModal({ maxPrograms, onClose }: { maxPrograms: number; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 backdrop-blur-md bg-background/80 flex items-center justify-center z-[60] p-4"
      style={{ position: 'fixed', inset: 0, zIndex: 60 }}
    >
      <div className="folder-box bg-card border-2 border-warning p-6 sm:p-8 text-center max-w-sm w-full shadow-xl">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
            <Lock size={24} className="text-warning" />
          </div>
        </div>
        <p className="text-base text-foreground mb-2 leading-relaxed">
          You&apos;ve used up your available program slots ({maxPrograms}). Please delete one to make room.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Additional program slots coming soon
        </p>
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-wider hover:bg-primary-hover transition-colors doom-focus-ring min-h-12"
        >
          Got It
        </button>
      </div>
    </div>
  )
}
