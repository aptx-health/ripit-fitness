/**
 * Bug report review fixes, client side (work 224):
 *   3. uncaught errors and unhandled rejections join the console error list (still at most 10).
 *   6. a failed Retake says so and keeps the earlier screenshot, labelled as the earlier one.
 *   8. an image that can't be shrunk says the image couldn't be used, not "check your connection".
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cap = vi.hoisted(() => ({ next: [] as Array<'fail' | 'ok'>, calls: 0 }))
const shrink = vi.hoisted(() => ({ fail: false }))

vi.mock('@/lib/feedback/capture-screen', () => ({
  captureScreen: async () => {
    cap.calls++
    if ((cap.next.shift() ?? 'ok') === 'fail') throw new Error('capture failed')
    return new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, cap.calls])], { type: 'image/png' })
  },
}))
vi.mock('@/lib/feedback/shrink-image', () => ({
  shrinkImage: async (blob: Blob) => {
    if (shrink.fail) throw new Error('could not decode')
    return blob
  },
}))

const load = (spec: string) => import(/* @vite-ignore */ spec)

let realError: typeof console.error
const fetchMock = vi.fn(async () => new Response('{"success":true}', { status: 200 }))

beforeEach(() => {
  realError = console.error
  console.error = () => {}
  cap.next.length = 0
  cap.calls = 0
  shrink.fail = false
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  let n = 0
  URL.createObjectURL = (() => `blob:preview-${++n}`) as typeof URL.createObjectURL
  URL.revokeObjectURL = () => {}
})

afterEach(() => {
  cleanup()
  console.error = realError
  vi.unstubAllGlobals()
})

describe('Uncaught errors and unhandled rejections are recorded', () => {
  async function fresh() {
    vi.resetModules()
    return (await load('@/lib/feedback/bug-context')) as {
      installConsoleErrorCapture: () => void
      collectBugContext: () => { consoleErrors: string[] }
    }
  }

  it('records a window error and an unhandled rejection with console errors, newest last', async () => {
    const { installConsoleErrorCapture, collectBugContext } = await fresh()
    installConsoleErrorCapture()
    console.error('logged first')
    window.dispatchEvent(new ErrorEvent('error', { error: new TypeError('timer is undefined'), message: 'x' }))
    const rejection = Object.assign(new Event('unhandledrejection'), { reason: new Error('draft save failed') })
    window.dispatchEvent(rejection)
    const errors = collectBugContext().consoleErrors
    expect(errors).toHaveLength(3)
    expect(errors[0]).toContain('logged first')
    expect(errors[1]).toMatch(/Uncaught.*TypeError: timer is undefined/)
    expect(errors[2]).toMatch(/Unhandled rejection.*draft save failed/)
  })

  it('keeps the shared list at 10', async () => {
    const { installConsoleErrorCapture, collectBugContext } = await fresh()
    installConsoleErrorCapture()
    for (let i = 1; i <= 6; i++) console.error(`console ${i}`)
    for (let i = 1; i <= 6; i++) window.dispatchEvent(new ErrorEvent('error', { message: `uncaught ${i}` }))
    const errors = collectBugContext().consoleErrors
    expect(errors).toHaveLength(10)
    expect(errors[0]).toContain('console 3')
    expect(errors[9]).toContain('uncaught 6')
  })
})

async function renderSheet() {
  const { ToastProvider } = await import('@/components/ToastProvider')
  const { default: BugReportSheet } = await import('@/components/features/admin-quick-panel/BugReportSheet')
  render(
    <ToastProvider>
      <BugReportSheet onClose={() => {}} />
    </ToastProvider>
  )
  return await screen.findByRole('dialog', { name: 'Report a bug' }, { timeout: 4000 })
}

const previewSrc = () => screen.queryByRole('img', { name: 'Screenshot preview' })?.getAttribute('src') ?? null

describe('A failed Retake says so', () => {
  it('shows an error and keeps the earlier screenshot, not passed off as new', async () => {
    await renderSheet()
    await waitFor(() => expect(previewSrc()).not.toBeNull())
    const before = previewSrc()

    cap.next.push('fail')
    fireEvent.click(screen.getByRole('button', { name: 'Retake' }))
    await waitFor(() => expect(cap.calls).toBe(2))
    const sheet = await screen.findByRole('dialog', { name: 'Report a bug' }, { timeout: 4000 })

    expect(await within(sheet).findByText(/retake didn.t work/i)).toBeTruthy()
    expect(within(sheet).getByText(/earlier screenshot/i)).toBeTruthy()
    expect(previewSrc()).toBe(before)
  })

  it('clears the message once a later Retake works', async () => {
    await renderSheet()
    cap.next.push('fail')
    fireEvent.click(screen.getByRole('button', { name: 'Retake' }))
    await screen.findByText(/retake didn.t work/i, {}, { timeout: 4000 })

    fireEvent.click(screen.getByRole('button', { name: 'Retake' }))
    await waitFor(() => expect(cap.calls).toBe(3))
    await screen.findByRole('dialog', { name: 'Report a bug' }, { timeout: 4000 })
    await waitFor(() => expect(screen.queryByText(/retake didn.t work/i)).toBeNull())
  })
})

describe('An image that cannot be shrunk', () => {
  it('says the image could not be used, sends nothing, and keeps the message', async () => {
    shrink.fail = true
    const sheet = await renderSheet()
    await waitFor(() => expect(previewSrc()).not.toBeNull())
    fireEvent.change(within(sheet).getByRole('textbox'), { target: { value: 'HEIC photo' } })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Send' }))

    expect(await within(sheet).findByText(/image couldn.t be used/i)).toBeTruthy()
    expect(within(sheet).queryByText(/connection/i)).toBeNull()
    expect(within(sheet).queryByText(/didn.t send/i)).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect((within(sheet).getByRole('textbox') as HTMLTextAreaElement).value).toBe('HEIC photo')
  })

  it('a failed upload still says it did not send', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const sheet = await renderSheet()
    fireEvent.change(within(sheet).getByRole('textbox'), { target: { value: 'Offline' } })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Send' }))
    expect(await within(sheet).findByText(/didn.t send/i)).toBeTruthy()
    expect(within(sheet).queryByText(/image couldn.t be used/i)).toBeNull()
  })
})
