'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useState } from 'react'
import type { BugContext } from '@/lib/feedback/context'

const labelClass = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1'

/**
 * The screenshot (tap for full size) and context of a bug report, for the
 * expanded item on the admin feedback page.
 */
export default function FeedbackBugReport({
  feedbackId,
  hasScreenshot,
  context,
}: {
  feedbackId: string
  hasScreenshot: boolean
  context: BugContext | null
}) {
  const [full, setFull] = useState(false)
  const src = `/api/feedback/${feedbackId}/screenshot`

  return (
    <>
      {hasScreenshot && (
        <div>
          <span className={labelClass}>Screenshot</span>
          <button
            type="button"
            onClick={() => setFull(true)}
            aria-label="Show screenshot full size"
            className="block border border-border bg-muted doom-focus-ring"
          >
            {/* biome-ignore lint/performance/noImgElement: an authenticated API image, not an optimizable asset */}
            <img src={src} alt="Bug report screenshot" loading="lazy" className="max-h-64 w-auto max-w-full object-contain" />
          </button>
          <DialogPrimitive.Root open={full} onOpenChange={setFull}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay style={{ position: 'fixed', inset: 0, zIndex: 70 }} className="bg-black/80" />
              <DialogPrimitive.Content
                aria-describedby={undefined}
                style={{ position: 'fixed', inset: 0, zIndex: 71 }}
                className="flex flex-col items-center justify-center p-3"
                onClick={() => setFull(false)}
              >
                <DialogPrimitive.Title className="sr-only">Screenshot</DialogPrimitive.Title>
                <DialogPrimitive.Close
                  aria-label="Close"
                  style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 8px)', right: 8 }}
                  className="flex h-11 w-11 items-center justify-center bg-card text-foreground border border-border doom-focus-ring"
                >
                  <X size={20} />
                </DialogPrimitive.Close>
                {/* biome-ignore lint/performance/noImgElement: an authenticated API image, not an optimizable asset */}
                <img src={src} alt="Bug report screenshot, full size" className="max-h-full max-w-full object-contain" />
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      )}

      {context && (
        <div>
          <span className={labelClass}>Context</span>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 bg-muted p-3 border border-border text-xs">
            <dt className="text-muted-foreground">Page</dt>
            <dd className="break-all text-foreground">{context.pageUrl}</dd>
            <dt className="text-muted-foreground">Screen</dt>
            <dd className="text-foreground">
              {context.viewport.width} x {context.viewport.height}
            </dd>
            <dt className="text-muted-foreground">Theme</dt>
            <dd className="text-foreground">
              {context.theme.themeName} ({context.theme.mode})
            </dd>
            <dt className="text-muted-foreground">Build</dt>
            <dd className="break-all text-foreground">{context.buildVersion}</dd>
          </dl>
          {context.consoleErrors.length > 0 && (
            <>
              <span className={`${labelClass} mt-2`}>Console errors (newest last)</span>
              <ol className="space-y-1 bg-muted p-3 border border-border font-mono text-xs text-foreground">
                {context.consoleErrors.map((error, i) => (
                  <li key={i} className="whitespace-pre-wrap break-words">
                    {error}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </>
  )
}
