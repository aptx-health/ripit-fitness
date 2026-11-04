/**
 * Per-lift page: the route page (work item 125). Spec: features/analytics/lift-page.feature,
 * "Tap a lift row". The view is lift-page-view.test.tsx.
 *
 * Pinned: app/(app)/progress/lift/[id]/page.tsx, default export `async function Page({ params })`
 * with `params: Promise<{ id: string }>` (Next 15), returns the client view
 * `@/components/features/progress/LiftView` with `exerciseDefinitionId` = the id from the URL. The
 * (app) layout signs the user in; the page reads nothing itself.
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/features/progress/LiftView', () => ({
  default: ({ exerciseDefinitionId }: { exerciseDefinitionId: string }) => <div data-testid="lift-view" data-id={exerciseDefinitionId} />,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/progress/lift/x',
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
  redirect: vi.fn(),
}))

afterEach(cleanup)

const load = (spec: string) => import(/* @vite-ignore */ spec)
type PageFn = (props: { params: Promise<{ id: string }> }) => Promise<React.ReactElement> | React.ReactElement

describe('the lift page', () => {
  it('renders the lift view for the id in the URL', async () => {
    const Page = ((await load('@/app/(app)/progress/lift/[id]/page')) as { default: PageFn }).default
    render(await Page({ params: Promise.resolve({ id: 'd-squat' }) }))
    expect(screen.getByTestId('lift-view').getAttribute('data-id')).toBe('d-squat')
  })

  it('passes another id through untouched', async () => {
    const Page = ((await load('@/app/(app)/progress/lift/[id]/page')) as { default: PageFn }).default
    render(await Page({ params: Promise.resolve({ id: 'cm9abc-123' }) }))
    expect(screen.getByTestId('lift-view').getAttribute('data-id')).toBe('cm9abc-123')
  })
})
