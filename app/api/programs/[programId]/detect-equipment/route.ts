import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { detectEquipmentNeeded } from '@/lib/community/equipment-detection';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;

    const { user, error } = await getCurrentUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify program exists and belongs to user
    const program = await prisma.program.findUnique({
      where: { id: programId, userId: user.id },
      select: { id: true },
    });

    if (!program) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }

    const equipment = await detectEquipmentNeeded(prisma, programId);

    return NextResponse.json({ equipment });
  } catch (error) {
    console.error('Error detecting equipment:', error);
    return NextResponse.json(
      { error: 'Failed to detect equipment' },
      { status: 500 }
    );
  }
}
