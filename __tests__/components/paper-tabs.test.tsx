/**
 * UI1 shared folder pieces: PaperTabs, the paper-tab strip pulled out of
 * TabbedBlock so any page can use it. Behaviour only (roles, names, focus,
 * callbacks); colours and layout are the reviewer's job.
 * Spec: initiatives/ui-audit/spec.md ("UI1"); features/ui-audit/shared-folder-pieces.feature.
 *
 * Interface the implementer must match (pinned here):
 *
 *   components/ui/PaperTabs.tsx, default export
 *   props {
 *     name: string                    accessible name of the tablist (aria-label)
 *     idPrefix: string                tab id = `${idPrefix}-tab-${id}`;
 *                                     aria-controls = `${idPrefix}-panel-${id}`
 *                                     (the page renders the panels with those ids)
 *     tone: 'mine' | 'next'           ('coach' optional, not tested)
 *     tabs: Array<{ id: string; label: string; icon?: ReactNode;
 *                   count?: number; countLabel?: string }>
 *     value: string                   the selected tab id, owned by the page
 *     onChange: (id: string) => void  called on click and on keyboard moves
 *     linkTab?: { href: string; label: string; ariaLabel?: string }
 *   }
 *
 * Rules: a <button role="tab" type="button"> per tab inside a role="tablist";
 * the selected tab has aria-selected="true" and tabIndex 0, the others -1.
 * Controlled: clicking or arrowing calls onChange and does NOT change the
 * selection by itself; the selection follows `value`. Keys: ArrowRight/Down
 * next, ArrowLeft/Up previous, Home first, End last, wrapping; a key move
 * calls onChange(newId) and focuses the new tab. The link tab is a link
 * (role="link" to href), never a tab, and not part of the arrow-key order.
 * A count chip is role="img" with aria-label = countLabel.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)

type Props = Record<string, unknown>
const TABS = [
  { id: 'workouts', label: 'Workouts' },
  { id: 'programs', label: 'Programs' },
]
const THREE = [...TABS, { id: 'plans', label: 'Plans' }]

const PaperTabs = async () => (await load('@/components/ui/PaperTabs')).default as (p: Props) => unknown

/** The page owns the value, as Library will with ?tab=. */
function Page({ Tabs, tabs, initial, onChange }: { Tabs: (p: Props) => unknown; tabs: typeof TABS; initial: string; onChange?: (id: string) => void }) {
  const [value, setValue] = useState(initial)
  return createElement(Tabs as never, {
    name: 'Library',
    idPrefix: 'lib',
    tone: 'mine',
    tabs,
    value,
    onChange: (id: string) => {
      onChange?.(id)
      setValue(id)
    },
  } as never)
}

async function renderPage(onChange?: (id: string) => void, tabs = TABS, initial = 'workouts') {
  const Tabs = await PaperTabs()
  return render(createElement(Page, { Tabs, tabs, initial, onChange }))
}

async function renderControlled(value: string, onChange: (id: string) => void, extra: Props = {}, tabs = TABS) {
  const Tabs = await PaperTabs()
  const ui = (v: string) => createElement(Tabs as never, { name: 'Library', idPrefix: 'lib', tone: 'mine', tabs, value: v, onChange, ...extra } as never)
  const view = render(ui(value))
  return { ...view, setValue: (v: string) => view.rerender(ui(v)) }
}

const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(`^${name}`) })

afterEach(cleanup)

describe('Paper tabs are controlled by the page', () => {
  it('renders a tablist named by `name` with one tab per entry', async () => {
    await renderControlled('workouts', vi.fn())
    const list = screen.getByRole('tablist', { name: 'Library' })
    expect(within(list).getAllByRole('tab').map((t) => t.textContent?.trim())).toEqual(['Workouts', 'Programs'])
  })

  it('marks the tab matching `value` as selected', async () => {
    await renderControlled('programs', vi.fn())
    expect(tab('Programs').getAttribute('aria-selected')).toBe('true')
    expect(tab('Workouts').getAttribute('aria-selected')).toBe('false')
  })

  it('tells the page which tab was clicked', async () => {
    const onChange = vi.fn()
    await renderControlled('workouts', onChange)
    fireEvent.click(tab('Programs'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('programs')
  })

  it('keeps the old tab selected until the page changes its value', async () => {
    const onChange = vi.fn()
    const { setValue } = await renderControlled('workouts', onChange)
    fireEvent.click(tab('Programs'))
    expect(tab('Workouts').getAttribute('aria-selected')).toBe('true')
    expect(tab('Programs').getAttribute('aria-selected')).toBe('false')
    setValue('programs')
    expect(tab('Programs').getAttribute('aria-selected')).toBe('true')
    expect(tab('Workouts').getAttribute('aria-selected')).toBe('false')
  })

  it('follows a value the page changes on its own (no click)', async () => {
    const { setValue } = await renderControlled('workouts', vi.fn())
    setValue('programs')
    expect(tab('Programs').getAttribute('aria-selected')).toBe('true')
    setValue('workouts')
    expect(tab('Workouts').getAttribute('aria-selected')).toBe('true')
  })

  it('clicking the already selected tab still reports it', async () => {
    const onChange = vi.fn()
    await renderControlled('workouts', onChange)
    fireEvent.click(tab('Workouts'))
    expect(onChange).toHaveBeenCalledWith('workouts')
  })

  it('does not write to localStorage (the memory belongs to TabbedBlock)', async () => {
    const set = vi.spyOn(Storage.prototype, 'setItem')
    await renderControlled('workouts', vi.fn())
    fireEvent.click(tab('Programs'))
    expect(set).not.toHaveBeenCalled()
    set.mockRestore()
  })
})

describe('Paper tabs: wiring ids', () => {
  it('gives each tab an id and an aria-controls built from idPrefix', async () => {
    await renderControlled('workouts', vi.fn())
    expect(tab('Workouts').id).toBe('lib-tab-workouts')
    expect(tab('Workouts').getAttribute('aria-controls')).toBe('lib-panel-workouts')
    expect(tab('Programs').id).toBe('lib-tab-programs')
    expect(tab('Programs').getAttribute('aria-controls')).toBe('lib-panel-programs')
  })

  it('renders plain buttons that never submit a form', async () => {
    await renderControlled('workouts', vi.fn())
    for (const t of screen.getAllByRole('tab')) {
      expect(t.tagName).toBe('BUTTON')
      expect(t.getAttribute('type')).toBe('button')
    }
  })
})

describe('Paper tabs work from the keyboard', () => {
  it('Right Arrow on the selected tab chooses and focuses the next', async () => {
    const onChange = vi.fn()
    await renderPage(onChange)
    tab('Workouts').focus()
    fireEvent.keyDown(tab('Workouts'), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('programs')
    expect(document.activeElement).toBe(tab('Programs'))
    expect(tab('Programs').getAttribute('aria-selected')).toBe('true')
  })

  it('moves focus even while the page has not changed the value yet', async () => {
    const onChange = vi.fn()
    await renderControlled('workouts', onChange)
    tab('Workouts').focus()
    fireEvent.keyDown(tab('Workouts'), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('programs')
    expect(document.activeElement).toBe(tab('Programs'))
    expect(tab('Workouts').getAttribute('aria-selected')).toBe('true')
  })

  it('only the selected tab is in the tab order', async () => {
    await renderControlled('workouts', vi.fn(), {}, THREE)
    expect(tab('Workouts').tabIndex).toBe(0)
    expect(tab('Programs').tabIndex).toBe(-1)
    expect(tab('Plans').tabIndex).toBe(-1)
  })

  it('the tab order follows the selection', async () => {
    const { setValue } = await renderControlled('workouts', vi.fn(), {}, THREE)
    setValue('plans')
    expect(tab('Plans').tabIndex).toBe(0)
    expect(tab('Workouts').tabIndex).toBe(-1)
    expect(tab('Programs').tabIndex).toBe(-1)
  })

  it.each([
    ['ArrowRight', 'workouts', 'programs'],
    ['ArrowDown', 'workouts', 'programs'],
    ['ArrowLeft', 'programs', 'workouts'],
    ['ArrowUp', 'programs', 'workouts'],
    ['Home', 'plans', 'workouts'],
    ['End', 'workouts', 'plans'],
  ])('%s from %s chooses %s', async (key, from, to) => {
    const onChange = vi.fn()
    await renderControlled(from, onChange, {}, THREE)
    const fromTab = screen.getAllByRole('tab').find((t) => t.id === `lib-tab-${from}`) as HTMLElement
    fromTab.focus()
    fireEvent.keyDown(fromTab, { key })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(to)
    expect(document.activeElement?.id).toBe(`lib-tab-${to}`)
  })

  it('Right Arrow on the last tab wraps to the first', async () => {
    const onChange = vi.fn()
    await renderControlled('programs', onChange)
    tab('Programs').focus()
    fireEvent.keyDown(tab('Programs'), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('workouts')
    expect(document.activeElement).toBe(tab('Workouts'))
  })

  it('Left Arrow on the first tab wraps to the last', async () => {
    const onChange = vi.fn()
    await renderControlled('workouts', onChange)
    tab('Workouts').focus()
    fireEvent.keyDown(tab('Workouts'), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith('programs')
    expect(document.activeElement).toBe(tab('Programs'))
  })

  it('arrows move from the tab that has the key press, not from the selected one', async () => {
    const onChange = vi.fn()
    await renderControlled('workouts', onChange, {}, THREE)
    tab('Plans').focus()
    fireEvent.keyDown(tab('Plans'), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith('programs')
  })

  it('ignores other keys', async () => {
    const onChange = vi.fn()
    await renderControlled('workouts', onChange)
    tab('Workouts').focus()
    for (const key of ['a', 'Enter', 'Tab', 'Escape', 'PageDown']) fireEvent.keyDown(tab('Workouts'), { key })
    expect(onChange).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(tab('Workouts'))
  })

  it('stops the page scrolling on the keys it handles', async () => {
    await renderControlled('workouts', vi.fn())
    const handled = fireEvent.keyDown(tab('Workouts'), { key: 'ArrowRight' })
    expect(handled).toBe(false)
    const ignored = fireEvent.keyDown(tab('Workouts'), { key: 'a' })
    expect(ignored).toBe(true)
  })
})

describe('Paper tabs can end with a link tab', () => {
  const LINK = { href: '/suggestions', label: 'All suggestions' }

  it('shows the link tab as a link to its href', async () => {
    await renderControlled('workouts', vi.fn(), { linkTab: LINK })
    const link = screen.getByRole('link', { name: 'All suggestions' })
    expect(link.getAttribute('href')).toBe('/suggestions')
  })

  it('does not make it a tab', async () => {
    await renderControlled('workouts', vi.fn(), { linkTab: LINK })
    expect(screen.queryByRole('tab', { name: /All suggestions/ })).toBeNull()
    expect(screen.getAllByRole('tab')).toHaveLength(2)
  })

  it('uses ariaLabel as the link name when given', async () => {
    await renderControlled('workouts', vi.fn(), { linkTab: { ...LINK, ariaLabel: 'See all suggestions' } })
    expect(screen.getByRole('link', { name: 'See all suggestions' }).getAttribute('href')).toBe('/suggestions')
  })

  it('Right Arrow on the last real tab wraps to the first, skipping the link', async () => {
    const onChange = vi.fn()
    await renderControlled('programs', onChange, { linkTab: LINK })
    tab('Programs').focus()
    fireEvent.keyDown(tab('Programs'), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('workouts')
    expect(document.activeElement).toBe(tab('Workouts'))
  })

  it('Left Arrow on the first tab goes to the last real tab, not the link', async () => {
    const onChange = vi.fn()
    await renderControlled('workouts', onChange, { linkTab: LINK })
    tab('Workouts').focus()
    fireEvent.keyDown(tab('Workouts'), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith('programs')
  })

  it('End goes to the last real tab, not the link', async () => {
    const onChange = vi.fn()
    await renderControlled('workouts', onChange, { linkTab: LINK })
    tab('Workouts').focus()
    fireEvent.keyDown(tab('Workouts'), { key: 'End' })
    expect(onChange).toHaveBeenCalledWith('programs')
  })

  it('clicking the link does not report a tab change', async () => {
    const onChange = vi.fn()
    await renderControlled('workouts', onChange, { linkTab: LINK })
    fireEvent.click(screen.getByRole('link', { name: 'All suggestions' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows no link when there is no linkTab', async () => {
    await renderControlled('workouts', vi.fn())
    expect(screen.queryByRole('link')).toBeNull()
  })
})

describe('Paper tabs: icons and count chips', () => {
  it('shows a count chip labelled by countLabel next to the label', async () => {
    const tabs = [
      { id: 'workouts', label: 'Pinned Workouts', count: 2, countLabel: '2 pinned workouts' },
      { id: 'programs', label: 'Recent' },
    ]
    await renderControlled('workouts', vi.fn(), {}, tabs as never)
    const chip = screen.getByRole('img', { name: '2 pinned workouts' })
    expect(chip.textContent).toBe('2')
    expect(within(tab('Pinned Workouts')).getByRole('img', { name: '2 pinned workouts' })).toBe(chip)
    expect(screen.getAllByRole('img')).toHaveLength(1)
  })

  it('shows a zero count (0 is a count, not "no chip")', async () => {
    const tabs = [{ id: 'a', label: 'A', count: 0, countLabel: 'no items' }, { id: 'b', label: 'B' }]
    await renderControlled('a', vi.fn(), {}, tabs as never)
    expect(screen.getByRole('img', { name: 'no items' }).textContent).toBe('0')
  })

  it('renders each tab icon inside its tab', async () => {
    const tabs = [
      { id: 'a', label: 'A', icon: createElement('svg', { 'data-testid': 'icon-a' }) },
      { id: 'b', label: 'B', icon: createElement('svg', { 'data-testid': 'icon-b' }) },
    ]
    await renderControlled('a', vi.fn(), {}, tabs as never)
    expect(within(tab('A')).getByTestId('icon-a')).toBeTruthy()
    expect(within(tab('B')).getByTestId('icon-b')).toBeTruthy()
  })

  it('the tab name keeps the label apart from the count chip label', async () => {
    const tabs = [{ id: 'a', label: 'Pinned Workouts', count: 2, countLabel: '2 pinned workouts' }, { id: 'b', label: 'Recent' }]
    await renderControlled('a', vi.fn(), {}, tabs as never)
    expect(screen.getByRole('tab', { name: /^Pinned Workouts\b/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Pinned Workouts 2 pinned workouts' })).toBeTruthy()
  })
})
