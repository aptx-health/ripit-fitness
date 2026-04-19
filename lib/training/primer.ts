/**
 * Beginner Primer visibility logic.
 *
 * The pre-workout primer wizard (components/features/training/BeginnerPrimerWizard.tsx)
 * must appear exactly once — before a user's very first workout — and never again.
 *
 * Gym-owner demo feedback (item 5.6, issue #485) specifically called this primer
 * out as making newcomers feel prepared. This helper exists as a regression
 * safety net: the rules for showing the primer are centralized here and covered
 * by unit tests so they survive reworks.
 */

export type PrimerGateInput = {
  /** Number of completed workouts in the user's history. */
  historyCount: number
  /** Whether the user has already dismissed the primer (UserSettings.dismissedPrimer). */
  dismissedPrimer: boolean
  /** Whether user settings are still loading from the server. */
  settingsLoading: boolean
}

/**
 * Returns true iff the beginner primer should be shown to the user.
 *
 * Contract (enforced by primer.test.ts):
 * - Must show before the user's very first workout (historyCount === 0)
 * - Must NOT show on subsequent workouts (any history)
 * - Must NOT show after dismissal
 * - Must NOT show while settings are still loading (avoids flashing)
 */
export function shouldShowPrimer({
  historyCount,
  dismissedPrimer,
  settingsLoading,
}: PrimerGateInput): boolean {
  if (settingsLoading) return false
  if (dismissedPrimer) return false
  return historyCount === 0
}
