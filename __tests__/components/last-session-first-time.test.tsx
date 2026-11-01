/**
 * L1: the "First time logging this" note is for before the first set. Once a
 * set of this exercise is logged in this workout, it is not the first time
 * any more, so the note goes. Spec: initiatives/ui-audit/spec.md ("L1", item 6).
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import LastSessionReference from '@/components/workout-logging/LastSessionReference'

afterEach(cleanup)

const neverLogged = { completedAt: '2026-10-01T12:00:00Z', sets: [] }

describe('"First time logging this"', () => {
  it('shows with no history and nothing logged yet', () => {
    render(<LastSessionReference history={null} />)
    expect(screen.getByText(/first time logging this/i)).toBeTruthy()
  })

  it('shows for an empty history too', () => {
    render(<LastSessionReference history={neverLogged} />)
    expect(screen.getByText(/first time logging this/i)).toBeTruthy()
  })

  it('hides once a set is logged for this exercise', () => {
    render(<LastSessionReference history={null} hasLoggedSets />)
    expect(screen.queryByText(/first time logging this/i)).toBeNull()
    expect(screen.queryByTestId('last-session-reference-empty')).toBeNull()
  })

  it('a real "Last time" line stays after logging a set', () => {
    const history = {
      completedAt: '2026-10-01T12:00:00Z',
      sets: [{ setNumber: 1, reps: 5, weight: 100, weightUnit: 'lbs', rpe: null, rir: null, isWarmup: false }],
    }
    render(<LastSessionReference history={history as never} hasLoggedSets />)
    expect(screen.getByTestId('last-session-reference')).toBeTruthy()
  })
})
