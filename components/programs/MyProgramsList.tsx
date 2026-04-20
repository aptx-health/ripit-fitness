'use client'

import { ChevronDown, ChevronRight, Copy, Lock, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import { useCustomProgramAccess } from '@/hooks/useCustomProgramAccess'
import { clientLogger } from '@/lib/client-logger'
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
  hasActiveProgram: boolean
  activeProgram?: { id: string; name: string } | null
  customProgramCount: number
  isAdmin: boolean
  customProgramLimitBypass: boolean
}

const INITIAL_SHOW = 5

export default function MyProgramsList({
  programs,
  cloningProgress,
  localCopyStatuses,
  deletedPrograms,
  hasActiveProgram,
  activeProgram,
  customProgramCount,
  isAdmin,
  customProgramLimitBypass,
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

  const { hasAccess, maxPrograms } = useCustomProgramAccess({
    customProgramCount,
    isAdmin,
    customProgramLimitBypass,
  })

  // Filter out active program (shown in strip) and deleted programs
  const inactivePrograms = programs
    .filter(p => !p.isActive && !deletedPrograms.has(p.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const displayedPrograms = showAll ? inactivePrograms : inactivePrograms.slice(0, INITIAL_SHOW)
  const hasMore = inactivePrograms.length > INITIAL_SHOW

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
        toast.error('Failed to duplicate program')
      }
    } catch (error) {
      clientLogger.error('Error duplicating program:', error)
      toast.error('Failed to duplicate program')
    } finally {
      setDuplicating(null)
    }
  }

  if (inactivePrograms.length === 0) {
    return (
      <div className="space-y-3">
        <div className="bg-card border border-border doom-noise p-8 text-center">
          <p className="text-muted-foreground mb-2">
            {hasActiveProgram
              ? 'No other programs saved.'
              : 'No programs yet.'}
          </p>
          <p className="text-sm text-muted-foreground">
            Browse community programs or create your own.
          </p>
        </div>
        <CreateProgramRow
          hasAccess={hasAccess}
          customProgramCount={customProgramCount}
          maxPrograms={maxPrograms}
          onPremiumGate={() => setShowPremiumModal(true)}
        />
        {showPremiumModal && (
          <PremiumGateModal onClose={() => setShowPremiumModal(false)} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="border border-border divide-y divide-border bg-card doom-noise">
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
                    <h3 className="text-base font-bold text-foreground uppercase truncate doom-heading">
                      {program.name}
                    </h3>
                    {isCloning && (
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider animate-pulse shrink-0">
                        CLONING{progress ? ` ${progress.currentWeek}/${progress.totalWeeks}` : '...'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                    <button
                      type="button"
                      onClick={() => handleActivate(program.id, program.name)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-wider doom-button-3d doom-focus-ring disabled:opacity-50"
                    >
                      <Star size={14} />
                      ACTIVATE
                    </button>
                    <Link
                      href={`/programs/${program.id}/edit`}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border text-foreground text-sm font-semibold uppercase tracking-wider hover:bg-muted transition-colors doom-focus-ring"
                    >
                      <Pencil size={14} />
                      EDIT
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(program.id)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border text-foreground text-sm font-semibold uppercase tracking-wider hover:bg-muted transition-colors doom-focus-ring disabled:opacity-50"
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
                        className="flex items-center gap-1.5 px-3 py-2 border border-error/50 text-error text-sm font-semibold uppercase tracking-wider hover:bg-error/10 transition-colors doom-focus-ring disabled:opacity-50"
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
          className="w-full py-2 text-sm text-muted-foreground hover:text-foreground font-semibold uppercase tracking-wider transition-colors doom-focus-ring"
        >
          SHOW ALL ({inactivePrograms.length})
        </button>
      )}

      <CreateProgramRow
        hasAccess={hasAccess}
        customProgramCount={customProgramCount}
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
        <PremiumGateModal onClose={() => setShowPremiumModal(false)} />
      )}
    </div>
  )
}

function CreateProgramRow({
  hasAccess,
  customProgramCount,
  maxPrograms,
  onPremiumGate,
}: {
  hasAccess: boolean
  customProgramCount: number
  maxPrograms: number
  onPremiumGate: () => void
}) {
  if (hasAccess) {
    return (
      <div className="space-y-1">
        <Link
          href="/programs/new"
          className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary transition-all text-sm font-semibold uppercase tracking-wider doom-focus-ring"
        >
          <Plus size={16} />
          CREATE NEW PROGRAM
        </Link>
        <p className="text-xs text-muted-foreground text-center">
          {customProgramCount} of {maxPrograms} custom programs used
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onPremiumGate}
        className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border text-muted-foreground hover:text-muted-foreground/80 transition-all text-sm font-semibold uppercase tracking-wider doom-focus-ring cursor-not-allowed opacity-70"
      >
        <Lock size={16} />
        CREATE NEW PROGRAM
      </button>
      <p className="text-xs text-muted-foreground text-center">
        {customProgramCount} of {maxPrograms} custom programs used
      </p>
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
      <div className="bg-card border-2 border-error p-6 sm:p-8 text-center max-w-sm w-full shadow-xl doom-corners">
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

function PremiumGateModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 backdrop-blur-md bg-background/80 flex items-center justify-center z-[60] p-4"
      style={{ position: 'fixed', inset: 0, zIndex: 60 }}
    >
      <div className="bg-card border-2 border-warning p-6 sm:p-8 text-center max-w-sm w-full shadow-xl doom-corners">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
            <Lock size={24} className="text-warning" />
          </div>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 uppercase tracking-wider">
          Premium Feature
        </h3>
        <p className="text-sm text-muted-foreground mb-2">
          Coming Soon
        </p>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Delete a custom program to make room, or upgrade when premium is available.
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
