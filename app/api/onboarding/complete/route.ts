import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { cloneCommunityProgram } from '@/lib/community/cloning'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, programManagementLimiter } from '@/lib/rate-limit'

const PROGRAM_MAP: Record<string, string> = {
  machines: 'Machine Starter',
  free_weights_cables: 'Nothing But Cables*',
}

interface OnboardingRequest {
  experienceLevel: 'beginner' | 'experienced'
  equipmentPreference?: 'machines' | 'free_weights_cables'
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimited = await checkRateLimit(programManagementLimiter, user.id)
    if (rateLimited) return rateLimited

    const body = (await request.json()) as OnboardingRequest
    const { experienceLevel, equipmentPreference } = body

    if (!experienceLevel || !['beginner', 'experienced'].includes(experienceLevel)) {
      return NextResponse.json(
        { error: 'experienceLevel must be "beginner" or "experienced"' },
        { status: 400 }
      )
    }

    if (
      experienceLevel === 'beginner' &&
      equipmentPreference &&
      !['machines', 'free_weights_cables'].includes(equipmentPreference)
    ) {
      return NextResponse.json(
        { error: 'equipmentPreference must be "machines" or "free_weights_cables"' },
        { status: 400 }
      )
    }

    // Update user settings
    const settingsUpdate: Record<string, unknown> = {
      experienceLevel,
      onboardingCompleted: true,
      updatedAt: new Date(),
    }

    if (experienceLevel === 'beginner') {
      settingsUpdate.equipmentPreference = equipmentPreference || 'machines'
      settingsUpdate.dismissedPrimer = true // they saw it during onboarding
      settingsUpdate.loggingMode = 'follow_along'
    }

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: settingsUpdate,
      create: {
        userId: user.id,
        ...settingsUpdate,
      },
    })

    // For beginners, clone and activate the appropriate community program
    let programId: string | undefined
    let programName: string | undefined
    if (experienceLevel === 'beginner') {
      const preference = equipmentPreference || 'machines'
      programName = PROGRAM_MAP[preference]

      const communityProgram = await prisma.communityProgram.findFirst({
        where: { name: programName, curated: true },
        select: { id: true },
      })

      if (communityProgram) {
        const result = await cloneCommunityProgram(prisma, communityProgram.id, user.id)

        if (result.success && result.programId) {
          programId = result.programId

          // Activate the shell program immediately (cloning continues in background)
          await prisma.$transaction([
            prisma.program.updateMany({
              where: { userId: user.id, isActive: true },
              data: { isActive: false },
            }),
            prisma.program.update({
              where: { id: result.programId },
              data: { isActive: true },
            }),
          ])
        } else {
          logger.error(
            { userId: user.id, programName, error: result.error },
            'Failed to clone community program during onboarding'
          )
        }
      } else {
        logger.warn(
          { programName },
          'Community program not found for onboarding auto-assign'
        )
      }
    }

    const redirect = experienceLevel === 'beginner' ? '/training?expand=first' : '/programs'

    logger.info(
      { userId: user.id, experienceLevel, equipmentPreference, programId },
      'Onboarding completed'
    )

    return NextResponse.json({
      success: true,
      programId,
      programName,
      redirect,
    })
  } catch (error) {
    logger.error({ error, context: 'onboarding-complete' }, 'Failed to complete onboarding')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
