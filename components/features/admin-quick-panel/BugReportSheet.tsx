'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ImagePlus, RefreshCw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import { clientLogger } from '@/lib/client-logger'
import { collectBugContext } from '@/lib/feedback/bug-context'
import { captureScreen } from '@/lib/feedback/capture-screen'
import { shrinkImage } from '@/lib/feedback/shrink-image'

/** Same layer as the admin drawer, above everything else in the app. */
const OVERLAY_Z = 10001
const SHEET_Z = 10002

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/** Resolves after the browser has painted, so a just-closed sheet or drawer is off screen. */
function afterPaint(): Promise<void> {
  const frame = () =>
    new Promise<void>((resolve) =>
      typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 16)
    )
  return frame().then(frame)
}

/**
 * "Report a bug": captures the screen as soon as it mounts (the drawer has
 * just closed), then shows the sheet with a preview, a message box, Retake,
 * Use a photo and Send. Retake hides the sheet while it captures again.
 */
export default function BugReportSheet({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [capturing, setCapturing] = useState(true)
  const [image, setImage] = useState<Blob | null>(null)
  // 'first': no screenshot at all; 'retake': the preview is still the earlier one.
  const [captureFailed, setCaptureFailed] = useState<'first' | 'retake' | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  // 'image': the picture couldn't be shrunk (e.g. an undecodable HEIC); 'send': the upload failed.
  const [sendFailed, setSendFailed] = useState<'image' | 'send' | null>(null)
  const [captureRun, setCaptureRun] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: captureRun is the trigger for a retake
  useEffect(() => {
    let cancelled = false
    setCapturing(true)
    afterPaint()
      .then(() => captureScreen())
      .then(
        (blob) => {
          if (cancelled) return
          setImage(blob)
          setCaptureFailed(null)
        },
        (error) => {
          if (cancelled) return
          clientLogger.warn('Bug report: screen capture failed', error)
          setCaptureFailed(captureRun === 0 ? 'first' : 'retake')
        }
      )
      .finally(() => {
        if (!cancelled) setCapturing(false)
      })
    return () => {
      cancelled = true
    }
  }, [captureRun])

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(image)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImage(file)
    setCaptureFailed(null)
    setSendFailed(null)
  }

  const send = async () => {
    setSending(true)
    setSendFailed(null)
    try {
      const form = new FormData()
      form.append('category', 'bug')
      form.append('message', message.trim())
      form.append('pageUrl', window.location.href)
      form.append('userAgent', navigator.userAgent)
      form.append('context', JSON.stringify(collectBugContext()))
      if (image) {
        let upload: Blob
        try {
          upload = await shrinkImage(image)
        } catch (error) {
          clientLogger.warn('Bug report: image could not be shrunk', error)
          setSendFailed('image')
          return
        }
        form.append('screenshot', upload, `screenshot.${EXTENSIONS[upload.type] ?? 'jpg'}`)
      }
      const res = await fetch('/api/feedback', { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Feedback upload failed: ${res.status}`)
      toast.success('Bug report sent')
      onClose()
    } catch (error) {
      clientLogger.warn('Bug report: send failed', error)
      setSendFailed('send')
    } finally {
      setSending(false)
    }
  }

  const canSend = message.trim().length > 0 && !sending

  return (
    <DialogPrimitive.Root open={!capturing} onOpenChange={(next) => !next && !sending && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay style={{ position: 'fixed', inset: 0, zIndex: OVERLAY_Z }} className="bg-black/55" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: SHEET_Z,
            maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 24px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            boxShadow: '0 -12px 30px rgba(0,0,0,0.5)',
          }}
          className="mx-auto flex w-full max-w-lg flex-col overflow-y-auto border border-b-0 border-t-[3px] border-border border-t-primary bg-card text-card-foreground"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <DialogPrimitive.Title className="text-sm font-bold uppercase tracking-widest">Report a bug</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground doom-focus-ring"
            >
              <X size={20} />
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-col gap-3 p-4">
            {previewUrl ? (
              // biome-ignore lint/performance/noImgElement: a local blob preview, not an optimizable asset
              <img
                src={previewUrl}
                alt="Screenshot preview"
                className="mx-auto max-h-[38dvh] w-auto max-w-full border border-border bg-muted object-contain"
              />
            ) : null}
            {captureFailed === 'first' && (
              <p className="border border-border bg-muted p-3 text-sm text-muted-foreground">
                Screen capture didn&apos;t work. Use a photo, or send without an image.
              </p>
            )}
            {captureFailed === 'retake' && (
              <p role="alert" className="text-sm font-semibold text-error">
                Retake didn&apos;t work. The preview is still the earlier screenshot.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCaptureRun((n) => n + 1)}
                disabled={sending}
                className="flex min-h-11 items-center justify-center gap-2 border-2 border-border bg-muted px-3 text-xs font-semibold uppercase tracking-wider hover:border-primary disabled:opacity-50 doom-focus-ring"
              >
                <RefreshCw size={14} />
                Retake
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
                className="flex min-h-11 items-center justify-center gap-2 border-2 border-border bg-muted px-3 text-xs font-semibold uppercase tracking-wider hover:border-primary disabled:opacity-50 doom-focus-ring"
              >
                <ImagePlus size={14} />
                Use a photo
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" tabIndex={-1} />
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                What went wrong?
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Rest timer didn't start..."
                className="w-full resize-none border-2 border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            {sendFailed === 'send' && (
              <p role="alert" className="text-sm font-semibold text-error">
                Report didn&apos;t send. Check your connection and try again.
              </p>
            )}
            {sendFailed === 'image' && (
              <p role="alert" className="text-sm font-semibold text-error">
                That image couldn&apos;t be used. Pick another photo or Retake.
              </p>
            )}

            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className="min-h-12 border-2 border-primary bg-primary px-4 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-hover disabled:opacity-50 doom-focus-ring"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
