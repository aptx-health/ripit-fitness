import type { PrismaClient } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { callTool } from '@/lib/mcp/tools'

// Argument handling for the list_feedback MCP tool. The query itself is
// covered by features/agent-tools/feedback-to-proposals.feature; here a stub
// client records the findMany arguments, so no database is needed.
function stubPrisma() {
  const findMany = vi.fn(async (_args: unknown) => [])
  return { prisma: { feedback: { findMany } } as unknown as PrismaClient, findMany }
}

const ctx = { userId: 'user-1', tokenId: 'token-1', role: 'user', notify: vi.fn(async () => {}) }

function payload(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text)
}

describe('list_feedback tool arguments', () => {
  it('defaults to new feedback, newest first, 20 items, scoped to the user', async () => {
    const { prisma, findMany } = stubPrisma()
    const result = await callTool(prisma, ctx, 'list_feedback', {})

    expect(result.isError).toBeUndefined()
    expect(payload(result)).toEqual({ feedback: [] })
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', status: 'new' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
    )
  })

  it('never selects userAgent', async () => {
    const { prisma, findMany } = stubPrisma()
    await callTool(prisma, ctx, 'list_feedback', {})
    const { select } = findMany.mock.calls[0][0] as { select: Record<string, boolean> }
    expect(select).not.toHaveProperty('userAgent')
  })

  it('accepts a limit up to 50', async () => {
    const { prisma, findMany } = stubPrisma()
    await callTool(prisma, ctx, 'list_feedback', { limit: 50, status: 'resolved', category: 'bug' })
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', status: 'resolved', category: 'bug' }, take: 50 })
    )
  })

  it.each([
    [{ limit: 51 }, 'limit'],
    [{ limit: 0 }, 'limit'],
    [{ status: 'open' }, 'status'],
    [{ category: 'complaint' }, 'category'],
  ])('rejects %j with a tool error naming %s', async (args, field) => {
    const { prisma, findMany } = stubPrisma()
    const result = await callTool(prisma, ctx, 'list_feedback', args)

    expect(result.isError).toBe(true)
    expect(payload(result).field).toBe(field)
    expect(findMany).not.toHaveBeenCalled()
  })
})
