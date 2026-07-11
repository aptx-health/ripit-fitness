import { redirect } from 'next/navigation'
import TargetMovementsEditor from '@/components/features/target-movements/TargetMovementsEditor'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getOrCreateUserTrainingProfile } from '@/lib/user-training-profile'

export default async function TargetMovementsSettingsPage() {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  const profile = await getOrCreateUserTrainingProfile(prisma, user.id)

  const ids = Array.from(
    new Set(Object.values(profile.targetMovements).flat().filter(Boolean))
  ) as string[]
  const exercises = ids.length
    ? await prisma.exerciseDefinition.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          name: true,
          primaryFAUs: true,
          secondaryFAUs: true,
          equipment: true,
        },
      })
    : []

  return (
    <TargetMovementsEditor
      initialTargetMovements={profile.targetMovements}
      initialExercises={exercises}
    />
  )
}
