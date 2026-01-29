import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db';
import { validateProgramForPublishing, isProgramPublished } from '@/lib/community/validation';
import { publishProgramToCommunity } from '@/lib/community/publishing';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;

    // Get authenticated user
    const { user, error } = await getCurrentUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine if this is a strength or cardio program
    const strengthProgram = await prisma.program.findFirst({
      where: { id: programId, userId: user.id },
    });

    const cardioProgram = await prisma.cardioProgram.findFirst({
      where: { id: programId, userId: user.id },
    });

    const programType = strengthProgram ? 'strength' : cardioProgram ? 'cardio' : null;

    if (!programType) {
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

    // Validate program
    const validation = await validateProgramForPublishing(prisma, programId, user.id, programType);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Program validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    // Publish to community
    const result = await publishProgramToCommunity(prisma, programId, user.id, programType);

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
