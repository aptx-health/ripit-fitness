import { describe, expect, it } from 'vitest'
import { shouldShowPrimer } from './primer'

/**
 * Regression tests for the Beginner Primer visibility contract (issue #485).
 *
 * The primer is important beginner-facing UX that was specifically praised in
 * the gym-owner demo. These tests exist to prevent accidental removal or
 * regression of the "first workout only" trigger during tutorial reworks.
 */
describe('shouldShowPrimer', () => {
  it('shows on first-ever workout (no history, not dismissed)', () => {
    expect(
      shouldShowPrimer({
        historyCount: 0,
        dismissedPrimer: false,
        settingsLoading: false,
      }),
    ).toBe(true)
  })

  it('does not show after the user has completed any workout', () => {
    expect(
      shouldShowPrimer({
        historyCount: 1,
        dismissedPrimer: false,
        settingsLoading: false,
      }),
    ).toBe(false)
  })

  it('does not show for users with long history', () => {
    expect(
      shouldShowPrimer({
        historyCount: 42,
        dismissedPrimer: false,
        settingsLoading: false,
      }),
    ).toBe(false)
  })

  it('does not show once the user has dismissed it', () => {
    expect(
      shouldShowPrimer({
        historyCount: 0,
        dismissedPrimer: true,
        settingsLoading: false,
      }),
    ).toBe(false)
  })

  it('does not show while settings are still loading (avoids flash)', () => {
    expect(
      shouldShowPrimer({
        historyCount: 0,
        dismissedPrimer: false,
        settingsLoading: true,
      }),
    ).toBe(false)
  })

  it('dismissal outranks history edge case (dismissed with no history)', () => {
    // Defensive: if somehow dismissedPrimer is true before any history
    // (e.g. user skipped via X on first render), we must still not re-show.
    expect(
      shouldShowPrimer({
        historyCount: 0,
        dismissedPrimer: true,
        settingsLoading: false,
      }),
    ).toBe(false)
  })
})
