/**
 * E-ink display: a per-device preference, separate from the theme, that turns
 * off motion and makes text bolder (the rules are on [data-display="eink"] in
 * app/globals.css). Stored like the theme: localStorage first, with a cookie
 * that survives iOS evicting storage. The inline scripts in app/layout.tsx and
 * app/(auth)/layout.tsx read it the same way before first paint.
 */

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'einkDisplay'
const COOKIE_KEY = 'eink_display'
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60
const CHANGE_EVENT = 'einkdisplaychange'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function readCookie(): string | null {
  for (const part of document.cookie.split(';')) {
    const [name, value] = part.trim().split('=')
    if (name === COOKIE_KEY) return value ?? null
  }
  return null
}

/** On only when stored as "true": localStorage, else the cookie. Off on a new device. */
export function getEinkDisplay(): boolean {
  if (typeof document === 'undefined') return false
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage blocked: the cookie decides.
  }
  if (stored === 'true' || stored === 'false') return stored === 'true'
  return readCookie() === 'true'
}

export function setEinkDisplay(on: boolean): void {
  if (typeof document === 'undefined') return
  const value = on ? 'true' : 'false'
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // The cookie below still keeps it.
  }
  document.cookie = `${COOKIE_KEY}=${value};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`
}

/** Sets or removes data-display="eink" on <html>, and tells mounted hooks. */
export function applyEinkDisplay(on: boolean): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (on) root.dataset.display = 'eink'
  else root.removeAttribute('data-display')
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

// ---- hooks ----

function displayApplied(): boolean {
  return document.documentElement.dataset.display === 'eink'
}

function osReducedMotion(): boolean {
  return window.matchMedia?.(REDUCED_MOTION).matches === true
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback)
  const mq = window.matchMedia?.(REDUCED_MOTION)
  mq?.addEventListener?.('change', callback)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    mq?.removeEventListener?.('change', callback)
  }
}

const serverFalse = () => false

/** Whether E-ink display is on for this page. False on the server. */
export function useEinkDisplay(): boolean {
  return useSyncExternalStore(subscribe, displayApplied, serverFalse)
}

/**
 * True when the OS asks for reduced motion or E-ink display is on. Follows
 * both changing while mounted. False on the server.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => osReducedMotion() || displayApplied(), serverFalse)
}
