/**
 * UI1b: on mobile the (app) layout scrolls its content in an inner container
 * (#app-scroll), not the window, so iOS doesn't blur content sliding under the
 * status bar. Next.js only resets the window on navigation, so the container
 * resets itself; helpers send scroll calls to whichever element is scrolling.
 */

import { cleanup, render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppScrollContainer from '@/components/AppScrollContainer'
import { APP_SCROLL_ID, getAppScrollRoot, lockAppScroll, scrollAppToTop } from '@/lib/nav/app-scroll'

const h = vi.hoisted(() => ({ pathname: '/training' }))
vi.mock('next/navigation', () => ({
  usePathname: () => h.pathname,
}))

function renderShell() {
  return render(createElement(AppScrollContainer, null, createElement('p', null, 'page')))
}

function container() {
  const el = document.getElementById(APP_SCROLL_ID)
  if (!el) throw new Error('no #app-scroll')
  return el
}

beforeEach(() => {
  h.pathname = '/training'
})

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

describe('AppScrollContainer', () => {
  it('renders the children inside #app-scroll', () => {
    const { getByText } = renderShell()
    expect(container().contains(getByText('page'))).toBe(true)
  })

  it('resets to the top when the path changes', () => {
    const view = renderShell()
    container().scrollTop = 400
    h.pathname = '/library'
    view.rerender(createElement(AppScrollContainer, null, createElement('p', null, 'page')))
    expect(container().scrollTop).toBe(0)
  })

  it('keeps its position when the path stays the same', () => {
    const view = renderShell()
    container().scrollTop = 400
    view.rerender(createElement(AppScrollContainer, null, createElement('p', null, 'other')))
    expect(container().scrollTop).toBe(400)
  })
})

describe('app scroll helpers', () => {
  it('use the inner container when it scrolls (mobile)', () => {
    renderShell()
    container().style.overflowY = 'auto'
    expect(getAppScrollRoot()).toBe(container())

    const inner = vi.fn()
    container().scrollTo = inner
    const win = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    scrollAppToTop('smooth')
    expect(inner).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(win).not.toHaveBeenCalled()
  })

  it('fall back to the window when the container does not scroll (desktop)', () => {
    renderShell()
    container().style.overflowY = 'visible'
    expect(getAppScrollRoot()).toBeNull()

    const win = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    scrollAppToTop()
    expect(win).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  it('lockAppScroll locks the body and the inner container, and unlock restores both', () => {
    renderShell()
    container().style.overflowY = 'auto'
    document.body.style.overflow = 'scroll'

    const unlock = lockAppScroll()
    expect(document.body.style.overflow).toBe('hidden')
    expect(container().style.overflowY).toBe('hidden')

    unlock()
    expect(document.body.style.overflow).toBe('scroll')
    expect(container().style.overflowY).toBe('auto')
  })

  it('overlapping locks keep the page locked until the last one releases', () => {
    renderShell()
    container().style.overflowY = 'auto'
    document.body.style.overflow = 'scroll'

    const unlockFirst = lockAppScroll()
    const unlockSecond = lockAppScroll()

    unlockFirst()
    expect(document.body.style.overflow).toBe('hidden')
    expect(container().style.overflowY).toBe('hidden')

    unlockFirst() // releasing the same lock twice doesn't count twice
    expect(container().style.overflowY).toBe('hidden')

    unlockSecond()
    expect(document.body.style.overflow).toBe('scroll')
    expect(container().style.overflowY).toBe('auto')
  })
})
