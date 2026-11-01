import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * The header of a sub-page (Settings → Muscle Balance): a back link, an
 * uppercase title, a one-line intro and an optional action, such as Save.
 */
export default function SubpageHeader({
  title,
  intro,
  backHref = '/settings',
  backLabel = 'Settings',
  action,
}: {
  title: string
  intro?: ReactNode
  backHref?: string
  backLabel?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6">
      <Link
        href={backHref}
        className="mb-3 inline-flex min-h-12 items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground doom-focus-ring hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {backLabel}
      </Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">{title}</h1>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {intro && <p className="mt-1 text-sm text-muted-foreground">{intro}</p>}
    </div>
  )
}
