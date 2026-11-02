/**
 * UI4 fixes from review 074: Browse shows the type chip only when the listed
 * programs differ in type, the Level menu closes once a level is chosen, the
 * author is back in the meta line, a day says "1 exercise", and PaperTabTitle
 * has a quiet tone with a count chip. Spec: initiatives/ui-audit/spec.md ("UI4").
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CommunityProgramsView from '@/components/community/CommunityProgramsView'
import PaperTabTitle from '@/components/ui/PaperTabTitle'
import WorkoutCard from '@/components/workout/WorkoutCard'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/library',
  useSearchParams: () => new URLSearchParams('?type=programs&tab=browse'),
}))
vi.mock('@/components/features/ProgramRequestModal', () => ({ default: () => null }))

type Program = Parameters<typeof CommunityProgramsView>[0]['communityPrograms'][number]

const program = (over: Partial<Program> & { id: string; name: string }): Program => ({
  description: 'A program.',
  programType: 'strength',
  authorUserId: 'someone',
  displayName: 'Ripit Fitness',
  publishedAt: new Date('2026-10-01T12:00:00Z'),
  weekCount: 5,
  workoutCount: 10,
  exerciseCount: 30,
  goals: [],
  level: 'beginner',
  durationDisplay: null,
  targetDaysPerWeek: 3,
  equipmentNeeded: ['machines'],
  focusAreas: [],
  ...over,
})

const browse = (programs: Program[]) =>
  render(<CommunityProgramsView communityPrograms={programs} currentUserId="me" hasAccess maxPrograms={3} />)

const row = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('li') as HTMLElement

afterEach(cleanup)

describe('Browse: the type chip says something or is hidden', () => {
  it('is hidden when every listed program is strength', () => {
    browse([program({ id: 'a', name: 'Machine Starter' }), program({ id: 'b', name: 'Home Training' })])
    expect(within(row('Machine Starter')).queryByText(/^strength$/i)).toBeNull()
    expect(within(row('Home Training')).queryByText(/^strength$/i)).toBeNull()
  })

  it('shows on every row when the types differ', () => {
    browse([
      program({ id: 'a', name: 'Machine Starter' }),
      program({ id: 'b', name: 'Easy Miles', programType: 'cardio' }),
    ])
    expect(within(row('Machine Starter')).getByText(/^strength$/i)).toBeTruthy()
    expect(within(row('Easy Miles')).getByText(/^cardio$/i)).toBeTruthy()
  })

  it('follows the filtered list: one type left after filtering hides it', () => {
    browse([
      program({ id: 'a', name: 'Machine Starter', level: 'beginner' }),
      program({ id: 'b', name: 'Easy Miles', programType: 'cardio', level: 'intermediate' }),
    ])
    fireEvent.click(screen.getByRole('button', { name: /^level/i }))
    fireEvent.click(screen.getByRole('button', { name: /^beginner$/i }))
    expect(within(row('Machine Starter')).queryByText(/^strength$/i)).toBeNull()
  })
})

describe('Browse: the meta line', () => {
  it('starts with the author', () => {
    browse([program({ id: 'a', name: 'Machine Starter' })])
    const meta = within(row('Machine Starter')).getByText(/^by Ripit Fitness$/)
    expect(meta.closest('p')?.textContent).toBe('by Ripit Fitness · Beginner · machines · 5 wk · 3×/wk')
  })

  it('keeps each item whole when the line wraps', () => {
    browse([program({ id: 'a', name: 'Machine Starter' })])
    const item = within(row('Machine Starter')).getByText('3×/wk')
    expect(item.className).toContain('whitespace-nowrap')
  })
})

describe('Browse: the Level menu', () => {
  it('closes once a level is chosen', () => {
    browse([program({ id: 'a', name: 'Machine Starter' })])
    fireEvent.click(screen.getByRole('button', { name: /^level/i }))
    expect(screen.getByRole('button', { name: /^all levels$/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^intermediate$/i }))
    expect(screen.queryByRole('button', { name: /^all levels$/i })).toBeNull()
    expect(screen.getByRole('button', { name: /^level: intermediate/i })).toBeTruthy()
  })

  it('closes after choosing All Levels too', () => {
    browse([program({ id: 'a', name: 'Machine Starter' })])
    fireEvent.click(screen.getByRole('button', { name: /^level/i }))
    fireEvent.click(screen.getByRole('button', { name: /^all levels$/i }))
    expect(screen.queryByRole('button', { name: /^all levels$/i })).toBeNull()
  })

  it('the filtered-empty state offers Clear filters and Suggest a program as buttons', () => {
    browse([program({ id: 'a', name: 'Machine Starter' })])
    fireEvent.click(screen.getByRole('button', { name: /^level/i }))
    fireEvent.click(screen.getByRole('button', { name: /^advanced$/i }))
    expect(screen.getByRole('button', { name: /^clear filters$/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^suggest a program$/i })).toBeTruthy()
  })
})

describe('Program detail: day rows', () => {
  const day = (exercises: number) => (
    <WorkoutCard
      workout={{ id: 'w1', dayNumber: 1, name: 'Upper', completions: [], _count: { exercises } }}
      expanded={false}
      isSkipping={false}
      isLoading={false}
      isUnskipping={false}
      onToggle={vi.fn()}
      onSkip={vi.fn()}
      onUnskip={vi.fn()}
      onLog={vi.fn()}
    />
  )

  it('says "1 exercise" for one', () => {
    render(day(1))
    expect(screen.getByText('1 exercise')).toBeTruthy()
  })

  it('says "2 exercises" for two', () => {
    render(day(2))
    expect(screen.getByText('2 exercises')).toBeTruthy()
  })
})

describe('PaperTabTitle: quiet tone with a count', () => {
  it('renders the title and a count chip named by countLabel', () => {
    render(
      <PaperTabTitle tone="quiet" count={6} countLabel="6 sessions" asChild>
        <h2>Recent history</h2>
      </PaperTabTitle>
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Recent history' })).toBeTruthy()
    expect(screen.getByRole('img', { name: '6 sessions' }).textContent).toBe('6')
  })
})
