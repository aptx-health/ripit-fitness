'use client'

import { useEffect, useRef } from 'react'
import type { TouchStyle } from '@/lib/admin/quick-panel-prefs'

/**
 * Draws a ring wherever the screen is tapped, for recording tutorials. The
 * layer never takes pointer events, and the listeners are passive and in the
 * capture phase on window, so taps reach the page exactly as before.
 */

// Above everything else in the app (the highest in use is 9999) and the panel.
export const TOUCH_LAYER_Z = 10010
export const RING_FADE_MS = 400
export const TRAIL_FADE_MS = 300

const RING_SIZE = 44
const DOT_SIZE = 14
// Spacing between trail dots, in px, so a slow drag doesn't pile them up.
const DOT_SPACING = 12

const KEYFRAMES = `
@keyframes aqp-ring-fade { from { opacity: 1; transform: translate(-50%, -50%) scale(1); } to { opacity: 0; transform: translate(-50%, -50%) scale(1.5); } }
@keyframes aqp-dot-fade { from { opacity: 0.6; } to { opacity: 0; } }
`

function placeAt(el: HTMLElement, x: number, y: number) {
  el.style.left = `${x}px`
  el.style.top = `${y}px`
}

function makeRing(x: number, y: number): HTMLDivElement {
  const ring = document.createElement('div')
  ring.dataset.touchIndicator = 'ring'
  Object.assign(ring.style, {
    position: 'absolute',
    width: `${RING_SIZE}px`,
    height: `${RING_SIZE}px`,
    borderRadius: '50%',
    border: '2px solid color-mix(in srgb, var(--foreground) 85%, transparent)',
    background: 'color-mix(in srgb, var(--foreground) 28%, transparent)',
    boxShadow: '0 0 0 1px color-mix(in srgb, var(--background) 50%, transparent)',
    transform: 'translate(-50%, -50%)',
  })
  placeAt(ring, x, y)
  return ring
}

function makeDot(x: number, y: number): HTMLDivElement {
  const dot = document.createElement('div')
  dot.dataset.touchIndicator = 'trail'
  Object.assign(dot.style, {
    position: 'absolute',
    width: `${DOT_SIZE}px`,
    height: `${DOT_SIZE}px`,
    borderRadius: '50%',
    background: 'color-mix(in srgb, var(--foreground) 40%, transparent)',
    transform: 'translate(-50%, -50%)',
    animation: `aqp-dot-fade ${TRAIL_FADE_MS}ms ease-out forwards`,
  })
  placeAt(dot, x, y)
  return dot
}

export default function TouchIndicators({ touchStyle }: { touchStyle: TouchStyle }) {
  const layerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    type Live = { ring: HTMLDivElement; lastX: number; lastY: number }
    // One live ring per pointer while it is down (Trail style follows it).
    const live = new Map<number, Live>()
    // A finger drag that turned into a scroll: the browser cancels the pointer
    // and sends only touch events from then on, so follow those instead.
    let scrolling: Live | null = null
    const timers = new Set<ReturnType<typeof setTimeout>>()

    const removeLater = (el: HTMLElement, ms: number) => {
      const t = setTimeout(() => {
        el.remove()
        timers.delete(t)
      }, ms)
      timers.add(t)
    }

    const fadeRing = (ring: HTMLDivElement) => {
      ring.style.animation = `aqp-ring-fade ${RING_FADE_MS}ms ease-out forwards`
      removeLater(ring, RING_FADE_MS)
    }

    const follow = (entry: Live, x: number, y: number) => {
      placeAt(entry.ring, x, y)
      if (Math.hypot(x - entry.lastX, y - entry.lastY) < DOT_SPACING) return
      const dot = makeDot(entry.lastX, entry.lastY)
      layer.insertBefore(dot, entry.ring)
      removeLater(dot, TRAIL_FADE_MS)
      entry.lastX = x
      entry.lastY = y
    }

    const onDown = (e: PointerEvent) => {
      const ring = makeRing(e.clientX, e.clientY)
      layer.appendChild(ring)
      if (touchStyle === 'trail') {
        live.set(e.pointerId, { ring, lastX: e.clientX, lastY: e.clientY })
      } else {
        fadeRing(ring)
      }
    }

    const onMove = (e: PointerEvent) => {
      const entry = live.get(e.pointerId)
      if (entry) follow(entry, e.clientX, e.clientY)
    }

    const onUp = (e: PointerEvent) => {
      const entry = live.get(e.pointerId)
      if (!entry) return
      live.delete(e.pointerId)
      fadeRing(entry.ring)
    }

    const onCancel = (e: PointerEvent) => {
      const entry = live.get(e.pointerId)
      if (!entry || e.pointerType !== 'touch') return onUp(e)
      live.delete(e.pointerId)
      if (scrolling) fadeRing(scrolling.ring)
      scrolling = entry
    }

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (scrolling && t) follow(scrolling, t.clientX, t.clientY)
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!scrolling || e.touches.length > 0) return
      fadeRing(scrolling.ring)
      scrolling = null
    }

    const opts: AddEventListenerOptions = { capture: true, passive: true }
    window.addEventListener('pointerdown', onDown, opts)
    window.addEventListener('pointermove', onMove, opts)
    window.addEventListener('pointerup', onUp, opts)
    window.addEventListener('pointercancel', onCancel, opts)
    window.addEventListener('touchmove', onTouchMove, opts)
    window.addEventListener('touchend', onTouchEnd, opts)
    window.addEventListener('touchcancel', onTouchEnd, opts)
    return () => {
      window.removeEventListener('pointerdown', onDown, opts)
      window.removeEventListener('pointermove', onMove, opts)
      window.removeEventListener('pointerup', onUp, opts)
      window.removeEventListener('pointercancel', onCancel, opts)
      window.removeEventListener('touchmove', onTouchMove, opts)
      window.removeEventListener('touchend', onTouchEnd, opts)
      window.removeEventListener('touchcancel', onTouchEnd, opts)
      for (const t of timers) clearTimeout(t)
      for (const el of layer.querySelectorAll('[data-touch-indicator]')) el.remove()
    }
  }, [touchStyle])

  return (
    <div
      ref={layerRef}
      data-testid="touch-indicator-layer"
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: TOUCH_LAYER_Z, pointerEvents: 'none', overflow: 'hidden' }}
    >
      <style>{KEYFRAMES}</style>
    </div>
  )
}
