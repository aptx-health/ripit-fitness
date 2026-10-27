import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import FieldDiff, { type DiffRow } from '@/components/admin/proposals/FieldDiff'
import ProposalActions from '@/components/admin/proposals/ProposalActions'
import ProposalStatusBadge from '@/components/admin/proposals/ProposalStatusBadge'
import { isAdminRole } from '@/lib/admin/auth'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

export const revalidate = 0

const DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

/**
 * One proposal: rationale, before/after field diff and the decision buttons.
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

  const isCreate = proposal.kind === 'exercise_definition.create'
  const current = proposal.targetId
    ? await prisma.exerciseDefinition.findUnique({ where: { id: proposal.targetId } })
    : null

  let rows: DiffRow[]
  if (isCreate) {
    const definition = proposal.payload as Record<string, unknown>
    rows = Object.entries(definition).map(([field, after]) => ({ field, after }))
  } else {
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
      <Link
        href="/admin/proposals"
        className="inline-flex items-center gap-1 text-sm font-semibold uppercase tracking-wider text-primary hover:underline"
      >
        <ChevronLeft size={16} />
        Proposals
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <ProposalStatusBadge status={proposal.status} />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {isCreate ? 'New exercise' : 'Exercise edit'}
          </span>
        </div>
        <h1 className="text-xl font-bold text-foreground break-words">{proposal.summary}</h1>
        <p className="text-xs text-muted-foreground">
          From {proposal.agentToken.name} · proposed {proposal.createdAt.toLocaleString('en-US', DATE_FORMAT)}
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

      <section className="space-y-1.5">
        <h2 className="doom-label text-secondary">{isCreate ? 'Proposed definition' : 'Changes'}</h2>
        <FieldDiff rows={rows} mode={isCreate ? 'create' : 'update'} />
      </section>

      <ProposalActions id={proposal.id} status={proposal.status} />
    </div>
  )
}
