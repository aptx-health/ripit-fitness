/**
 * UI1: the installed app gets a solid status bar. The head metadata of
 * app/layout.tsx: the Apple status bar style and the theme colour for light and
 * dark. (The cause is in initiatives/ui-audit/docs/2026-11-01-ios-pwa-top-blur.md.)
 *
 * Seam: app/layout.tsx exports `metadata` and `viewport`.
 *   metadata.appleWebApp.statusBarStyle === 'default'  (capable and title stay)
 *   viewport.themeColor = [{ media: '(prefers-color-scheme: light)', color },
 *                          { media: '(prefers-color-scheme: dark)',  color }]
 *   colours are the ripit theme's --background in app/globals.css:
 *   light #FBF8F3, dark #1A1108.
 * viewport-fit stays "cover".
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('next/font/google', () => {
  const font = () => ({ variable: 'font-var', className: 'font-class' })
  return { Geist: font, Geist_Mono: font, Rajdhani: font }
})
vi.mock('@/components/ThemeInitializer', () => ({ ThemeInitializer: () => null }))
vi.mock('@/components/ToastProvider', () => ({ ToastProvider: ({ children }: { children: unknown }) => children }))

const load = (spec: string) => import(/* @vite-ignore */ spec)

type ThemeColor = { media?: string; color: string }
const themeColors = async (): Promise<ThemeColor[]> => {
  const { viewport } = await load('@/app/layout')
  return ([] as ThemeColor[]).concat(viewport.themeColor ?? [])
}
const forMode = async (mode: 'light' | 'dark') =>
  (await themeColors()).find((t) => t.media === `(prefers-color-scheme: ${mode})`)

describe('The installed app gets a solid status bar', () => {
  it('sets the Apple status bar style to "default"', async () => {
    const { metadata } = await load('@/app/layout')
    expect(metadata.appleWebApp.statusBarStyle).toBe('default')
  })

  it('keeps the app installable (capable, title, manifest)', async () => {
    const { metadata } = await load('@/app/layout')
    expect(metadata.appleWebApp.capable).toBe(true)
    expect(metadata.appleWebApp.title).toBe('Ripit')
    expect(metadata.manifest).toBe('/site.webmanifest')
  })

  it('sets a theme colour for light mode', async () => {
    const light = await forMode('light')
    expect(light).toBeTruthy()
    expect(light?.color.toLowerCase()).toBe('#fbf8f3')
  })

  it('sets a theme colour for dark mode', async () => {
    const dark = await forMode('dark')
    expect(dark).toBeTruthy()
    expect(dark?.color.toLowerCase()).toBe('#1a1108')
  })

  it('has exactly one colour per mode and no other entries', async () => {
    const colors = await themeColors()
    expect(colors).toHaveLength(2)
    expect(new Set(colors.map((c) => c.media)).size).toBe(2)
  })

  it('keeps the viewport settings, including viewport-fit cover', async () => {
    const { viewport } = await load('@/app/layout')
    expect(viewport.viewportFit).toBe('cover')
    expect(viewport.width).toBe('device-width')
    expect(viewport.initialScale).toBe(1)
  })

  it('renders the theme-color metas through Next (light and dark)', async () => {
    const { viewport } = await load('@/app/layout')
    const media = ([] as ThemeColor[]).concat(viewport.themeColor ?? []).map((t) => t.media)
    expect(media).toContain('(prefers-color-scheme: light)')
    expect(media).toContain('(prefers-color-scheme: dark)')
  })
})
