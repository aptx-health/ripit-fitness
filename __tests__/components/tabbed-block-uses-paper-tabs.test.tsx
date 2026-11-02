/**
 * UI1: TabbedBlock is built on the shared PaperTabs (spec item 1: "TabbedBlock
 * uses it, keeping its localStorage memory"). PaperTabs is stubbed here so the
 * test sees exactly what TabbedBlock hands it and what it does when told a tab
 * was chosen. The PaperTabs props are pinned in paper-tabs.test.tsx.
 *
 * TabbedBlock must pass: name (the region name), idPrefix, tone, value (the
 * selected id) and onChange. It keeps the panels, the remembered choice and the
 * region; PaperTabs owns the tablist and its keyboard handling.
 */

import { act, cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Captured = {
  name: string
  idPrefix: string
  tone: string
  value: string
  onChange: (id: string) => void
  tabs: Array<{ id: string; label: string; count?: number; countLabel?: string }>
}
const seen: Captured[] = vi.hoisted(() => [])
const last = () => seen[seen.length - 1]
/** Panels stay in the page; only the unselected ones are hidden (not accessible). */
const shown = () => screen.getAllByRole('tabpanel').map((p) => p.textContent)

vi.mock('@/components/ui/PaperTabs', () => ({
  default: (props: Captured) => {
    seen.push(props)
    return createElement('div', { 'data-testid': 'paper-tabs-stub' })
  },
}))

const load = (spec: string) => import(/* @vite-ignore */ spec)
const KEY = 'test.uses.tab'

async function block(defaultTab = 'pinned', hasContent = { pinned: true, recent: true }) {
  const TabbedBlock = (await load('@/components/training/TabbedBlock')).default
  return createElement(TabbedBlock, {
    name: 'Workouts',
    idPrefix: 'wk',
    storageKey: KEY,
    tone: 'next',
    defaultTab,
    tabs: [
      { id: 'pinned', label: 'Pinned Workouts', icon: null, count: 2, countLabel: '2 pinned workouts', hasContent: hasContent.pinned, panel: createElement('p', null, 'Pinned panel') },
      { id: 'recent', label: 'Recent', icon: null, hasContent: hasContent.recent, panel: createElement('p', null, 'Recent panel') },
    ],
  })
}

beforeEach(() => {
  seen.length = 0
  window.localStorage.clear()
})
afterEach(cleanup)

describe('TabbedBlock uses PaperTabs', () => {
  it('renders PaperTabs inside the named region', async () => {
    render(await block())
    expect(screen.getByRole('region', { name: 'Workouts' })).toBeTruthy()
    expect(screen.getByTestId('paper-tabs-stub')).toBeTruthy()
  })

  it('hands it the name, idPrefix, tone and the default tab as value', async () => {
    render(await block())
    expect(last()).toMatchObject({ name: 'Workouts', idPrefix: 'wk', tone: 'next', value: 'pinned' })
  })

  it('hands it each tab with id, label, count and countLabel', async () => {
    render(await block())
    expect(last().tabs).toHaveLength(2)
    expect(last().tabs[0]).toMatchObject({ id: 'pinned', label: 'Pinned Workouts', count: 2, countLabel: '2 pinned workouts' })
    expect(last().tabs[1]).toMatchObject({ id: 'recent', label: 'Recent' })
    expect(last().tabs[1].count).toBeUndefined()
  })

  it('has no tablist of its own', async () => {
    render(await block())
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it('shows the panel for the id PaperTabs reports, hides the other, and passes the new value back', async () => {
    render(await block())
    act(() => last().onChange('recent'))
    expect(last().value).toBe('recent')
    expect(shown()).toEqual(['Recent panel'])
    act(() => last().onChange('pinned'))
    expect(last().value).toBe('pinned')
    expect(shown()).toEqual(['Pinned panel'])
  })

  it('remembers the chosen id in localStorage under storageKey', async () => {
    render(await block())
    act(() => last().onChange('recent'))
    expect(window.localStorage.getItem(KEY)).toBe('recent')
  })

  it('renders both panels with ids matching the idPrefix wiring PaperTabs uses', async () => {
    const { container } = render(await block())
    const panels = container.querySelectorAll('[role="tabpanel"]')
    expect([...panels].map((p) => p.id)).toEqual(['wk-panel-pinned', 'wk-panel-recent'])
    expect([...panels].map((p) => p.getAttribute('aria-labelledby'))).toEqual(['wk-tab-pinned', 'wk-tab-recent'])
    expect([...panels].map((p) => (p as HTMLElement).hidden)).toEqual([false, true])
  })

  it('starts on a remembered tab that has content', async () => {
    window.localStorage.setItem(KEY, 'recent')
    render(await block())
    expect(last().value).toBe('recent')
  })

  it('keeps the default when the remembered tab is empty and another has content', async () => {
    window.localStorage.setItem(KEY, 'recent')
    render(await block('pinned', { pinned: true, recent: false }))
    expect(last().value).toBe('pinned')
  })
})
