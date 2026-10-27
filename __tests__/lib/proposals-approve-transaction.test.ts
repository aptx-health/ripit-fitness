import { Prisma, type PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAgentToken } from '@/lib/agent-tokens'
import { callTool } from '@/lib/mcp/tools'
import { approveProposal } from '@/lib/proposals/service'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

// Approving a program proposal writes the whole tree in one interactive
// transaction. These tests cover how that transaction is started and how its
// failure is reported, plus how empty optional strings are stored. They use a
// real database; the Prisma client is wrapped only to observe or fail
// `$transaction`.

let prisma: PrismaClient
let userId: string
let tokenId: string
let benchId: string

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  userId = (await createTestUser()).id
  const token = await createAgentToken(prisma, userId, 'mac-claude')
  tokenId = token.record.id
  benchId = (await createTestExerciseDefinition(prisma, { name: 'Barbell Bench Press', userId })).id
})

type TransactionCall = { options: { timeout?: number; maxWait?: number } | undefined }

/** A client that behaves like `prisma` but records, and optionally rejects, `$transaction`. */
function wrapTransactions(client: PrismaClient, reject?: unknown) {
  const calls: TransactionCall[] = []
  const wrapped = new Proxy(client, {
    get(target, prop) {
      if (prop === '$transaction') {
        return (...args: unknown[]) => {
          calls.push({ options: args[1] as TransactionCall['options'] })
          if (reject) return Promise.reject(reject)
          return (target.$transaction as (...a: unknown[]) => unknown)(...args)
        }
      }
      const value = Reflect.get(target, prop, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  return { wrapped, calls }
}

const noop = async () => {}
const ctx = () => ({ userId, tokenId, notify: noop })

function program() {
  return {
    name: 'Agent Block',
    weeks: [
      {
        name: 'Week A',
        workouts: [
          {
            name: 'Push',
            exercises: [
              {
                exerciseDefinitionId: benchId,
                notes: 'Pause on chest',
                prescribedSets: [
                  { reps: '5', weight: '100' },
                  { reps: '5', weight: '105' },
                  { reps: '5', weight: '110' },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'Keep week',
        workouts: [
          {
            name: 'Pull',
            exercises: [{ exerciseDefinitionId: benchId, notes: 'keep me', prescribedSets: [{ reps: '8' }] }],
          },
        ],
      },
    ],
  }
}

async function pendingProposal(mutate?: (payload: unknown) => void) {
  const res = await callTool(
    prisma,
    ctx() as never,
    'propose_program_create',
    { program: program(), rationale: 'test' } as never
  )
  expect(res.isError, `propose should succeed: ${JSON.stringify(res)}`).toBeUndefined()
  const stored = await prisma.proposal.findFirstOrThrow({ where: { userId }, orderBy: { createdAt: 'desc' } })
  if (mutate) {
    const payload = structuredClone(stored.payload)
    mutate(payload)
    await prisma.proposal.update({ where: { id: stored.id }, data: { payload: payload as Prisma.InputJsonValue } })
  }
  return stored.id
}

/** All objects anywhere in the tree that have the given key. */
function withKey(node: unknown, key: string, out: Array<Record<string, unknown>> = []) {
  if (Array.isArray(node)) for (const n of node) withKey(n, key, out)
  else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>
    if (key in o) out.push(o)
    for (const v of Object.values(o)) withKey(v, key, out)
  }
  return out
}

describe('approving a program proposal: transaction options', () => {
  it('starts the approve transaction with a timeout of at least 30000 ms', async () => {
    const id = await pendingProposal()
    const { wrapped, calls } = wrapTransactions(prisma)

    const result = await approveProposal(wrapped, id, userId)

    expect(result.ok, JSON.stringify(result)).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0].options?.timeout, 'approve must pass { timeout } to $transaction').toBeGreaterThanOrEqual(30000)
  })
})

describe('approving a program proposal: transaction timeout (P2028)', () => {
  it('reports a timed-out transaction as invalid, keeps the proposal pending and records why', async () => {
    const id = await pendingProposal()
    const timeout = new Prisma.PrismaClientKnownRequestError('Transaction already closed: timeout exceeded.', {
      code: 'P2028',
      clientVersion: 'test',
    })
    const { wrapped } = wrapTransactions(prisma, timeout)

    const result = await approveProposal(wrapped, id, userId)

    expect(result).toMatchObject({ ok: false, code: 'invalid' })
    expect(typeof (result as { error?: string }).error).toBe('string')
    const proposal = await prisma.proposal.findUniqueOrThrow({ where: { id } })
    expect(proposal.status).toBe('pending')
    expect(proposal.decidedAt).toBeNull()
    expect(proposal.targetId).toBeNull()
    expect(proposal.error ?? '').toMatch(/time(d)?[ -]?out/i)
    expect(await prisma.program.count()).toBe(0)
  })

  it('still rethrows a Prisma error it does not know', async () => {
    const id = await pendingProposal()
    const other = new Prisma.PrismaClientKnownRequestError('connection lost', { code: 'P1001', clientVersion: 'test' })
    const { wrapped } = wrapTransactions(prisma, other)

    await expect(approveProposal(wrapped, id, userId)).rejects.toBe(other)
    expect((await prisma.proposal.findUniqueOrThrow({ where: { id } })).status).toBe('pending')
  })
})

describe('approving a program proposal: empty optional strings', () => {
  async function approveWith(mutate: (payload: unknown) => void) {
    const id = await pendingProposal(mutate)
    const result = await approveProposal(prisma, id, userId)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    return await prisma.week.findMany({
      orderBy: { weekNumber: 'asc' },
      include: {
        workouts: { include: { exercises: { include: { prescribedSets: { orderBy: { setNumber: 'asc' } } } } } },
      },
    })
  }

  it('stores an empty or blank set weight as null and keeps real weights', async () => {
    const weeks = await approveWith((payload) => {
      const sets = withKey(payload, 'reps')
      // Week A, first exercise: set 1 keeps '100'; sets 2 and 3 are empty and blank.
      sets[1].weight = ''
      sets[2].weight = '   '
    })
    const first = weeks[0].workouts[0].exercises[0]
    expect(first.prescribedSets.map((s) => s.weight)).toEqual(['100', null, null])
    // A set that never had a weight is still null.
    expect(weeks[1].workouts[0].exercises[0].prescribedSets.map((s) => s.weight)).toEqual([null])
  })

  it('stores blank exercise notes as null and keeps real notes', async () => {
    const weeks = await approveWith((payload) => {
      withKey(payload, 'exerciseDefinitionId')[0].notes = '   '
    })
    expect(weeks[0].workouts[0].exercises[0].notes).toBeNull()
    expect(weeks[1].workouts[0].exercises[0].notes).toBe('keep me')
  })

  it('stores a blank week name as null and keeps real names', async () => {
    const weeks = await approveWith((payload) => {
      withKey(payload, 'workouts')[0].name = '   '
    })
    expect(weeks[0].name).toBeNull()
    expect(weeks[1].name).toBe('Keep week')
  })
})
