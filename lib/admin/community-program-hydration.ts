import type { Prisma, PrismaClient } from '@prisma/client'
import { createId } from '@paralleldrive/cuid2'
import { logger } from '@/lib/logger'
import { batchInsertStrengthWeek, type WeekData } from './batch-insert-week'
import { calculateProgramStats } from '@/lib/community/validation'

const ADMIN_DRAFT_STATUS = 'admin_draft'
const STALE_DRAFT_HOURS = 24

interface HydrateResult {
  success: boolean
  tempProgramId?: string
  error?: string
}

interface SerializeResult {
  success: boolean
  error?: string
}

/**
 * Hydrates a CommunityProgram's programData JSON into a temporary Program
 * with real relational records so it can be edited via ProgramBuilder.
 *
 * If an existing fresh draft is found for this admin, returns it (resume editing).
 * Stale drafts (>24h) are cleaned up automatically.
 */
export async function hydrateCommunityProgram(
  prisma: PrismaClient,
  communityProgramId: string,
  adminUserId: string
): Promise<HydrateResult> {
  const communityProgram = await prisma.communityProgram.findUnique({
    where: { id: communityProgramId },
  })

  if (!communityProgram) {
    return { success: false, error: 'Community program not found' }
  }

  if (!communityProgram.curated) {
    return { success: false, error: 'Only curated programs can be edited' }
  }

  const programData = communityProgram.programData as Record<string, unknown>
  if (!programData || !Array.isArray(programData.weeks)) {
    return { success: false, error: 'Invalid programData structure' }
  }

  // Clean up stale drafts for this admin
  const staleThreshold = new Date(Date.now() - STALE_DRAFT_HOURS * 60 * 60 * 1000)
  const staleDrafts = await prisma.program.findMany({
    where: {
      userId: adminUserId,
      copyStatus: ADMIN_DRAFT_STATUS,
      createdAt: { lt: staleThreshold },
    },
    select: { id: true },
  })

  if (staleDrafts.length > 0) {
    await prisma.program.deleteMany({
      where: { id: { in: staleDrafts.map((d) => d.id) } },
    })
    logger.info(
      { count: staleDrafts.length, adminUserId },
      'Cleaned up stale admin draft programs'
    )
  }

  // Check for existing fresh draft linked to this community program
  // We tag drafts with a description containing the community program ID
  const existingDraft = await prisma.program.findFirst({
    where: {
      userId: adminUserId,
      copyStatus: ADMIN_DRAFT_STATUS,
      description: { contains: `[admin-draft:${communityProgramId}]` },
    },
    select: { id: true },
  })

  if (existingDraft) {
    return { success: true, tempProgramId: existingDraft.id }
  }

  // Create temp program from programData
  const tempProgramId = createId()

  await prisma.program.create({
    data: {
      id: tempProgramId,
      name: communityProgram.name,
      description: `[admin-draft:${communityProgramId}]`,
      userId: adminUserId,
      isActive: false,
      isUserCreated: false,
      programType: 'strength',
      isArchived: false,
      copyStatus: ADMIN_DRAFT_STATUS,
      goals: communityProgram.goals,
      level: communityProgram.level,
      durationWeeks: communityProgram.durationWeeks,
      durationDisplay: communityProgram.durationDisplay,
      targetDaysPerWeek: communityProgram.targetDaysPerWeek,
      equipmentNeeded: communityProgram.equipmentNeeded,
      focusAreas: communityProgram.focusAreas,
    },
  })

  // Insert weeks with all nested data in a transaction
  const weeks = programData.weeks as WeekData[]

  await prisma.$transaction(async (tx) => {
    for (const week of weeks) {
      await batchInsertStrengthWeek(tx, week, tempProgramId, adminUserId)
    }
  })

  logger.info(
    { communityProgramId, tempProgramId, weekCount: weeks.length },
    'Hydrated community program into temp program'
  )

  return { success: true, tempProgramId }
}

/**
 * Serializes a temporary Program back into a CommunityProgram's programData JSON,
 * then deletes the temp program.
 */
export async function serializeAndSaveToCommunity(
  prisma: PrismaClient,
  tempProgramId: string,
  communityProgramId: string
): Promise<SerializeResult> {
  // Fetch the full temp program with all relations
  const tempProgram = await prisma.program.findUnique({
    where: { id: tempProgramId },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          workouts: {
            orderBy: { dayNumber: 'asc' },
            include: {
              exercises: {
                orderBy: { order: 'asc' },
                include: {
                  prescribedSets: {
                    orderBy: { setNumber: 'asc' },
                  },
                  exerciseDefinition: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!tempProgram) {
    return { success: false, error: 'Temp program not found' }
  }

  if (tempProgram.copyStatus !== ADMIN_DRAFT_STATUS) {
    return { success: false, error: 'Program is not an admin draft' }
  }

  const communityProgram = await prisma.communityProgram.findUnique({
    where: { id: communityProgramId },
  })

  if (!communityProgram) {
    return { success: false, error: 'Community program not found' }
  }

  if (!communityProgram.curated) {
    return { success: false, error: 'Only curated programs can be edited' }
  }

  // Recalculate stats
  const stats = calculateProgramStats(tempProgram)

  // Serialize the temp program to JSON (same pattern as publishing.ts)
  const programDataJson = tempProgram as unknown as Prisma.JsonObject

  // Update community program with new data
  await prisma.communityProgram.update({
    where: { id: communityProgramId },
    data: {
      name: tempProgram.name,
      description: communityProgram.description,
      programData: programDataJson,
      weekCount: stats.weekCount,
      workoutCount: stats.workoutCount,
      exerciseCount: stats.exerciseCount,
      goals: tempProgram.goals,
      level: tempProgram.level,
      durationWeeks: tempProgram.durationWeeks || stats.weekCount,
      durationDisplay: tempProgram.durationDisplay,
      targetDaysPerWeek: tempProgram.targetDaysPerWeek,
      equipmentNeeded: tempProgram.equipmentNeeded,
      focusAreas: tempProgram.focusAreas,
    },
  })

  // Delete temp program (cascade handles children)
  await prisma.program.delete({ where: { id: tempProgramId } })

  logger.info(
    { communityProgramId, tempProgramId, stats },
    'Serialized temp program back to community program'
  )

  return { success: true }
}

/**
 * Discards an admin draft program by deleting it and all children.
 */
export async function discardDraftProgram(
  prisma: PrismaClient,
  tempProgramId: string,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  const program = await prisma.program.findUnique({
    where: { id: tempProgramId },
    select: { userId: true, copyStatus: true },
  })

  if (!program) {
    return { success: false, error: 'Program not found' }
  }

  if (program.userId !== adminUserId) {
    return { success: false, error: 'Not authorized to delete this draft' }
  }

  if (program.copyStatus !== ADMIN_DRAFT_STATUS) {
    return { success: false, error: 'Program is not an admin draft' }
  }

  await prisma.program.delete({ where: { id: tempProgramId } })

  logger.info({ tempProgramId, adminUserId }, 'Discarded admin draft program')

  return { success: true }
}
