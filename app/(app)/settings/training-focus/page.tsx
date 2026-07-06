import { redirect } from 'next/navigation'
import TrainingFocusSettingsEditor from '@/components/features/training-focus/TrainingFocusSettingsEditor'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getOrCreateUserTrainingProfile } from '@/lib/user-training-profile'

export default async function TrainingFocusSettingsPage() {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  const profile = await getOrCreateUserTrainingProfile(prisma, user.id)

  return (
    <TrainingFocusSettingsEditor
      initialImportance={profile.fauImportance}
      initialPreset={profile.fauImportancePreset}
    />
  )
}
