'use client'

import { Archive, ChevronDown, ChevronRight, Copy, Pencil, Plus, Star } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import { clientLogger } from '@/lib/client-logger'
import ActivationConfirmModal from './ActivationConfirmModal'

type Program = {
  id: string
  name: string
  description: string | null
  isActive: boolean
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
}

const INITIAL_SHOW = 5

export default function MyProgramsList({
  programs,
  cloningProgress,
  localCopyStatuses,
  deletedPrograms,
  hasActiveProgram,
  activeProgram,
}: Props) {
  const router = useRouter()
  const toast = useToast()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [archiving, setArchiving] = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [activationTarget, setActivationTarget] = useState<{ id: string; name: string } | null>(null)

  // Filter out active program (shown in strip) and deleted programs
  const inactivePrograms = programs
    .filter(p => !p.isActive && !deletedPrograms.has(p.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const displayedPrograms = showAll ? inactivePrograms : inactivePrograms.slice(0, INITIAL_SHOW)
  const hasMore = inactivePrograms.length > INITIAL_SHOW

  const handleActivate = (programId: string, programName: string) => {
    setActivationTarget({ id: programId, name: programName })
  }

  const handleArchive = async (programId: string, programName: string) => {
    if (!confirm(`Archive "${programName}"? You can restore it later.`)) return
    setArchiving(programId)
    try {
      const response = await fetch(`/api/programs/${programId}/delete`, { method: 'DELETE' })
      if (response.ok) {
        router.refresh()
      } else {
        toast.error('Failed to archive program')
      }
    } catch (error) {
      clientLogger.error('Error archiving program:', error)
      toast.error('Failed to archive program')
    } finally {
      setArchiving(null)
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
        <CreateProgramRow />
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
          const isLoading = archiving === program.id || duplicating === program.id

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
                    <button
                      type="button"
                      onClick={() => handleArchive(program.id, program.name)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border text-muted-foreground text-sm font-semibold uppercase tracking-wider hover:bg-muted hover:text-foreground transition-colors doom-focus-ring disabled:opacity-50"
                    >
                      {archiving === program.id ? (
                        <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Archive size={14} />
                      )}
                      ARCHIVE
                    </button>
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

      <CreateProgramRow />

      {activationTarget && (
        <ActivationConfirmModal
          programId={activationTarget.id}
          programName={activationTarget.name}
          existingActiveProgram={activeProgram}
          onClose={() => setActivationTarget(null)}
        />
      )}
    </div>
  )
}

function CreateProgramRow() {
  return (
    <Link
      href="/programs/new"
      className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary transition-all text-sm font-semibold uppercase tracking-wider doom-focus-ring"
    >
      <Plus size={16} />
      CREATE NEW PROGRAM
    </Link>
  )
}
