/**
 * UI1: "Training's tabbed blocks behave as before". TabbedBlock is about to be
 * rebuilt on PaperTabs; this file pins what must not change, through the real
 * component (no stubs), so it is green before and after the refactor.
 * The full Training home is covered by training-home-tabs.test.tsx, which must
 * keep passing unchanged.
 *
 * Seam (unchanged): components/training/TabbedBlock.tsx, default export, props
 * { name, idPrefix, storageKey, tone, tabs, defaultTab }; the choice is stored
 * as the raw tab id under storageKey.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)

const KEY = 'test.workouts.tab'
const tabs = (over: Partial<Record<string, boolean>> = {}) => [
  { id: 'pinned', label: 'Pinned Workouts', icon: null, count: 2, countLabel: '2 pinned workouts', hasContent: over.pinned ?? true, panel: createElement('p', null, 'Pinned panel') },
  { id: 'recent', label: 'Recent', icon: null, hasContent: over.recent ?? true, panel: createElement('p', null, 'Recent panel') },
]

async function block(over: Partial<Record<string, boolean>> = {}, defaultTab = 'pinned') {
  const TabbedBlock = (await load('@/components/training/TabbedBlock')).default
  return createElement(TabbedBlock, { name: 'Workouts', idPrefix: 'wk', storageKey: KEY, tone: 'mine', tabs: tabs(over), defaultTab })
}

const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(`^${name}`) })
const stored = () => window.localStorage.getItem(KEY)
/** Panels stay in the page; only the unselected ones are hidden (not accessible). */
const shown = () => screen.getAllByRole('tabpanel').map((p) => p.textContent)

beforeEach(() => window.localStorage.clear())
afterEach(cleanup)

describe('Training tabbed blocks behave as before', () => {
  it('shows the default tab and hides the other panel', async () => {
    render(await block())
    expect(tab('Pinned Workouts').getAttribute('aria-selected')).toBe('true')
    expect(shown()).toEqual(['Pinned panel'])
    expect(screen.getByRole('region', { name: 'Workouts' })).toBeTruthy()
  })

  it('choosing Recent shows the Recent panel and hides the other', async () => {
    render(await block())
    fireEvent.click(tab('Recent'))
    expect(tab('Recent').getAttribute('aria-selected')).toBe('true')
    expect(tab('Pinned Workouts').getAttribute('aria-selected')).toBe('false')
    expect(shown()).toEqual(['Recent panel'])
  })

  it('remembers the choice on this device', async () => {
    render(await block())
    fireEvent.click(tab('Recent'))
    expect(stored()).toBe('recent')
  })

  it('opens on the remembered tab after a remount', async () => {
    const first = render(await block())
    fireEvent.click(tab('Recent'))
    first.unmount()
    render(await block())
    expect(tab('Recent').getAttribute('aria-selected')).toBe('true')
    expect(shown()).toEqual(['Recent panel'])
  })

  it('ignores a remembered tab that is empty while the other has content', async () => {
    window.localStorage.setItem(KEY, 'recent')
    render(await block({ recent: false }))
    expect(tab('Pinned Workouts').getAttribute('aria-selected')).toBe('true')
  })

  it('uses a remembered empty tab when no other tab has content', async () => {
    window.localStorage.setItem(KEY, 'recent')
    render(await block({ recent: false, pinned: false }))
    expect(tab('Recent').getAttribute('aria-selected')).toBe('true')
  })

  it('ignores a remembered id that is not a tab', async () => {
    window.localStorage.setItem(KEY, 'gone')
    render(await block())
    expect(tab('Pinned Workouts').getAttribute('aria-selected')).toBe('true')
  })

  it('arrow keys switch tabs, focus the new one and remember it', async () => {
    render(await block())
    tab('Pinned Workouts').focus()
    fireEvent.keyDown(tab('Pinned Workouts'), { key: 'ArrowRight' })
    expect(tab('Recent').getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(tab('Recent'))
    expect(stored()).toBe('recent')
    fireEvent.keyDown(tab('Recent'), { key: 'Home' })
    expect(tab('Pinned Workouts').getAttribute('aria-selected')).toBe('true')
    expect(stored()).toBe('pinned')
  })

  it('only the selected tab is in the tab order', async () => {
    render(await block())
    expect(tab('Pinned Workouts').tabIndex).toBe(0)
    expect(tab('Recent').tabIndex).toBe(-1)
  })

  it('keeps the panel wiring: tab controls the panel, the panel is labelled by the tab', async () => {
    render(await block())
    const panel = screen.getByRole('tabpanel')
    expect(tab('Pinned Workouts').getAttribute('aria-controls')).toBe(panel.id)
    expect(panel.getAttribute('aria-labelledby')).toBe(tab('Pinned Workouts').id)
  })

  it('keeps both panels in the page, the unselected one hidden', async () => {
    const { container } = render(await block())
    const panels = container.querySelectorAll('[role="tabpanel"]')
    expect(panels).toHaveLength(2)
    expect((panels[0] as HTMLElement).hidden).toBe(false)
    expect((panels[1] as HTMLElement).hidden).toBe(true)
  })

  it('shows the count chip with its label', async () => {
    render(await block())
    expect(screen.getByRole('img', { name: '2 pinned workouts' }).textContent).toBe('2')
  })

  it('still works when localStorage throws', async () => {
    const get = Storage.prototype.getItem
    const set = Storage.prototype.setItem
    Storage.prototype.getItem = () => {
      throw new Error('blocked')
    }
    Storage.prototype.setItem = () => {
      throw new Error('blocked')
    }
    try {
      render(await block())
      fireEvent.click(tab('Recent'))
      expect(tab('Recent').getAttribute('aria-selected')).toBe('true')
    } finally {
      Storage.prototype.getItem = get
      Storage.prototype.setItem = set
    }
  })
})
