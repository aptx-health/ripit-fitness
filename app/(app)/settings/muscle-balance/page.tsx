import { redirect } from 'next/navigation'
import MuscleBalanceSettingsEditor from '@/components/features/muscle-balance/MuscleBalanceSettingsEditor'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getMuscleBalanceSnapshot } from '@/lib/muscle-balance'

export default async function MuscleBalanceSettingsPage() {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  const snapshot = await getMuscleBalanceSnapshot(prisma, user.id)

  return <MuscleBalanceSettingsEditor initialSnapshot={snapshot} />
}
