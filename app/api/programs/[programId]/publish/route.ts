import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { publishProgramToCommunity } from '@/lib/community/publishing';
import {
  isProgramPublished,
  validateProgramForPublishing,
  validateProgramMetadata,
} from '@/lib/community/validation';
import { prisma } from '@/lib/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;

    // Get authenticated user
    const { user, error } = await getCurrentUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify program exists and belongs to user
    const program = await prisma.program.findFirst({
      where: { id: programId, userId: user.id },
    });

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Check if already published
    const isPublished = await isProgramPublished(prisma, programId);
    if (isPublished) {
      return NextResponse.json(
        { error: 'This program has already been published to the community' },
        { status: 400 }
      );
    }

    // Validate program structure
    const validation = await validateProgramForPublishing(
      prisma,
      programId,
      user.id
    );
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Program validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    // Validate metadata
    const metadataValidation = validateProgramMetadata(program);
    if (!metadataValidation.valid) {
      return NextResponse.json(
        {
          error: 'Program metadata incomplete',
          errors: metadataValidation.errors,
        },
        { status: 400 }
      );
    }

    // Publish to community
    const result = await publishProgramToCommunity(
      prisma,
      programId,
      user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to publish program' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      communityProgramId: result.communityProgramId,
    });
  } catch (error) {
    console.error('Error publishing program:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
