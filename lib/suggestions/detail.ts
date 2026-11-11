import { earlierCopies, splitBundle } from '@/lib/coaching/custom-exercises'
import { coachingNames } from '@/lib/coaching/names'
import { prisma } from '@/lib/db'
import { suggestionBody } from './bodies'
import { SUGGESTION_KINDS, suggestionKindLabel, suggestionOutcome } from './kinds'
import { suggestionTitle } from './titles'
import type { BundledExercise, SuggestionDetail, SuggestionItem } from './types'

/**
 * Loaders for the user's suggestions: their own proposals of the allowed kinds.
 * Another user's, an unknown or a hidden-kind id reads as not found.
 */

const allowedKinds = { in: [...SUGGESTION_KINDS] }

/** The proposal behind a suggestion id, or null when the user may not see it. */
export function findSuggestion(userId: string, id: string) {
  return prisma.proposal.findFirst({ where: { id, userId, kind: allowedKinds }, include: senderSelect })
}

type TitleSource = { kind: string; payload: unknown; before: unknown; targetId: string | null }

/**
 * Titles for these proposals. A workout update that leaves the name alone
 * doesn't store it, so those names come from the saved workouts (one query).
 */
async function titlesFor(userId: string, rows: TitleSource[]): Promise<string[]> {
  const needName = rows.filter(
    (r) => r.kind === 'saved_workout.update' && r.targetId && !(r.before as { name?: string } | null)?.name
  )
  const ids = [...new Set(needName.map((r) => r.targetId as string))]
  const workouts = ids.length
    ? await prisma.savedWorkout.findMany({ where: { id: { in: ids }, userId }, select: { id: true, name: true } })
    : []
  const names = new Map(workouts.map((w) => [w.id, w.name]))
  return rows.map((r) => suggestionTitle(r.kind, r.payload, r.before, r.targetId ? names.get(r.targetId) : null))
}

type SenderSource = { agentToken: { name: string } | null; coachLink: { coachUserId: string } | null }

const senderSelect = { agentToken: { select: { name: true } }, coachLink: { select: { coachUserId: true } } } as const

/** Who sent each proposal: the coach by name (as Coaching shows it), else the agent token's name. */
async function sendersFor(rows: SenderSource[]): Promise<string[]> {
  const names = await coachingNames(
    prisma,
    rows.flatMap((r) => (r.coachLink ? [r.coachLink.coachUserId] : []))
  )
  return rows.map((r) =>
    r.coachLink ? (names.get(r.coachLink.coachUserId) ?? 'your coach') : (r.agentToken?.name ?? 'your agent')
  )
}

function exerciseCountOf(payload: unknown): number | null {
  const exercises = (payload as { exercises?: unknown } | null)?.exercises
  return Array.isArray(exercises) ? exercises.length : null
}

/** Pending suggestions, newest first; `take` limits the list. */
export async function listPendingSuggestions(userId: string, take?: number): Promise<SuggestionItem[]> {
  const rows = await prisma.proposal.findMany({
    where: { userId, status: 'pending', kind: allowedKinds },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      kind: true,
      summary: true,
      rationale: true,
      createdAt: true,
      payload: true,
      before: true,
      targetId: true,
      ...senderSelect,
    },
    ...(take !== undefined && { take }),
  })
  const [titles, senders] = await Promise.all([titlesFor(userId, rows), sendersFor(rows)])
  return rows.map(({ payload, before: _before, targetId: _targetId, agentToken: _token, coachLink: _link, ...item }, i) => ({
    ...item,
    title: titles[i],
    from: senders[i],
    exerciseCount: item.kind === 'saved_workout.create' ? exerciseCountOf(payload) : null,
  }))
}

export function countPendingSuggestions(userId: string): Promise<number> {
  return prisma.proposal.count({ where: { userId, status: 'pending', kind: allowedKinds } })
}

/** A pending coach send's custom exercises, each with the trainee's earlier copy if any. */
async function bundledFor(userId: string, proposal: { id: string; status: string; payload: unknown }): Promise<BundledExercise[]> {
  const { bundle } = splitBundle(proposal.payload)
  if (proposal.status !== 'pending' || bundle.length === 0) return []
  const copies = await earlierCopies(prisma, userId, bundle.map((b) => b.sourceId), proposal.id)
  return bundle.map((b) => ({ sourceId: b.sourceId, name: b.name, earlierCopy: copies.get(b.sourceId)?.name ?? null }))
}

/** Everything the review screen shows, for any status; null is a 404. */
export async function getSuggestionDetail(userId: string, id: string): Promise<SuggestionDetail | null> {
  const proposal = await findSuggestion(userId, id)
  if (!proposal) return null
  const kindLabel = suggestionKindLabel(proposal.kind)
  const [body, [title], [from], customExercises] = await Promise.all([
    suggestionBody(proposal, userId),
    titlesFor(userId, [proposal]),
    sendersFor([proposal]),
    bundledFor(userId, proposal),
  ])
  if (!kindLabel || !body) return null

  return {
    id: proposal.id,
    kind: proposal.kind,
    kindLabel,
    title,
    status: proposal.status,
    outcome: suggestionOutcome(proposal.status),
    summary: proposal.summary,
    rationale: proposal.rationale,
    createdAt: proposal.createdAt,
    from,
    programId: proposal.kind === 'program.create' && proposal.status === 'applied' ? proposal.targetId : null,
    body,
    customExercises,
  }
}
