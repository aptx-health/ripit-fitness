import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { Notify } from '@/lib/notify'
import { visibleTo } from '@/lib/proposals/exercise-definition'
import { createProposal, PROPOSAL_STATUSES } from '@/lib/proposals/service'

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

const rationale = z.string().trim().min(1).max(2000).describe('Why this change is worth making')

const schemas = {
  search_exercises: z.object({
    query: z.string().min(1).max(100),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  get_exercise: z.object({ id: z.string().min(1) }),
  list_programs: z.object({}),
  get_workout_history: z.object({
    limit: z.number().int().min(1).max(50).optional(),
    since: z.iso.datetime({ offset: true }).or(z.iso.date()).optional().describe('ISO date; only workouts completed on or after it'),
  }),
  propose_exercise_create: z.object({
    definition: z.object(definitionFields).strict(),
    rationale,
  }),
  propose_exercise_update: z.object({
    id: z.string().min(1),
    changes: z.object(definitionFields).partial().strict(),
    rationale,
  }),
  list_proposals: z.object({ status: z.enum(PROPOSAL_STATUSES).optional() }),
}

type ToolName = keyof typeof schemas
type Args<N extends ToolName> = z.infer<(typeof schemas)[N]>

const descriptions: Record<ToolName, string> = {
  search_exercises: 'Search the exercise library by name or alias.',
  get_exercise: 'Get one exercise definition by id.',
  list_programs: "List the user's training programs with active flag and week count.",
  get_workout_history: 'List completed workouts, newest first, with exercises and logged sets.',
  propose_exercise_create:
    'Propose a new exercise definition. Nothing changes until the user approves it in the admin Workbench.',
  propose_exercise_update:
    'Propose changes to an existing exercise definition. Nothing changes until the user approves it.',
  list_proposals: "List the user's proposals and their status.",
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

  async propose_exercise_create(prisma, ctx, { definition, rationale }) {
    const result = await createProposal(
      prisma,
      { userId: ctx.userId, agentTokenId: ctx.tokenId, kind: 'exercise_definition.create', definition, rationale },
      ctx.notify
    )
    if (!result.ok) throw new ToolError(result.error, { field: result.field, existingId: result.existingId })
    const { id, status, summary } = result.proposal
    return { proposalId: id, status, summary }
  },

  async propose_exercise_update(prisma, ctx, { id, changes, rationale }) {
    const result = await createProposal(
      prisma,
      { userId: ctx.userId, agentTokenId: ctx.tokenId, kind: 'exercise_definition.update', id, changes, rationale },
      ctx.notify
    )
    if (!result.ok) throw new ToolError(result.error, { field: result.field, existingId: result.existingId })
    const { id: proposalId, status, summary } = result.proposal
    return { proposalId, status, summary }
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
      },
    })
    return { proposals }
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
    const path = issue.path.map(String)
    // Report the field itself, not its container (definition.primaryFAUs -> primaryFAUs).
    const field = (path[0] === 'definition' || path[0] === 'changes' ? path[1] : path[0]) ?? path[0]
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
