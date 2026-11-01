/**
 * UI4, from review 072: PaperTabTitle can be a non-heading (the workout
 * dialog keeps one h2), and the Library's Workouts count follows a new server
 * count after router.refresh(). Spec: initiatives/ui-audit/spec.md ("UI4").
 */

import { act, cleanup, render, screen, within } from '@testing-library/react'
import type { ComponentType } from 'react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PaperTabTitle from '@/components/ui/PaperTabTitle'
import { installFetch, load, nav, SAVED, viewProps } from '../features/training-library/library-support'

vi.mock('next/navigation', async () => {
  const { nav } = await import('../features/training-library/library-support')
  return {
    useRouter: () => ({ push: nav.push, refresh: nav.refresh, replace: nav.replace, back: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => nav.pathname,
    useSearchParams: () => new URLSearchParams(nav.search),
  }
})
vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }),
}))
vi.mock('@/components/community/CommunityProgramsView', () => ({ default: () => null }))

afterEach(cleanup)

describe('PaperTabTitle', () => {
  it('is an h2 by default', () => {
    render(<PaperTabTitle tone="mine">Workout</PaperTabTitle>)
    expect(screen.getByRole('heading', { level: 2, name: 'Workout' })).toBeTruthy()
  })

  it('as="span" is not a heading, so the page keeps its own', () => {
    const { container } = render(
      <PaperTabTitle tone="mine" as="span">
        Workout
      </PaperTabTitle>
    )
    expect(screen.queryByRole('heading')).toBeNull()
    expect(container.querySelector('span')?.textContent).toContain('Workout')
  })

  it('asChild makes the child the title and keeps the icon inside it', () => {
    render(
      <PaperTabTitle tone="next" asChild icon={<svg data-testid="icon" />}>
        <h3>Quick actions</h3>
      </PaperTabTitle>
    )
    const title = screen.getByRole('heading', { level: 3, name: 'Quick actions' })
    expect(within(title).getByTestId('icon')).toBeTruthy()
  })
})

describe('Library: the Workouts count follows the server after a refresh', () => {
  type Props = ReturnType<typeof viewProps> & { savedWorkoutCount?: number }
  const chip = () =>
    screen.getByRole('tab', { name: /^workouts$/i }).textContent?.replace(/\s+/g, ' ').trim()

  beforeEach(() => {
    nav.search = '?type=workouts'
    installFetch({ saved: SAVED })
  })

  it('a new savedWorkoutCount replaces the count the list reported', async () => {
    const View = ((await load('@/components/library/LibraryView')) as { default: ComponentType<Props> }).default
    const view = render(createElement(View, { ...viewProps(), savedWorkoutCount: 3 } as Props))
    await screen.findByText('Push day')
    await act(async () => {})
    expect(chip()).toBe('Workouts 1')
    // router.refresh() re-renders the page with a fresh server count.
    view.rerender(createElement(View, { ...viewProps(), savedWorkoutCount: 4 } as Props))
    expect(chip()).toBe('Workouts 4')
  })

  it('the same server count on a re-render keeps the list count', async () => {
    const View = ((await load('@/components/library/LibraryView')) as { default: ComponentType<Props> }).default
    const view = render(createElement(View, { ...viewProps(), savedWorkoutCount: 3 } as Props))
    await screen.findByText('Push day')
    await act(async () => {})
    view.rerender(createElement(View, { ...viewProps(), savedWorkoutCount: 3 } as Props))
    expect(chip()).toBe('Workouts 1')
  })
})
