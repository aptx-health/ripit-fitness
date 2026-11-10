import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import ProposalActions from '@/components/admin/proposals/ProposalActions'
import ProposalStatusBadge from '@/components/admin/proposals/ProposalStatusBadge'
import FieldDiff, { type DiffRow } from '@/components/suggestions/FieldDiff'
import ProgramOutline from '@/components/suggestions/ProgramOutline'
import SavedWorkoutOutline from '@/components/suggestions/SavedWorkoutOutline'
import { isAdminRole } from '@/lib/admin/auth'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { LIBRARY_KINDS, type LibraryUsage, usageText } from '@/lib/proposals/library'
import type { WorkoutCreateInput } from '@/lib/proposals/saved-workout'
import { IRREVERSIBLE_KINDS, PROPOSAL_KIND_LABELS, type ProposalKind } from '@/lib/proposals/service'
import { balanceRows, namedExercises, programDetail, same, savedWorkoutRows } from '@/lib/suggestions/bodies'

export const revalidate = 0

const DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

/**
 * One proposal: rationale, before/after field diff (or a program or saved workout outline) and the decision buttons.
 * Agent text (summary, rationale, values) is rendered as plain text only.
 */
export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, error } = await getCurrentUser()
  if (error || !user) redirect('/login')
  if (!isAdminRole(user.role)) redirect('/settings')

  const proposal = await prisma.proposal.findFirst({
    where: { id, userId: user.id },
    include: {
      agentToken: { select: { name: true } },
      feedback: { select: { id: true, category: true, message: true, status: true, createdAt: true } },
    },
  })
  if (!proposal) notFound()

  const isProgram = proposal.kind === 'program.create'
  const isCreate = proposal.kind === 'exercise_definition.create' || proposal.kind === LIBRARY_KINDS.create
  const isDelete = proposal.kind === LIBRARY_KINDS.delete
  const isMerge = proposal.kind === LIBRARY_KINDS.merge
  const isBalance = proposal.kind === 'anchors.update' || proposal.kind === 'balance_targets.update'
  const isSavedCreate = proposal.kind === 'saved_workout.create'
  const isSavedUpdate = proposal.kind === 'saved_workout.update'
  const program = isProgram ? await programDetail(proposal.payload, proposal.targetId, user.id) : null
  const savedWorkout = isSavedCreate ? (proposal.payload as unknown as WorkoutCreateInput) : null
  const savedExercises = savedWorkout ? await namedExercises(savedWorkout.exercises) : []
  const current =
    proposal.targetId && !isProgram && !isBalance && !isSavedCreate && !isSavedUpdate && !isDelete && !isMerge
      ? await prisma.exerciseDefinition.findUnique({ where: { id: proposal.targetId } })
      : null

  let rows: DiffRow[] = []
  if (isDelete || isMerge) {
    // Usage as counted when proposed; approve counts it again.
    const p = proposal.payload as unknown as { name?: string; fromName?: string; intoName?: string; usage: LibraryUsage }
    rows = isDelete
      ? [{ field: 'delete', after: p.name }]
      : [
          { field: 'merge (goes away)', after: p.fromName },
          { field: 'into (keeps every use)', after: p.intoName },
        ]
    rows.push({ field: isDelete ? 'usage' : 'usage that moves', after: usageText(p.usage) })
  } else if (isCreate) {
    const definition = proposal.payload as Record<string, unknown>
    rows = Object.entries(definition).map(([field, after]) => ({ field, after }))
  } else if (isBalance) {
    rows = await balanceRows(proposal.kind, proposal.payload, proposal.before, proposal.status === 'pending', user.id)
  } else if (isSavedUpdate) {
    rows = await savedWorkoutRows(proposal.payload, proposal.before, proposal.status === 'pending', proposal.targetId, user.id)
  } else if (!isProgram && !isSavedCreate) {
    const { changes } = proposal.payload as { changes: Record<string, unknown> }
    const before = (proposal.before ?? {}) as Record<string, unknown>
    const live = current as Record<string, unknown> | null
    rows = Object.entries(changes).map(([field, after]) => ({
      field,
      before: before[field],
      after,
      // Flag a pending proposal whose target moved since it was made.
      ...(proposal.status === 'pending' && live && !same(live[field], before[field]) && { current: live[field] }),
    }))
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <ProposalStatusBadge status={proposal.status} />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {PROPOSAL_KIND_LABELS[proposal.kind as ProposalKind] ?? proposal.kind}
          </span>
        </div>
        <h1 className="text-xl font-bold text-foreground break-words">{proposal.summary}</h1>
        <p className="text-xs text-muted-foreground">
          From {proposal.agentToken?.name ?? 'Coach'} · proposed {proposal.createdAt.toLocaleString('en-US', DATE_FORMAT)}
          {proposal.decidedAt && ` · decided ${proposal.decidedAt.toLocaleString('en-US', DATE_FORMAT)}`}
        </p>
      </div>

      <section className="space-y-1.5">
        <h2 className="doom-label text-secondary">Rationale</h2>
        <p className="text-sm text-foreground whitespace-pre-wrap break-words bg-muted p-3 border border-border">
          {proposal.rationale}
        </p>
      </section>

      {proposal.feedback && (
        <section className="space-y-1.5" data-testid="linked-feedback">
          <h2 className="doom-label text-secondary">Addresses feedback</h2>
          <div className="border-2 border-border bg-card p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="px-1.5 py-0.5 border border-border font-semibold uppercase">
                {proposal.feedback.category}
              </span>
              <span className="uppercase tracking-wider">{proposal.feedback.status}</span>
              <span>· {proposal.feedback.createdAt.toLocaleString('en-US', DATE_FORMAT)}</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {proposal.feedback.message || 'No message'}
            </p>
            <Link
              href={`/admin/feedback?expand=${proposal.feedback.id}`}
              className="inline-block text-xs font-semibold uppercase tracking-wider text-primary hover:underline"
            >
              Open in Feedback →
            </Link>
          </div>
          {proposal.status === 'pending' && (
            <p className="text-xs text-muted-foreground">Approving this proposal marks the feedback resolved.</p>
          )}
        </section>
      )}

      {proposal.error && (
        <div className="border-2 border-error-border bg-error-muted text-error-text p-3 text-sm break-words">
          {proposal.error}
        </div>
      )}

      {program ? (
        <section className="space-y-1.5">
          <h2 className="doom-label text-secondary">Proposed program</h2>
          {program.created && (
            <Link
              href={`/programs/${program.created.id}`}
              data-testid="created-program-link"
              className="inline-block text-sm font-semibold uppercase tracking-wider text-primary hover:underline"
            >
              Open the created program →
            </Link>
          )}
          <ProgramOutline program={program.program} definitionNames={program.definitionNames} />
        </section>
      ) : savedWorkout ? (
        <section className="space-y-1.5">
          <h2 className="doom-label text-secondary">Proposed saved workout</h2>
          <SavedWorkoutOutline name={savedWorkout.name} notes={savedWorkout.notes} exercises={savedExercises} />
        </section>
      ) : (
        <section className="space-y-1.5">
          <h2 className="doom-label text-secondary">
            {isCreate ? 'Proposed definition' : isDelete || isMerge ? 'Proposed' : 'Changes'}
          </h2>
          <FieldDiff rows={rows} mode={isCreate || isDelete || isMerge ? 'create' : 'update'} />
        </section>
      )}

      {/* Programs, deletes and merges can't be reverted (a program is deleted from Programs instead). */}
      <ProposalActions
        id={proposal.id}
        status={proposal.status}
        canRevert={!IRREVERSIBLE_KINDS.has(proposal.kind)}
        {...((isDelete || isMerge) && {
          approveWarning: `This ${isDelete ? 'delete' : 'merge'} can't be undone once approved.`,
        })}
      />
    </div>
  )
}
