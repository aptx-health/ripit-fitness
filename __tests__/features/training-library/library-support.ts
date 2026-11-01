/**
 * Shared fixtures for the TL3 Library tests (library.steps.ts and
 * the plain describes in library.steps.ts). Not a test file itself.
 *
 * Seams the tests build to (all new unless marked existing):
 *
 *   lib/library/links.ts   (pure)
 *     libraryHref({ type?, tab?, cloning? }?) -> '/library[?type=..&tab=..&cloning=..]'
 *     parseLibraryType(raw) -> 'workouts' | 'programs'   (anything else: 'programs')
 *     legacyProgramsRedirectTarget(query)      /programs        -> /library?type=programs + rest of query
 *     legacySavedWorkoutsRedirectTarget(query) /workouts/saved  -> /library?type=workouts + rest of query
 *     legacyCommunityRedirectTarget()          /community       -> /library?type=programs&tab=browse
 *     In the redirects `type` is always the fixed one, whatever the incoming query says.
 *
 *   components/library/LibraryView.tsx   default export, a client component.
 *     Props (the data the old Programs page view took; that view is replaced):
 *       strengthPrograms, communityPrograms, currentUserId, activeWeekInfo
 *       ({weekNumber,totalWeeks} | null, for the active program), programCount,
 *       isAdmin, customProgramLimitBypass.
 *     It reads ?type, ?tab and ?cloning with useSearchParams() and follows them
 *     while mounted: when the params change, the shown view changes with them.
 *     Roles and text:
 *       h1 "LIBRARY"; tablist with tabs "Workouts" and "Programs" (aria-selected);
 *       with Programs: tabs "My Programs" and "Browse"; with Workouts: no second
 *       tablist, heading "MY WORKOUTS" over SavedWorkoutsList (unchanged).
 *     My Programs: no active-program strip and no "No active program" note.
 *       The active program is first, with "ACTIVE" and "Week X of Y" in its row;
 *       the rest follow newest first. The row opens (click) to actions, which
 *       now include a "VIEW" link to /library/programs/<id>.
 *       "CREATE NEW PROGRAM" (link to /programs/new) only on Programs -> My Programs.
 *
 *   components/programs/ProgramBackLink.tsx   default export, no props: the
 *     detail page's back link, text "Library", href /library?type=programs.
 *
 *   lib/nav/active-tab.ts, components/BottomNav.tsx, components/Header.tsx   (existing)
 *     Library replaces Programs: see __tests__/components/nav-active-tab.test.tsx.
 *
 *   Existing components whose links change:
 *     CommunityProgramCard add -> router.push(/library?type=programs&cloning=<id>)
 *     ProgramCompletionModal "Choose New Program" -> router.push(/library, type=programs)
 *     StrengthActivationModal without onSkip -> push(/library?type=programs)
 *     Training home "Find a program" -> /library?type=programs&tab=browse
 */

import { vi } from 'vitest'

export const load = (spec: string) => import(/* @vite-ignore */ spec)

export const nav = {
  search: '',
  pathname: '/library',
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}

export type Program = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  isUserCreated: boolean
  createdAt: Date
  copyStatus: string | null
  targetDaysPerWeek: number | null
  _count: { weeks: number }
}

export const MS: Program = {
  id: 'p-ms',
  name: 'Machine Starter',
  description: null,
  isActive: true,
  isUserCreated: false,
  createdAt: new Date('2026-09-01T12:00:00Z'),
  copyStatus: 'ready',
  targetDaysPerWeek: 3,
  _count: { weeks: 5 },
}
export const OS: Program = {
  id: 'p-os',
  name: 'Old Split',
  description: null,
  isActive: false,
  isUserCreated: true,
  createdAt: new Date('2026-10-01T12:00:00Z'),
  copyStatus: 'ready',
  targetDaysPerWeek: 4,
  _count: { weeks: 3 },
}
export const program = (over: Partial<Program> & { id: string; name: string }): Program => ({
  ...OS,
  isActive: false,
  ...over,
})

export const WEEK_INFO = { weekNumber: 2, totalWeeks: 5 }

export function viewProps(over: Record<string, unknown> = {}) {
  return {
    strengthPrograms: [MS, OS],
    communityPrograms: [],
    currentUserId: 'u1',
    activeWeekInfo: WEEK_INFO,
    programCount: 2,
    isAdmin: false,
    customProgramLimitBypass: false,
    ...over,
  }
}

export const SAVED = [
  {
    id: 'sw1',
    name: 'Push day',
    notes: null,
    exerciseCount: 5,
    lastUsedAt: null,
    createdAt: '2026-10-01T12:00:00Z',
  },
]

export type Call = { url: string; method: string }

/** Stubs fetch for the Library: saved workouts, copy status, community add. */
export function installFetch(opts: { saved?: unknown[]; copy?: unknown; addedProgramId?: string } = {}) {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: { method?: string }) => {
      const url = String(input)
      calls.push({ url, method: init?.method ?? 'GET' })
      const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })
      if (url.startsWith('/api/workouts/saved')) return ok({ saved: opts.saved ?? [] })
      if (url.includes('/copy-status')) return ok(opts.copy ?? { status: 'ready' })
      if (url.includes('/api/community/') && url.endsWith('/add')) return ok({ programId: opts.addedProgramId ?? 'new1' })
      if (url.includes('/completion-stats'))
        return ok({
          data: {
            programName: 'Old Split',
            startDate: '2026-01-01',
            endDate: '2026-02-01',
            totalDays: 30,
            totalWorkouts: 12,
            completedWorkouts: 12,
            skippedWorkouts: 0,
          },
        })
      return ok({})
    })
  )
  return calls
}

export function parse(target: string) {
  const url = new URL(target, 'http://localhost')
  const params: Record<string, string[]> = {}
  for (const [k, v] of url.searchParams) {
    params[k] = [...(params[k] ?? []), v]
  }
  return { path: url.pathname, params }
}
