import { logger } from '@/lib/logger'

/** The exercise a library write is about: the result's, else the arguments'. */
function libraryExerciseId(args: unknown, data?: unknown): string | undefined {
  const pick = (o: unknown, keys: string[]) => {
    if (!o || typeof o !== 'object') return undefined
    for (const k of keys) {
      const v = (o as Record<string, unknown>)[k]
      if (typeof v === 'string') return v
    }
    return undefined
  }
  return pick(data, ['exerciseId']) ?? pick(args, ['id', 'fromId'])
}

export function logLibrary(
  ctx: { userId: string; tokenId: string },
  tool: string,
  args: unknown,
  outcome: string,
  extra: Record<string, unknown> = {}
) {
  const entry = { ...extra, tokenId: ctx.tokenId, userId: ctx.userId, tool, exerciseId: libraryExerciseId(args, extra), outcome }
  if (outcome === 'refused') logger.warn(entry, 'MCP library write refused')
  else if (outcome === 'error') logger.error(entry, 'MCP library write failed')
  else logger.info(entry, 'MCP library write')
}
