/**
 * Bug report, client helpers (features/admin/bug-report-screenshot.feature, work 222).
 *
 * PINNED (full contract: __tests__/features/admin/bug-report-support.ts)
 *   lib/feedback/shrink-image.ts: shrinkImage(blob, encode?) -> Promise<Blob>. encode(source, { scale, quality })
 *     returns an encoded image/jpeg Blob (the default one uses a canvas). For an image over
 *     MAX_SCREENSHOT_BYTES the result is image/jpeg, at most the limit, and scaled down (scale < 1) when
 *     quality alone can't get there.
 *   lib/feedback/bug-context.ts: installConsoleErrorCapture() records console.error calls; collectBugContext()
 *     returns { pageUrl, viewport: { width, height }, theme: { themeName, mode }, buildVersion, consoleErrors }
 *     with at most 10 console errors, newest last. buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pngBytes } from '../features/admin/bug-report-support'

type Encode = (source: Blob, opts: { scale: number; quality: number }) => Promise<Blob>
type Shrink = (blob: Blob, encode?: Encode) => Promise<Blob>

const load = (spec: string) => import(/* @vite-ignore */ spec)
const max = async () => ((await load('@/lib/feedback/screenshot')) as { MAX_SCREENSHOT_BYTES: number }).MAX_SCREENSHOT_BYTES
const shrink = async () => ((await load('@/lib/feedback/shrink-image')) as { shrinkImage: Shrink }).shrinkImage

/** A stand-in for the canvas encoder: output size follows the area and, if asked, the quality. */
function fakeEncoder(useQuality = true) {
  const calls: Array<{ scale: number; quality: number; sourceSize: number }> = []
  const encode: Encode = async (source, { scale, quality }) => {
    calls.push({ scale, quality, sourceSize: source.size })
    const size = Math.max(1, Math.floor(source.size * scale * scale * (useQuality ? quality : 1)))
    return new Blob([new Uint8Array(size)], { type: 'image/jpeg' })
  }
  return { encode, calls }
}

const big = (bytes: number, type = 'image/png') => new Blob([pngBytes(bytes)], { type })

describe('Big images are shrunk before sending', () => {
  it('turns a 3 MB PNG into a JPEG under the limit, scaled down', async () => {
    const { encode, calls } = fakeEncoder()
    const out = await (await shrink())(big(3_000_000), encode)
    expect(out.type).toBe('image/jpeg')
    expect(out.size).toBeLessThanOrEqual(await max())
    expect(out.size).toBeGreaterThan(0)
    expect(calls.some((c) => c.scale < 1)).toBe(true)
  })

  it('shrinks a JPEG just over the limit', async () => {
    const { encode } = fakeEncoder()
    const out = await (await shrink())(big((await max()) + 50_000, 'image/jpeg'), encode)
    expect(out.type).toBe('image/jpeg')
    expect(out.size).toBeLessThanOrEqual(await max())
  })

  it('gets under the limit even when lowering quality does nothing (it must scale down)', async () => {
    const { encode, calls } = fakeEncoder(false)
    const out = await (await shrink())(big(8_000_000), encode)
    expect(out.size).toBeLessThanOrEqual(await max())
    expect(Math.min(...calls.map((c) => c.scale))).toBeLessThan(1)
  }, 10_000)
})

describe('The report carries context', () => {
  type Ctx = {
    pageUrl: string
    viewport: { width: number; height: number }
    theme: { themeName: string; mode: string }
    buildVersion: string
    consoleErrors: string[]
  }
  let realError: typeof console.error

  async function fresh() {
    vi.resetModules()
    return (await load('@/lib/feedback/bug-context')) as {
      installConsoleErrorCapture: () => void
      collectBugContext: () => Ctx
    }
  }

  beforeEach(() => {
    realError = console.error
    console.error = () => {}
    window.localStorage.clear()
  })

  afterEach(() => {
    console.error = realError
    vi.unstubAllEnvs()
  })

  it('records the page URL, screen size, theme and build version', async () => {
    window.history.pushState({}, '', '/training/log?week=2')
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 })
    const { saveThemePreference } = await import('@/lib/theme')
    saveThemePreference({ themeName: 'forest', mode: 'light' })
    vi.stubEnv('NEXT_PUBLIC_BUILD_VERSION', 'build-abc1234')

    const { installConsoleErrorCapture, collectBugContext } = await fresh()
    installConsoleErrorCapture()
    const c = collectBugContext()
    expect(c.pageUrl).toContain('/training/log')
    expect(c.viewport).toEqual({ width: 390, height: 844 })
    expect(c.theme).toEqual({ themeName: 'forest', mode: 'light' })
    expect(c.buildVersion).toBe('build-abc1234')
    expect(c.consoleErrors).toEqual([])
  })

  it('records console errors in order, newest last', async () => {
    const { installConsoleErrorCapture, collectBugContext } = await fresh()
    installConsoleErrorCapture()
    console.error('first failure')
    console.error('second failure', 42)
    console.error(new Error('third failure'))
    const errors = collectBugContext().consoleErrors
    expect(errors).toHaveLength(3)
    expect(errors[0]).toContain('first failure')
    expect(errors[1]).toContain('second failure')
    expect(errors[2]).toContain('third failure')
  })

  it('keeps only the last 10', async () => {
    const { installConsoleErrorCapture, collectBugContext } = await fresh()
    installConsoleErrorCapture()
    for (let i = 1; i <= 12; i++) console.error(`error number ${i}`)
    const errors = collectBugContext().consoleErrors
    expect(errors).toHaveLength(10)
    expect(errors.map((e) => e.match(/error number (\d+)/)?.[1])).toEqual(['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])
  })

  it('records each error once when installed twice', async () => {
    const { installConsoleErrorCapture, collectBugContext } = await fresh()
    installConsoleErrorCapture()
    installConsoleErrorCapture()
    console.error('only once')
    expect(collectBugContext().consoleErrors).toHaveLength(1)
  })

  it('still passes errors on to the console', async () => {
    const seen: unknown[][] = []
    console.error = (...args: unknown[]) => {
      seen.push(args)
    }
    const { installConsoleErrorCapture } = await fresh()
    installConsoleErrorCapture()
    console.error('visible in devtools')
    expect(seen).toEqual([['visible in devtools']])
  })
})
