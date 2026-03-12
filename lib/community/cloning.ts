import type { PrismaClient } from '@prisma/client';
import { publishProgramCloneJob } from '@/lib/queue/clone-jobs';

export interface CloneResult {
  success: boolean;
  programId?: string;
  error?: string;
}

/**
 * Generates a unique program name by checking for existing programs and auto-incrementing
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

  const checkNameExists = async (name: string): Promise<boolean> => {
    const strengthProgram = await prisma.program.findFirst({
      where: { userId: userId, name: name },
    });
    return !!strengthProgram;
  };

  const baseExists = await checkNameExists(candidateName);

  if (!baseExists) {
    return candidateName;
  }

  let counter = 2;
  while (counter < 100) {
    candidateName = `${baseName}${suffix} (${counter})`;

    const exists = await checkNameExists(candidateName);

    if (!exists) {
      return candidateName;
    }

    counter++;
  }

  return `${baseName}${suffix} (${Date.now()})`;
}

/**
 * Clones a community program to a user's personal collection
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

    const programData = communityProgram.programData as Record<string, unknown>;

    if (!programData || !programData.weeks) {
      return {
        success: false,
        error: 'Invalid program data',
      };
    }

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

    // Publish clone job to queue
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
  } catch (error) {
    console.error('Failed to clone community program:', error);
    return {
      success: false,
      error: 'Failed to add program',
    };
  }
}
