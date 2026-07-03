import { redirect } from 'next/navigation'
import RatioPresetEditor from '@/components/features/ratio-presets/RatioPresetEditor'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getOrCreateUserTrainingProfile } from '@/lib/user-training-profile'

export const metadata = {
  title: 'Training Focus — Ripit',
}

export default async function TrainingFocusPage() {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  const profile = await getOrCreateUserTrainingProfile(prisma, user.id)

  return <RatioPresetEditor initialFauImportance={profile.fauImportance} />
}
