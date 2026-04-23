import { MAX_CUSTOM_PROGRAMS } from '@/lib/constants/programs'

type CustomProgramAccessProps = {
  customProgramCount: number
  isAdmin: boolean
  customProgramLimitBypass: boolean
}

type CustomProgramAccess = {
  hasAccess: boolean
  remainingSlots: number
  customProgramCount: number
  maxPrograms: number
}

/**
 * Determines whether the user can create new custom programs.
 * Admin users and users with customProgramLimitBypass always have access.
 */
export function useCustomProgramAccess({
  customProgramCount,
  isAdmin,
  customProgramLimitBypass,
}: CustomProgramAccessProps): CustomProgramAccess {
  const bypassLimit = isAdmin || customProgramLimitBypass

  if (bypassLimit) {
    return {
      hasAccess: true,
      remainingSlots: Infinity,
      customProgramCount,
      maxPrograms: MAX_CUSTOM_PROGRAMS,
    }
  }

  const remaining = Math.max(0, MAX_CUSTOM_PROGRAMS - customProgramCount)

  return {
    hasAccess: remaining > 0,
    remainingSlots: remaining,
    customProgramCount,
    maxPrograms: MAX_CUSTOM_PROGRAMS,
  }
}
