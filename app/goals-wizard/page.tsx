import { redirect } from 'next/navigation'
import { GoalsWizard } from '@/components/features/goals-wizard/GoalsWizard'
import type { WizardAnswers } from '@/components/features/goals-wizard/types'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getOrCreateUserTrainingProfile } from '@/lib/user-training-profile'

export const metadata = {
  title: 'Goals — Ripit',
}

export default async function GoalsWizardPage() {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  const profile = await getOrCreateUserTrainingProfile(prisma, user.id)

  // Seed only the wizard-owned slice; other fields stay under their own flows.
  const initialAnswers: WizardAnswers = {
    goalCategories: profile.goalCategories,
    otherActivities: profile.otherActivities,
    fauImportance: profile.fauImportance,
    fauImportancePreset: profile.fauImportancePreset,
    defaultIntensityPreference: profile.defaultIntensityPreference,
    targetSessionsPerWeek: profile.targetSessionsPerWeek,
    targetMinutesPerSession: profile.targetMinutesPerSession,
    patternPreference: profile.patternPreference,
    preferredDays: profile.preferredDays,
    injuryAreas: profile.injuryAreas,
    birthYear: profile.birthYear,
    biologicalSex: profile.biologicalSex,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
  }

  return <GoalsWizard userId={user.id} initialAnswers={initialAnswers} />
}
