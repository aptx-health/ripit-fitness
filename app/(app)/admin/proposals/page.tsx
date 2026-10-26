import { Bot, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import ProposalStatusBadge from '@/components/admin/proposals/ProposalStatusBadge'
import { isAdminRole } from '@/lib/admin/auth'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

export const revalidate = 0

const DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

/**
 * Agent proposals, pending first. Admin-only (the shared admin layout also
 * admits editors, so re-guard here). Agent text is rendered as plain text.
 */
export default async function ProposalsPage() {
  const { user, error } = await getCurrentUser()
  if (error || !user) redirect('/login')
  if (!isAdminRole(user.role)) redirect('/settings')

  const proposals = await prisma.proposal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      kind: true,
      status: true,
      summary: true,
      createdAt: true,
      decidedAt: true,
      agentToken: { select: { name: true } },
    },
  })

  const pending = proposals.filter((p) => p.status === 'pending')
  const decided = proposals.filter((p) => p.status !== 'pending')

  const section = (title: string, items: typeof proposals, empty: string) => (
    <section className="space-y-2">
      <h2 className="doom-label text-secondary">
        {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground border-2 border-border bg-card p-4">{empty}</p>
      ) : (
        <ul className="border-2 border-border divide-y divide-border">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/proposals/${p.id}`}
                className="flex items-center gap-3 p-3 bg-card hover:bg-muted active:bg-muted"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-sm font-semibold text-foreground break-words">{p.summary}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <ProposalStatusBadge status={p.status} />
                    <span>{p.kind === 'exercise_definition.create' ? 'New exercise' : 'Exercise edit'}</span>
                    <span>·</span>
                    <span>{p.agentToken.name}</span>
                    <span>·</span>
                    <span>{(p.decidedAt ?? p.createdAt).toLocaleString('en-US', DATE_FORMAT)}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wider flex items-center gap-2">
          <Bot size={24} className="text-primary" />
          Proposals
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Changes agents have proposed. Nothing is applied until you approve it.
        </p>
      </div>
      {section('Pending', pending, 'Nothing waiting for a decision.')}
      {section('Decided', decided, 'No decided proposals yet.')}
    </div>
  )
}
