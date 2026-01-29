import { PrismaClient } from '@prisma/client';
import { publishProgramCloneJob } from '@/lib/gcp/pubsub';

export interface CloneResult {
  success: boolean;
  programId?: string;
  error?: string;
}

/**
 * Generates a unique program name by checking for existing programs and auto-incrementing
 * Checks both strength and cardio program tables to ensure uniqueness
 * Examples:
 * - "My Program (Community)" if no conflict
 * - "My Program (Community) (2)" if first name exists
 * - "My Program (Community) (3)" if first two exist
 */
async function generateUniqueProgramName(
  prisma: PrismaClient,
  baseName: string,
  userId: string
): Promise<string> {
  const suffix = ' (Community)';
  let candidateName = `${baseName}${suffix}`;

  // Check both strength and cardio programs for name conflicts
  const checkNameExists = async (name: string): Promise<boolean> => {
    const [strengthProgram, cardioProgram] = await Promise.all([
      prisma.program.findFirst({
        where: { userId: userId, name: name },
      }),
      prisma.cardioProgram.findFirst({
        where: { userId: userId, name: name },
      }),
    ]);
    return !!(strengthProgram || cardioProgram);
  };

  // Check if the base name with (Community) suffix is available
  const baseExists = await checkNameExists(candidateName);

  if (!baseExists) {
    return candidateName;
  }

  // Name is taken, start checking numbered variants
  let counter = 2;
  while (counter < 100) { // Safety limit to prevent infinite loop
    candidateName = `${baseName}${suffix} (${counter})`;

    const exists = await checkNameExists(candidateName);

    if (!exists) {
      return candidateName;
    }

    counter++;
  }

  // Fallback: append timestamp if somehow we hit 100 variants
  return `${baseName}${suffix} (${Date.now()})`;
}

/**
 * Clones a strength community program via Pub/Sub background processing
 */
async function cloneStrengthProgram(
  prisma: PrismaClient,
  communityProgram: any,
  userId: string
): Promise<CloneResult> {
  // Generate unique name upfront
  const uniqueName = await generateUniqueProgramName(
    prisma,
    communityProgram.name,
    userId
  );

  // Create shell program immediately
  const shellProgram = await prisma.program.create({
    data: {
      name: uniqueName,
      description: communityProgram.description,
      userId: userId,
      isActive: false,
      isArchived: false,
      programType: 'strength',
      isUserCreated: true,
      copyStatus: 'cloning',
    },
  });

  // Publish clone job to Pub/Sub — Cloud Run worker fetches programData from CommunityProgram table
  await publishProgramCloneJob({
    communityProgramId: communityProgram.id,
    programId: shellProgram.id,
    userId: userId,
    programType: 'strength',
  });

  return {
    success: true,
    programId: shellProgram.id,
  };
}

/**
 * Clones a cardio community program via Pub/Sub background processing
 */
async function cloneCardioProgram(
  prisma: PrismaClient,
  communityProgram: any,
  userId: string
): Promise<CloneResult> {
  // Generate unique name upfront
  const uniqueName = await generateUniqueProgramName(
    prisma,
    communityProgram.name,
    userId
  );

  // Create shell program immediately
  const shellProgram = await prisma.cardioProgram.create({
    data: {
      name: uniqueName,
      description: communityProgram.description,
      userId: userId,
      isActive: false,
      isArchived: false,
      isUserCreated: true,
      copyStatus: 'cloning',
    },
  });

  // Publish clone job to Pub/Sub — Cloud Run worker fetches programData from CommunityProgram table
  await publishProgramCloneJob({
    communityProgramId: communityProgram.id,
    programId: shellProgram.id,
    userId: userId,
    programType: 'cardio',
  });

  return {
    success: true,
    programId: shellProgram.id,
  };
}

/**
 * Clones a community program to a user's personal collection
 * Handles both strength and cardio programs
 */
export async function cloneCommunityProgram(
  prisma: PrismaClient,
  communityProgramId: string,
  userId: string
): Promise<CloneResult> {
  try {
    const communityProgram = await prisma.communityProgram.findUnique({
      where: { id: communityProgramId },
      select: {
        id: true,
        name: true,
        description: true,
        programType: true,
        programData: true,
      },
    });

    if (!communityProgram) {
      return {
        success: false,
        error: 'Community program not found',
      };
    }

    const programData = communityProgram.programData as any;

    if (!programData || !programData.weeks) {
      return {
        success: false,
        error: 'Invalid program data',
      };
    }

    if (communityProgram.programType === 'cardio') {
      return await cloneCardioProgram(prisma, communityProgram, userId);
    }

    return await cloneStrengthProgram(prisma, communityProgram, userId);
  } catch (error) {
    console.error('Failed to clone community program:', error);
    return {
      success: false,
      error: 'Failed to add program',
    };
  }
}
