/**
 * On mobile the (app) layout scrolls its content in an inner container, not
 * the window, so the document never scrolls under the iOS status bar (iOS 27
 * blurs the root scroller's top edge). On desktop (`md:` and up) the window
 * scrolls as before. These helpers pick whichever one is scrolling.
 */

export const APP_SCROLL_ID = 'app-scroll'

/** The inner scroll container when it is the one scrolling, else null (the window scrolls). */
export function getAppScrollRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const el = document.getElementById(APP_SCROLL_ID)
  if (!el) return null
  const { overflowY } = getComputedStyle(el)
  return overflowY === 'auto' || overflowY === 'scroll' ? el : null
}

export function scrollAppToTop(behavior: ScrollBehavior = 'auto'): void {
  const root = getAppScrollRoot()
  if (root) root.scrollTo({ top: 0, behavior })
  else window.scrollTo({ top: 0, behavior })
}

let lockCount = 0
let restore: (() => void) | null = null

/**
 * Stop the page behind a modal from scrolling. Locks the body (desktop) and
 * the inner container (mobile). Locks nest: the page unlocks when the last
 * one is released. Returns the unlock function.
 */
export function lockAppScroll(): () => void {
  if (lockCount === 0) {
    // By id, not getAppScrollRoot(): the container may already be hidden
    const root = document.getElementById(APP_SCROLL_ID)
    const previousBody = document.body.style.overflow
    const previousRoot = root?.style.overflowY ?? ''
    document.body.style.overflow = 'hidden'
    if (root) root.style.overflowY = 'hidden'
    restore = () => {
      document.body.style.overflow = previousBody
      if (root) root.style.overflowY = previousRoot
    }
  }
  lockCount++
  let released = false
  return () => {
    if (released) return
    released = true
    lockCount--
    if (lockCount === 0) {
      restore?.()
      restore = null
    }
  }
}
