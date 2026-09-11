import { cache } from 'react'
import type { WorkbenchCounts } from '@/lib/admin/navigation'
import { prisma } from '@/lib/db'

/**
 * Cheap aggregate counts for the Workbench nav (tiles, groups, sidebar).
 * Wrapped in React `cache()` so the layout and the /admin home page — both
 * server components rendered in the same request — share one query batch
 * instead of issuing it twice.
 */
export const getWorkbenchCounts = cache(async (): Promise<WorkbenchCounts> => {
  const [exercises, feedbackUnresolved, articles, tags, collections, communityPrograms, messages] =
    await Promise.all([
      prisma.exerciseDefinition.count(),
      prisma.feedback.count({ where: { status: { in: ['new', 'reviewed'] } } }),
      prisma.article.count(),
      prisma.tag.count(),
      prisma.collection.count(),
      prisma.communityProgram.count(),
      prisma.inAppMessage.count(),
    ])

  return { exercises, feedbackUnresolved, articles, tags, collections, communityPrograms, messages }
})
