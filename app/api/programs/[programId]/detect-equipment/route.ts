import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db';
import { detectEquipmentNeeded } from '@/lib/community/equipment-detection';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;

    const { user, error } = await getCurrentUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Detect program type
    const strengthProgram = await prisma.program.findUnique({
      where: { id: programId, userId: user.id },
      select: { programType: true },
    });

    const cardioProgram = await prisma.cardioProgram.findUnique({
      where: { id: programId, userId: user.id },
    });

    const programType = strengthProgram
      ? 'strength'
      : cardioProgram
        ? 'cardio'
        : null;

    if (!programType) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }

    const equipment = await detectEquipmentNeeded(
      prisma,
      programId,
      programType
    );

    return NextResponse.json({ equipment });
  } catch (error) {
    console.error('Error detecting equipment:', error);
    return NextResponse.json(
      { error: 'Failed to detect equipment' },
      { status: 500 }
    );
  }
}
