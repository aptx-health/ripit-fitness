import { Prisma, type PrismaClient } from '@prisma/client'
import { z } from 'zod'
import {
  buildAnchors,
  calcSettings,
  computeFauVolume,
  effectiveTargets,
  TARGET_BOUNDS,
  VOLUME_SESSION_STATUSES,
} from '@/lib/insights/balance'
import { computeEffortSummary, EFFORT_SESSION_STATUSES, WEEK_MS } from '@/lib/insights/effort'
import { decodeCursor, EXPORT_COLUMNS, encodeCursor, fetchExportRows, parseRange } from '@/lib/insights/export'
import { computeStallSignals, STALL_SESSION_STATUSES } from '@/lib/insights/stall'
import { logger } from '@/lib/logger'
import type { Notify } from '@/lib/notify'
import { visibleTo } from '@/lib/proposals/exercise-definition'
import { issueField, programInput, programTreeSelect } from '@/lib/proposals/program'
import { createProposal, PROPOSAL_STATUSES } from '@/lib/proposals/service'
import { normalizeTargetMovements } from '@/lib/user-training-profile'
import { VALID_CATEGORIES, VALID_STATUSES } from '@/types/feedback'

/**
 * MCP tools for agents (slice 1). Read tools are scoped to the token's user;
 * write tools only create proposals. There is deliberately no tool that
 * approves, rejects or reverts a proposal.
 */

export interface ToolContext {
  userId: string
  tokenId: string
  notify: Notify
}

export interface CallToolResult {
  [key: string]: unknown
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

export interface ToolDescriptor {
  name: string
  description: string
  inputSchema: { type: 'object'; [key: string]: unknown }
}

// Structural checks only; the exercise-definition validator owns the domain
// rules (valid equipment and muscle groups, lengths).
const definitionFields = {
  name: z.string(),
  equipment: z.array(z.string()),
  primaryFAUs: z.array(z.string()),
  secondaryFAUs: z.array(z.string()).optional(),
  category: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  notes: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
}

const feedbackId = z.string().min(1).optional().describe('Id of the feedback (from list_feedback) this proposal addresses')

const rationale = z.string().trim().min(1).max(2000).describe('Why this change is worth making')

// Domain rules (valid keys, limits, visibility) are the proposal service's, so
// each failure is named by its pattern or FAU.
const nonEmpty = (o: object) => Object.keys(o).length > 0

const DAY_MS = 24 * 60 * 60 * 1000

const schemas = {
  search_exercises: z.object({
    query: z.string().min(1).max(100),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  get_exercise: z.object({ id: z.string().min(1) }),
  list_programs: z.object({}),
  get_program: z.object({ id: z.string().min(1) }),
  get_workout_history: z.object({
    limit: z.number().int().min(1).max(50).optional(),
    since: z.iso.datetime({ offset: true }).or(z.iso.date()).optional().describe('ISO date; only workouts completed on or after it'),
  }),
  get_stall_signals: z.object({
    exerciseDefinitionId: z.string().min(1).optional().describe('Only this exercise'),
    sessions: z.number().int().min(2).max(12).optional().describe('Most recent sessions per exercise; defaults to 6'),
    sinceDays: z.number().int().min(1).max(365).optional().describe('Only sessions in the last N days; defaults to 120'),
  }),
  get_effort_summary: z.object({
    weeks: z.number().int().min(1).max(12).optional().describe('Rolling 7-day weeks, newest first; defaults to 4'),
  }),
  export_training_data: z.object({
    since: z.string().describe('Start date (YYYY-MM-DD, midnight UTC) or ISO timestamp, inclusive'),
    until: z.string().optional().describe('End date or ISO timestamp, exclusive; defaults to now'),
    cursor: z.string().optional().describe("The previous page's nextCursor"),
    limit: z.number().int().min(1).max(2000).optional().describe('Rows per page; defaults to 1000'),
  }),
  get_anchors: z.object({}),
  get_balance_targets: z.object({}),
  get_fau_volume: z.object({
    days: z.number().int().min(1).max(365).optional().describe("Window in days; defaults to the user's lookbackDays"),
  }),
  propose_exercise_create: z.object({
    definition: z.object(definitionFields).strict(),
    rationale,
    feedbackId,
  }),
  propose_exercise_update: z.object({
    id: z.string().min(1),
    changes: z.object(definitionFields).partial().strict(),
    rationale,
    feedbackId,
  }),
  propose_program_create: z.object({
    program: programInput,
    rationale,
    feedbackId,
  }),
  propose_anchor_update: z.object({
    changes: z
      .record(z.string(), z.array(z.string()))
      .refine(nonEmpty, 'changes must name at least one pattern')
      .describe('Pattern -> up to 5 exercise ids, replacing that pattern; [] clears it. Unnamed patterns are untouched'),
    rationale,
    feedbackId,
  }),
  propose_target_update: z.object({
    changes: z
      .record(z.string(), z.number())
      .refine(nonEmpty, 'changes must name at least one FAU')
      .describe('FAU -> target, 0 to 2 in steps of 0.05. Unnamed FAUs are untouched'),
    rationale,
    feedbackId,
  }),
  list_proposals: z.object({ status: z.enum(PROPOSAL_STATUSES).optional() }),
  list_feedback: z.object({
    status: z.enum(VALID_STATUSES).optional().describe('Defaults to new'),
    category: z.enum(VALID_CATEGORIES).optional(),
    limit: z.number().int().min(1).max(50).optional().describe('Defaults to 20'),
  }),
}

type ToolName = keyof typeof schemas
type Args<N extends ToolName> = z.infer<(typeof schemas)[N]>

const descriptions: Record<ToolName, string> = {
  search_exercises: 'Search the exercise library by name or alias.',
  get_exercise: 'Get one exercise definition by id.',
  list_programs: "List the user's training programs with active flag and week count.",
  get_program: "Get one of the user's programs in full: weeks, workouts, exercises and prescribed sets.",
  get_workout_history: 'List completed workouts, newest first, with exercises and logged sets.',
  get_stall_signals:
    'Per exercise, the best working-set e1RM (lbs) of each recent session, oldest first, with early/late means, change percent and sessions since the best. Raw numbers only; sorted biggest drop first.',
  get_effort_summary:
    'Per rolling 7-day week (index 0 = last 7 days): working and rated sets, average effort (RPE, or 10 - RIR), effort distribution, share at 9+ and 10, and session RPE. Raw numbers only.',
  export_training_data:
    'Raw logged sets (warmups included and flagged) from completed and abandoned workouts in a date range, as rows in the listed column order, paged with nextCursor. Nothing is converted. For large pulls in a script, GET /api/agent/export.csv?since=&until= with the same bearer token returns the whole range (up to 3 years) as one CSV.',
  get_anchors:
    'The anchor exercises picked for each of the 6 movement patterns, in stored order, with whole days since each was last logged (null if never).',
  get_balance_targets:
    'Muscle-balance target per FAU (all 18; 1 when unset), whether they are all defaults, the allowed bounds, and the calc settings (read-only to agents).',
  get_fau_volume:
    "Per FAU (all 18), raw counts over the window: primarySets (counted sets of exercises with it as a primary FAU), secondarySets (as a secondary FAU, unweighted), its target and days since last trained as primary. Warmups count only when excludeWarmups is off. Apply secondaryWeight yourself if you want it.",
  propose_anchor_update:
    'Propose new anchor exercises for one or more patterns. Nothing changes until the user approves it.',
  propose_target_update:
    'Propose new muscle-balance targets for one or more FAUs. Calc settings cannot be changed. Nothing changes until the user approves it.',
  propose_exercise_create:
    'Propose a new exercise definition. Nothing changes until the user approves it in the admin Workbench.',
  propose_exercise_update:
    'Propose changes to an existing exercise definition. Nothing changes until the user approves it.',
  propose_program_create:
    'Propose a new program (weeks > workouts > exercises > prescribed sets). Week, day, order and set numbers come from array position. Nothing is created until the user approves it; it is created inactive.',
  list_proposals: "List the user's proposals and their status.",
  list_feedback:
    "List the user's app feedback, newest first (status defaults to new). Pass a feedback id as feedbackId on a propose tool to link the proposal; approving it resolves the feedback.",
}

class ToolError extends Error {
  constructor(
    message: string,
    readonly extra: { field?: string; existingId?: string } = {}
  ) {
    super(message)
  }
}

type Handler<N extends ToolName> = (prisma: PrismaClient, ctx: ToolContext, args: Args<N>) => Promise<unknown>

const handlers: { [N in ToolName]: Handler<N> } = {
  async search_exercises(prisma, ctx, { query, limit }) {
    const term = query.trim()
    const exercises = await prisma.exerciseDefinition.findMany({
      where: {
        AND: [
          visibleTo(ctx.userId),
          {
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { aliases: { has: term.toLowerCase() } },
            ],
          },
        ],
      },
      select: { id: true, name: true, aliases: true, equipment: true, primaryFAUs: true },
      orderBy: { name: 'asc' },
      take: limit ?? 20,
    })
    return { exercises }
  },

  async get_exercise(prisma, ctx, { id }) {
    const exercise = await prisma.exerciseDefinition.findFirst({
      where: { id, ...visibleTo(ctx.userId) },
      select: {
        id: true,
        name: true,
        aliases: true,
        category: true,
        equipment: true,
        primaryFAUs: true,
        secondaryFAUs: true,
        instructions: true,
        notes: true,
        imageUrls: true,
        isSystem: true,
        isBodyweight: true,
        movementPattern: true,
        intensityClass: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!exercise) throw new ToolError('exercise not found', { field: 'id' })
    return { exercise }
  },

  async list_programs(prisma, ctx) {
    const programs = await prisma.program.findMany({
      where: { userId: ctx.userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        programType: true,
        isActive: true,
        isArchived: true,
        createdAt: true,
        _count: { select: { weeks: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return {
      programs: programs.map(({ _count, ...p }) => ({ ...p, weekCount: _count.weeks })),
    }
  },

  async get_program(prisma, ctx, { id }) {
    const program = await prisma.program.findFirst({
      where: { id, userId: ctx.userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        weeks: { orderBy: { weekNumber: 'asc' }, select: programTreeSelect },
      },
    })
    if (!program) throw new ToolError('program not found', { field: 'id' })
    return { program }
  },

  async get_workout_history(prisma, ctx, { limit, since }) {
    const completions = await prisma.workoutCompletion.findMany({
      where: {
        userId: ctx.userId,
        status: 'completed',
        ...(since && { completedAt: { gte: new Date(since) } }),
      },
      orderBy: { completedAt: 'desc' },
      take: limit ?? 10,
      select: {
        id: true,
        name: true,
        completedAt: true,
        workout: { select: { name: true } },
        loggedSets: {
          orderBy: { setNumber: 'asc' },
          select: {
            setNumber: true,
            reps: true,
            weight: true,
            weightUnit: true,
            rpe: true,
            rir: true,
            isWarmup: true,
            exercise: { select: { id: true, name: true, order: true } },
          },
        },
      },
    })

    const workouts = completions.map((c) => {
      const byExercise = new Map<string, { name: string; order: number; loggedSets: unknown[] }>()
      for (const { exercise, ...set } of c.loggedSets) {
        let entry = byExercise.get(exercise.id)
        if (!entry) {
          entry = { name: exercise.name, order: exercise.order, loggedSets: [] }
          byExercise.set(exercise.id, entry)
        }
        entry.loggedSets.push(set)
      }
      return {
        completionId: c.id,
        name: c.name ?? c.workout?.name ?? null,
        completedAt: c.completedAt,
        exercises: [...byExercise.values()]
          .sort((a, b) => a.order - b.order)
          .map(({ name, loggedSets }) => ({ name, loggedSets })),
      }
    })
    return { workouts }
  },

  async get_stall_signals(prisma, ctx, { exerciseDefinitionId, sessions, sinceDays }) {
    const since = new Date(Date.now() - (sinceDays ?? 120) * 24 * 60 * 60 * 1000)
    // Working sets only; reps > 0 because Epley is undefined at 0 reps.
    const sets = await prisma.loggedSet.findMany({
      where: {
        isWarmup: false,
        weight: { gt: 0 },
        reps: { gt: 0 },
        completion: {
          userId: ctx.userId,
          status: { in: STALL_SESSION_STATUSES },
          isArchived: false,
          completedAt: { gte: since },
        },
        ...(exerciseDefinitionId && { exercise: { exerciseDefinitionId } }),
      },
      select: {
        completionId: true,
        reps: true,
        weight: true,
        weightUnit: true,
        completion: { select: { completedAt: true } },
        exercise: { select: { exerciseDefinitionId: true, exerciseDefinition: { select: { name: true } } } },
      },
    })
    const rows = sets.map(({ completion, exercise, ...set }) => ({
      ...set,
      completedAt: completion.completedAt,
      exerciseDefinitionId: exercise.exerciseDefinitionId,
      name: exercise.exerciseDefinition.name,
    }))
    return { exercises: computeStallSignals(rows, sessions ?? 6) }
  },

  async get_effort_summary(prisma, ctx, { weeks }) {
    const count = weeks ?? 4
    const now = new Date()
    const completions = await prisma.workoutCompletion.findMany({
      where: {
        userId: ctx.userId,
        status: { in: EFFORT_SESSION_STATUSES },
        isArchived: false,
        completedAt: { gt: new Date(now.getTime() - count * WEEK_MS), lte: now },
      },
      select: {
        completedAt: true,
        sessionRpe: true,
        loggedSets: {
          where: { isWarmup: false },
          select: { rpe: true, rir: true, exercise: { select: { exerciseDefinitionId: true } } },
        },
      },
    })
    const sessions = completions.map((c) => ({
      completedAt: c.completedAt,
      sessionRpe: c.sessionRpe,
      sets: c.loggedSets.map(({ exercise, ...set }) => ({ ...set, exerciseDefinitionId: exercise.exerciseDefinitionId })),
    }))
    return { weeks: computeEffortSummary(sessions, count, now) }
  },

  async get_anchors(prisma, ctx) {
    const now = new Date()
    const profile = await prisma.userTrainingProfile.findUnique({
      where: { userId: ctx.userId },
      select: { targetMovements: true },
    })
    const anchors = normalizeTargetMovements(profile?.targetMovements)
    const ids = [...new Set(Object.values(anchors).flat())]
    if (ids.length === 0) return buildAnchors(anchors, new Map(), new Map(), now)

    const definitions = await prisma.exerciseDefinition.findMany({
      where: { id: { in: ids }, ...visibleTo(ctx.userId) },
      select: { id: true, name: true },
    })
    // Latest completed, unarchived session per exercise, in one grouped query.
    const logged = await prisma.$queryRaw<Array<{ id: string; last: Date }>>`
      SELECT e."exerciseDefinitionId" AS id, MAX(c."completedAt") AS last
      FROM "LoggedSet" ls
      JOIN "Exercise" e ON e.id = ls."exerciseId"
      JOIN "WorkoutCompletion" c ON c.id = ls."completionId"
      WHERE ls."userId" = ${ctx.userId}
        AND c."userId" = ${ctx.userId}
        AND c.status = 'completed'
        AND c."isArchived" = false
        AND e."exerciseDefinitionId" IN (${Prisma.join(ids)})
      GROUP BY e."exerciseDefinitionId"`
    return buildAnchors(
      anchors,
      new Map(definitions.map((d) => [d.id, d.name])),
      new Map(logged.map((r) => [r.id, r.last])),
      now
    )
  },

  async get_balance_targets(prisma, ctx) {
    const row = await prisma.userMuscleBalanceSettings.findUnique({ where: { userId: ctx.userId } })
    return {
      targets: effectiveTargets(row?.targets),
      isDefault: !row,
      bounds: TARGET_BOUNDS,
      settings: calcSettings(row),
    }
  },

  async get_fau_volume(prisma, ctx, { days }) {
    const row = await prisma.userMuscleBalanceSettings.findUnique({ where: { userId: ctx.userId } })
    const settings = calcSettings(row)
    const now = new Date()
    const since = new Date(now.getTime() - (days ?? settings.lookbackDays) * DAY_MS)
    const completions = await prisma.workoutCompletion.findMany({
      where: {
        userId: ctx.userId,
        status: { in: VOLUME_SESSION_STATUSES },
        isArchived: false,
        completedAt: { gte: since, lte: now },
      },
      select: {
        completedAt: true,
        loggedSets: {
          select: {
            isWarmup: true,
            exercise: { select: { exerciseDefinition: { select: { primaryFAUs: true, secondaryFAUs: true } } } },
          },
        },
      },
    })
    const sessions = completions.map((c) => ({
      completedAt: c.completedAt,
      sets: c.loggedSets.map((set) => ({ isWarmup: set.isWarmup, ...set.exercise.exerciseDefinition })),
    }))
    return {
      since: since.toISOString(),
      until: now.toISOString(),
      sessions: completions.length,
      settings,
      faus: computeFauVolume(sessions, effectiveTargets(row?.targets), settings.excludeWarmups, now),
    }
  },

  async export_training_data(prisma, ctx, { since, until, cursor, limit }) {
    const range = parseRange(since, until, new Date())
    if (!range.ok) throw new ToolError(range.error, { field: range.field })

    // A cursor carries its range, so a page without `until` keeps the first page's "now".
    let offset = 0
    let rangeUntil = range.until
    if (cursor !== undefined) {
      const state = decodeCursor(cursor)
      const sameRange =
        state?.since === range.since.toISOString() &&
        (!until || state.until === range.until.toISOString())
      if (!state || !sameRange) throw new ToolError('invalid cursor for this range', { field: 'cursor' })
      offset = state.offset
      rangeUntil = new Date(state.until)
    }

    const pageSize = limit ?? 1000
    // One extra row tells us whether another page exists.
    const fetched = await fetchExportRows(
      prisma,
      ctx.userId,
      { since: range.since, until: rangeUntil },
      { skip: offset, take: pageSize + 1 }
    )
    const rows = fetched.slice(0, pageSize)
    const nextCursor =
      fetched.length > pageSize
        ? encodeCursor({ offset: offset + pageSize, since: range.since.toISOString(), until: rangeUntil.toISOString() })
        : null
    return { columns: [...EXPORT_COLUMNS], rows, nextCursor, rowCount: rows.length }
  },

  async propose_exercise_create(prisma, ctx, { definition, rationale, feedbackId }) {
    const result = await createProposal(
      prisma,
      {
        userId: ctx.userId,
        agentTokenId: ctx.tokenId,
        kind: 'exercise_definition.create',
        definition,
        rationale,
        feedbackId,
      },
      ctx.notify
    )
    if (!result.ok) throw new ToolError(result.error, { field: result.field, existingId: result.existingId })
    const { id, status, summary } = result.proposal
    return { proposalId: id, status, summary }
  },

  async propose_exercise_update(prisma, ctx, { id, changes, rationale, feedbackId }) {
    const result = await createProposal(
      prisma,
      {
        userId: ctx.userId,
        agentTokenId: ctx.tokenId,
        kind: 'exercise_definition.update',
        id,
        changes,
        rationale,
        feedbackId,
      },
      ctx.notify
    )
    if (!result.ok) throw new ToolError(result.error, { field: result.field, existingId: result.existingId })
    const { id: proposalId, status, summary } = result.proposal
    return { proposalId, status, summary }
  },

  async propose_program_create(prisma, ctx, { program, rationale, feedbackId }) {
    const result = await createProposal(
      prisma,
      { userId: ctx.userId, agentTokenId: ctx.tokenId, kind: 'program.create', program, rationale, feedbackId },
      ctx.notify
    )
    if (!result.ok) throw new ToolError(result.error, { field: result.field, existingId: result.existingId })
    const { id, status, summary } = result.proposal
    return { proposalId: id, status, summary }
  },

  async propose_anchor_update(prisma, ctx, { changes, rationale, feedbackId }) {
    const result = await createProposal(
      prisma,
      { userId: ctx.userId, agentTokenId: ctx.tokenId, kind: 'anchors.update', changes, rationale, feedbackId },
      ctx.notify
    )
    if (!result.ok) throw new ToolError(result.error, { field: result.field })
    const { id, status, summary } = result.proposal
    return { proposalId: id, status, summary }
  },

  async propose_target_update(prisma, ctx, { changes, rationale, feedbackId }) {
    const result = await createProposal(
      prisma,
      { userId: ctx.userId, agentTokenId: ctx.tokenId, kind: 'balance_targets.update', changes, rationale, feedbackId },
      ctx.notify
    )
    if (!result.ok) throw new ToolError(result.error, { field: result.field })
    const { id, status, summary } = result.proposal
    return { proposalId: id, status, summary }
  },

  async list_proposals(prisma, ctx, { status }) {
    const proposals = await prisma.proposal.findMany({
      where: { userId: ctx.userId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        kind: true,
        status: true,
        summary: true,
        targetId: true,
        error: true,
        createdAt: true,
        decidedAt: true,
        feedbackId: true,
      },
    })
    return { proposals }
  },

  async list_feedback(prisma, ctx, { status, category, limit }) {
    const feedback = await prisma.feedback.findMany({
      where: { userId: ctx.userId, status: status ?? 'new', ...(category && { category }) },
      orderBy: { createdAt: 'desc' },
      take: limit ?? 20,
      select: {
        id: true,
        category: true,
        message: true,
        pageUrl: true,
        rating: true,
        refinements: true,
        status: true,
        adminNote: true,
        createdAt: true,
      },
    })
    return { feedback }
  },
}

function isToolName(name: string): name is ToolName {
  return Object.hasOwn(schemas, name)
}

function text(data: unknown, isError = false): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data) }], ...(isError && { isError: true }) }
}

export function listTools(): ToolDescriptor[] {
  return (Object.keys(schemas) as ToolName[]).map((name) => ({
    name,
    description: descriptions[name],
    inputSchema: z.toJSONSchema(schemas[name]) as ToolDescriptor['inputSchema'],
  }))
}

export async function callTool(
  prisma: PrismaClient,
  ctx: ToolContext,
  name: string,
  args: unknown
): Promise<CallToolResult> {
  if (!isToolName(name)) return text({ error: `unknown tool: ${name}` }, true)

  const parsed = schemas[name].safeParse(args ?? {})
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    // Report the field itself, not its container (definition.primaryFAUs -> primaryFAUs,
    // program.weeks.0.workouts -> workouts).
    const field = issueField(issue.path)
    return text({ error: issue.message, ...(field && { field }) }, true)
  }

  try {
    const handler = handlers[name] as Handler<ToolName>
    const data = await handler(prisma, ctx, parsed.data)
    logger.debug({ tool: name, userId: ctx.userId, tokenId: ctx.tokenId }, 'MCP tool called')
    return text(data)
  } catch (error) {
    if (error instanceof ToolError) return text({ error: error.message, ...error.extra }, true)
    logger.error({ error, tool: name, userId: ctx.userId }, 'MCP tool failed')
    return text({ error: 'internal error' }, true)
  }
}
