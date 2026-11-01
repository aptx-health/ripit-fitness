'use client'

import { ChevronDown, ChevronUp, Dumbbell, Lock, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import { EQUIPMENT_LABELS, LEVEL_LABELS } from '@/lib/constants/program-metadata'
import { libraryHref } from '@/lib/library/links'
import UnpublishProgramDialog from './UnpublishProgramDialog'

type CommunityProgram = {
  id: string
  name: string
  description: string
  programType: string
  authorUserId: string | null
  displayName: string
  publishedAt: Date
  weekCount: number
  workoutCount: number
  exerciseCount: number
  goals: string[]
  level: string | null
  durationDisplay: string | null
  targetDaysPerWeek: number | null
  equipmentNeeded: string[]
  focusAreas: string[]
}

type CommunityProgramCardProps = {
  program: CommunityProgram
  currentUserId: string
  hasAccess: boolean
  maxPrograms: number
  /** Show the type chip; the list hides it when every program it shows is the same type. */
  showType?: boolean
}

export default function CommunityProgramCard({
  program,
  currentUserId,
  hasAccess,
  maxPrograms,
  showType = true,
}: CommunityProgramCardProps) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [descExpanded, setDescExpanded] = useState(false)
  // Whether the two-line clamp hides part of the description: only then is there "more".
  const descRef = useRef<HTMLSpanElement>(null)
  const [descClamped, setDescClamped] = useState(false)
  useEffect(() => {
    const el = descRef.current
    if (!el || descExpanded) return
    const measure = () => setDescClamped(el.scrollHeight > el.clientHeight + 1)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [descExpanded])

  const isAuthor = program.authorUserId === currentUserId

  const handleAddProgram = async () => {
    setIsAdding(true)
    setError(null)

    try {
      const response = await fetch(`/api/community/${program.id}/add`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.code === 'PROGRAM_LIMIT_REACHED') {
          setShowLimitModal(true)
          setIsAdding(false)
          return
        }
        throw new Error(errorData.error || 'Failed to add program')
      }

      const data = await response.json()

      // Redirect to programs page with cloning parameter for status polling
      router.push(libraryHref({ type: 'programs', cloning: data.programId }))
    } catch (err) {
      clientLogger.error('Error adding program:', err)
      setError(err instanceof Error ? err.message : 'Failed to add program')
      setIsAdding(false)
    }
  }

  // One meta line: "by Ripit Fitness · Beginner · machines · 5 wk · 3×/wk". Each item stays whole when it wraps.
  const equipment = program.equipmentNeeded.slice(0, 2).map((eq) => (EQUIPMENT_LABELS[eq] || eq).toLowerCase())
  const meta = [
    `by ${program.displayName}`,
    program.level ? LEVEL_LABELS[program.level] : null,
    equipment.length > 0
      ? `${equipment.join(', ')}${program.equipmentNeeded.length > 2 ? ` +${program.equipmentNeeded.length - 2}` : ''}`
      : null,
    `${program.weekCount} wk`,
    program.targetDaysPerWeek ? `${program.targetDaysPerWeek}×/wk` : null,
  ].filter((item): item is string => Boolean(item))

  return (
    <>
      {/* A row in the Programs folder box, like Training's rows: the list draws the dividers. */}
      <li className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="font-bold uppercase tracking-wider text-foreground break-words">{program.name}</h3>
              {showType && (
                <span className="inline-flex items-center gap-1 bg-primary px-1.5 text-xs font-bold uppercase leading-5 tracking-wider text-primary-foreground">
                  <Dumbbell size={12} aria-hidden="true" />
                  {program.programType}
                </span>
              )}
              {isAuthor && (
                <span className="bg-accent px-1.5 text-xs font-bold uppercase leading-5 tracking-wider text-accent-foreground">
                  Your program
                </span>
              )}
            </div>

            {/* Description: two lines, tap to expand */}
            <button
              type="button"
              onClick={() => setDescExpanded((v) => !v)}
              aria-expanded={descExpanded}
              className="mt-1 block w-full text-left text-sm text-foreground/80 break-words doom-focus-ring"
            >
              <span ref={descRef} className={descExpanded ? 'block' : 'line-clamp-2'}>
                {program.description}
              </span>
              {(descClamped || descExpanded) && (
                <span className="mt-0.5 inline-flex items-center gap-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {descExpanded ? 'Less' : 'More'}
                  {descExpanded ? (
                    <ChevronUp size={12} aria-hidden="true" />
                  ) : (
                    <ChevronDown size={12} aria-hidden="true" />
                  )}
                </span>
              )}
            </button>

            <p className="mt-1 text-sm text-muted-foreground">
              {meta.map((item, i) => (
                <span key={item}>
                  {i > 0 && ' · '}
                  <span className="whitespace-nowrap">{item}</span>
                </span>
              ))}
            </p>

            {error && (
              <p role="alert" className="mt-2 text-sm font-medium text-error">
                {error}
              </p>
            )}
          </div>

          {/* Add, as Training's Start: a quiet outline button on the right */}
          {!isAuthor ? (
            hasAccess ? (
              <button
                type="button"
                onClick={handleAddProgram}
                disabled={isAdding}
                aria-label={`Add to my programs: ${program.name}`}
                className="shrink-0 inline-flex min-h-12 items-center gap-1.5 px-3 border border-border text-foreground hover:bg-muted doom-focus-ring text-sm font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} aria-hidden="true" />
                {isAdding ? 'Adding…' : 'Add'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowLimitModal(true)}
                aria-label={`Add to my programs: ${program.name} (no free program slots)`}
                className="shrink-0 inline-flex min-h-12 items-center gap-1.5 px-3 border border-border text-muted-foreground opacity-70 doom-focus-ring text-sm font-semibold uppercase tracking-wider"
              >
                <Lock size={14} aria-hidden="true" />
                Add
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => setShowUnpublishDialog(true)}
              className="shrink-0 inline-flex min-h-12 items-center px-3 border border-error/60 text-error hover:bg-error/10 doom-focus-ring text-sm font-semibold uppercase tracking-wider"
            >
              Unpublish
            </button>
          )}
        </div>
      </li>

      {/* Program Limit Modal */}
      {showLimitModal && (
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
              onClick={() => setShowLimitModal(false)}
              className="px-6 py-2 bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-wider hover:bg-primary-hover transition-colors doom-focus-ring min-h-12"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Unpublish Dialog */}
      {isAuthor && (
        <UnpublishProgramDialog
          open={showUnpublishDialog}
          onOpenChange={setShowUnpublishDialog}
          programId={program.id}
          programName={program.name}
        />
      )}
    </>
  )
}
