import { redirect } from 'next/navigation'
import EquipmentChecklistEditor from '@/components/features/equipment/EquipmentChecklistEditor'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getOrCreateUserTrainingProfile } from '@/lib/user-training-profile'

export default async function EquipmentSettingsPage() {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  const profile = await getOrCreateUserTrainingProfile(prisma, user.id)

  return (
    <EquipmentChecklistEditor
      initialEquipment={profile.equipmentAvailable}
      initialSet={profile.equipmentAvailableSet}
    />
  )
}
