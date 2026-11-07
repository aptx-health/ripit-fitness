import type { Prisma, PrismaClient } from '@prisma/client'
import { type ProgramInput, programInput } from '@/lib/proposals/program'
import { type WorkoutCreateInput, workoutCreateInput } from '@/lib/proposals/saved-workout'
import { createProposal } from '@/lib/proposals/service'
import type { SavedWorkoutData } from '@/types/saved-workout'
import { normaliseProgram, normaliseWorkout, reasonFor } from './send-normalise'

/**
 * Coaching slice 2 (features/coaching/send.feature): a coach sends one of
 * their own programs or saved workouts to a trainee on an active link. It
 * arrives as a pending proposal on the trainee's account, from the link, with
 * the coach's note as its "Why". The payload is a snapshot: later edits to the
 * coach's copy don't reach it. A coach send never notifies anyone. The same
 * thing can't wait twice: a pending identical send on the link is refused.
 */

export type SendKind = 'program' | 'saved_workout'
export const SEND_KINDS: readonly SendKind[] = ['program', 'saved_workout']

export interface SendInput {
  linkId: string
  kind: SendKind
  sourceId: string
  note?: string
}

export type SendResult =
  | { ok: true; proposalId: string }
  | {
      ok: false
      code: 'not_linked' | 'not_found' | 'invalid' | 'duplicate'
      /** Exercises the trainee doesn't have, by name (code invalid). */
      missingExercises?: string[]
      /** Why it can't be sent, naming where, e.g. "Week 1, Day 2, Squat, set 1: reps is too long (max 20)". */
      reason?: string
    }

export type SentStatus = 'pending' | 'accepted' | 'declined'

export interface SentItem {
  name: string
  kind: SendKind
  sentAt: Date
  status: SentStatus
}

// --- Converters ----------------------------------------------------------------

interface SetRow {
  setNumber: number
  reps: string
  weight?: string | null
  rpe?: number | null
  rir?: number | null
  isWarmup?: boolean | null
}
interface ExerciseRow {
  order: number
  exerciseDefinitionId: string
  notes?: string | null
  exerciseGroup?: string | null
  prescribedSets: SetRow[]
}
interface ProgramRow {
  name: string
  description?: string | null
  weeks: Array<{
    weekNumber: number
    name?: string | null
    workouts: Array<{ dayNumber: number; name: string; exercises: ExerciseRow[] }>
  }>
}
interface SavedWorkoutRow {
  name: string
  notes?: string | null
  workoutData: unknown
}

const by =
  <T>(key: (item: T) => number) =>
  (a: T, b: T) =>
    key(a) - key(b)
const sorted = <T>(items: T[], key: (item: T) => number) => [...items].sort(by(key))

/** Program proposal input from the coach's program rows: positions from the stored numbers, nulls left out. */
export function programToInput(program: ProgramRow): ProgramInput {
  return {
    name: program.name,
    ...(program.description && { description: program.description }),
    weeks: sorted(program.weeks, (w) => w.weekNumber).map((week) => ({
      ...(week.name && { name: week.name }),
      workouts: sorted(week.workouts, (d) => d.dayNumber).map((workout) => ({
        name: workout.name,
        exercises: sorted(workout.exercises, (e) => e.order).map((exercise) => ({
          exerciseDefinitionId: exercise.exerciseDefinitionId,
          ...(exercise.notes && { notes: exercise.notes }),
          ...(exercise.exerciseGroup && { group: exercise.exerciseGroup }),
          prescribedSets: sorted(exercise.prescribedSets, (s) => s.setNumber).map((set) => ({
            reps: set.reps,
            ...(set.weight && { weight: set.weight }),
            ...(set.rpe != null && { rpe: set.rpe }),
            ...(set.rir != null && { rir: set.rir }),
            ...(set.isWarmup && { isWarmup: true }),
          })),
        })),
      })),
    })),
  }
}

/** Saved-workout proposal input from the coach's saved workout, as stored. */
export function savedWorkoutToInput(saved: SavedWorkoutRow): WorkoutCreateInput {
  const data = (Array.isArray(saved.workoutData) ? saved.workoutData : []) as SavedWorkoutData
  return {
    name: saved.name,
    ...(saved.notes && { notes: saved.notes }),
    exercises: sorted(data, (e) => e.order).map((exercise) => ({
      exerciseDefinitionId: exercise.exerciseDefinitionId,
      ...(exercise.notes && { notes: exercise.notes }),
      ...(exercise.exerciseGroup && { group: exercise.exerciseGroup }),
      sets: sorted(exercise.sets ?? [], (s) => s.setNumber).map((set) => ({
        reps: set.reps,
        ...(set.rir != null && { rir: set.rir }),
        ...(set.rpe != null && { rpe: set.rpe }),
        ...(set.isWarmup && { isWarmup: true }),
      })),
    })),
  }
}

// --- Sending -------------------------------------------------------------------

const programSource = {
  name: true,
  description: true,
  weeks: {
    select: {
      weekNumber: true,
      name: true,
      workouts: {
        select: {
          dayNumber: true,
          name: true,
          exercises: {
            select: {
              order: true,
              exerciseDefinitionId: true,
              notes: true,
              exerciseGroup: true,
              prescribedSets: {
                select: { setNumber: true, reps: true, weight: true, rpe: true, rir: true, isWarmup: true },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProgramSelect

async function activeLinkAsCoach(db: PrismaClient, coachUserId: string, linkId: string) {
  return db.coachLink.findFirst({
    where: { id: linkId, coachUserId, endedAt: null },
    select: { id: true, traineeUserId: true },
  })
}

/**
 * The definitions' names (for reasons), and the ones the trainee can't see
 * (in order of use, once each). One query.
 */
async function exercisesFor(db: PrismaClient, traineeUserId: string, ids: string[]) {
  const unique = [...new Set(ids)]
  const found = await db.exerciseDefinition.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, isSystem: true, userId: true },
  })
  const names = new Map(found.map((d) => [d.id, d.name]))
  const visible = new Set(found.filter((d) => d.isSystem || d.userId === traineeUserId).map((d) => d.id))
  const missing = unique.filter((id) => !visible.has(id)).map((id) => names.get(id) ?? id)
  return { names, missing }
}

/** The coach's own program or saved workout as proposal input, or null when it isn't theirs (or is deleted). */
async function snapshot(db: PrismaClient, coachUserId: string, kind: SendKind, sourceId: string) {
  if (kind === 'program') {
    const program = await db.program.findFirst({
      where: { id: sourceId, userId: coachUserId, deletedAt: null },
      select: programSource,
    })
    if (!program) return null
    const input = normaliseProgram(programToInput(program))
    const ids = input.weeks.flatMap((w) => w.workouts.flatMap((d) => d.exercises.map((e) => e.exerciseDefinitionId)))
    return { input, ids }
  }
  const saved = await db.savedWorkout.findFirst({
    where: { id: sourceId, userId: coachUserId },
    select: { name: true, notes: true, workoutData: true },
  })
  if (!saved) return null
  const input = normaliseWorkout(savedWorkoutToInput(saved))
  return { input, ids: input.exercises.map((e) => e.exerciseDefinitionId) }
}

const noNotify = async () => {}

/**
 * Send a copy of the coach's program or saved workout to the link's trainee.
 * The proposal checks run as the trainee, so an exercise only the coach can
 * see is refused by name before anything is written.
 */
export async function sendToTrainee(db: PrismaClient, coachUserId: string, input: SendInput): Promise<SendResult> {
  const link = await activeLinkAsCoach(db, coachUserId, input.linkId)
  if (!link) return { ok: false, code: 'not_linked' }

  const source = await snapshot(db, coachUserId, input.kind, input.sourceId)
  if (!source) return { ok: false, code: 'not_found' }

  const { names, missing } = await exercisesFor(db, link.traineeUserId, source.ids)
  if (missing.length) {
    return { ok: false, code: 'invalid', missingExercises: missing, reason: `Missing exercises: ${missing.join(', ')}` }
  }

  // The proposal schema, checked here so the refusal can say where.
  const parsed = input.kind === 'program' ? programInput.safeParse(source.input) : workoutCreateInput.safeParse(source.input)
  if (!parsed.success) {
    const reason = reasonFor(parsed.error.issues[0], source.input, names, input.kind === 'program' ? 'program' : 'workout')
    return { ok: false, code: 'invalid', reason }
  }

  const kind = input.kind === 'program' ? 'program.create' : 'saved_workout.create'
  const waiting = await db.proposal.findFirst({
    where: { coachLinkId: link.id, status: 'pending', kind, payload: { equals: parsed.data as Prisma.InputJsonValue } },
    select: { id: true },
  })
  if (waiting) return { ok: false, code: 'duplicate', reason: 'Already waiting for them to decide' }

  const common = { userId: link.traineeUserId, agentTokenId: null, coachLinkId: link.id, rationale: input.note?.trim() ?? '' }
  const result =
    input.kind === 'program'
      ? await createProposal(db, { ...common, kind: 'program.create', program: parsed.data }, noNotify)
      : await createProposal(db, { ...common, kind: 'saved_workout.create', workout: parsed.data }, noNotify)
  if (!result.ok) return { ok: false, code: 'invalid', reason: result.error }
  return { ok: true, proposalId: result.proposal.id }
}

const SENT_KIND: Record<string, SendKind> = { 'program.create': 'program', 'saved_workout.create': 'saved_workout' }

// Reverted means the trainee undid an accept; conflict means it couldn't apply. Neither is "Accepted" any more.
const SENT_STATUS: Record<string, SentStatus> = {
  pending: 'pending',
  applied: 'accepted',
  rejected: 'declined',
  reverted: 'declined',
  conflict: 'pending',
}

/**
 * What the coach sent on an active link they coach, newest first: name, kind,
 * when and its status. Nothing else about the trainee. [] for an ended link or
 * one the user doesn't coach.
 */
export async function listSent(db: PrismaClient, coachUserId: string, linkId: string): Promise<SentItem[]> {
  const link = await activeLinkAsCoach(db, coachUserId, linkId)
  if (!link) return []
  const rows = await db.proposal.findMany({
    where: { coachLinkId: link.id, kind: { in: Object.keys(SENT_KIND) } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { kind: true, status: true, createdAt: true, payload: true },
  })
  return rows.map((r) => ({
    name: String((r.payload as { name?: unknown } | null)?.name ?? ''),
    kind: SENT_KIND[r.kind],
    sentAt: r.createdAt,
    status: SENT_STATUS[r.status] ?? 'pending',
  }))
}
