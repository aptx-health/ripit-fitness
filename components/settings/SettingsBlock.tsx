import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import PaperTabTitle from '@/components/ui/PaperTabTitle'

/**
 * One Settings block: a quiet paper tab naming it and one box of rows, like
 * the reference sections on Training. The block is a landmark region.
 */
export function SettingsBlock({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="flex items-end">
        <PaperTabTitle tone="quiet" icon={icon}>
          {title}
        </PaperTabTitle>
      </div>
      <div className="folder-box border border-border bg-card divide-y divide-border">{children}</div>
    </section>
  )
}

/** The fixed icon column every row shares, so the labels line up. */
export function RowIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="flex w-5 shrink-0 justify-center text-muted-foreground">
      {children}
    </span>
  )
}

export const ROW = 'flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-foreground doom-focus-ring'
export const ROW_LABEL = 'block text-sm font-bold uppercase tracking-wider'

/** A row that goes to another page: icon, label, a one-line description and a chevron. */
export function SettingsLinkRow({
  href,
  icon,
  label,
  description,
}: {
  href: string
  icon: ReactNode
  label: string
  description?: string
}) {
  return (
    <Link href={href} className={`${ROW} hover:bg-muted/50`}>
      <RowIcon>{icon}</RowIcon>
      <span className="min-w-0 flex-1">
        <span className={ROW_LABEL}>{label}</span>
        {description && <span className="block text-sm text-muted-foreground">{description}</span>}
      </span>
      <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
    </Link>
  )
}

/** An outline button in Training's quiet style. */
export const OUTLINE_BUTTON =
  'inline-flex min-h-12 items-center justify-center gap-1.5 px-4 border border-border text-foreground hover:bg-muted doom-focus-ring text-sm font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed'
