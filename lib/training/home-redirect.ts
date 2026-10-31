import { prisma } from '@/lib/db'

/**
 * Where `/` sends a signed-in user: onboarding until it's done, then Training,
 * whether or not there's an active program.
 */
export async function homeRedirectTarget(userId: string): Promise<'/onboarding' | '/training'> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { onboardingCompleted: true },
  })
  return settings && !settings.onboardingCompleted ? '/onboarding' : '/training'
}
