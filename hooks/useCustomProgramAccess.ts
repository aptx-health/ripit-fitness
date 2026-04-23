import { MAX_PROGRAMS } from '@/lib/constants/programs'

type ProgramAccessProps = {
  programCount: number
  isAdmin: boolean
  customProgramLimitBypass: boolean
}

type ProgramAccess = {
  hasAccess: boolean
  bypassLimit: boolean
  remainingSlots: number
  programCount: number
  maxPrograms: number
}

/**
 * Determines whether the user can create new programs.
 * Counts all non-deleted programs (custom + cloned).
 * Admin users and users with customProgramLimitBypass always have access.
 */
export function useProgramAccess({
  programCount,
  isAdmin,
  customProgramLimitBypass,
}: ProgramAccessProps): ProgramAccess {
  const bypassLimit = isAdmin || customProgramLimitBypass

  if (bypassLimit) {
    return {
      hasAccess: true,
      bypassLimit: true,
      remainingSlots: Infinity,
      programCount,
      maxPrograms: MAX_PROGRAMS,
    }
  }

  const remaining = Math.max(0, MAX_PROGRAMS - programCount)

  return {
    hasAccess: remaining > 0,
    bypassLimit: false,
    remainingSlots: remaining,
    programCount,
    maxPrograms: MAX_PROGRAMS,
  }
}
