import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ communityProgramId: string }> }
) {
  try {
    const { communityProgramId } = await params;

    // Get authenticated user
    const { user, error } = await getCurrentUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the community program to verify ownership
    const communityProgram = await prisma.communityProgram.findUnique({
      where: { id: communityProgramId },
      select: { id: true, authorUserId: true },
    });

    if (!communityProgram) {
      return NextResponse.json(
        { error: 'Community program not found' },
        { status: 404 }
      );
    }

    // Verify user is the author
    if (communityProgram.authorUserId !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own published programs' },
        { status: 403 }
      );
    }

    // Delete the community program (RLS policy will also enforce this)
    await prisma.communityProgram.delete({
      where: { id: communityProgramId },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting community program:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
