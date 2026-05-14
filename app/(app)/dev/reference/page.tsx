import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

/**
 * Reference page index. Static landing for the design-system mockups
 * created in support of the Styling Sweep milestone (#10) and spike #721.
 *
 * Each linked page renders the canonical end-state for one surface, using
 * hardcoded data and inline JSX. The spike (and any downstream autopilot
 * agent) can copy from these pages as a visual anchor.
 */
export default function ReferenceIndexPage() {
  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-4xl font-bold text-foreground doom-title uppercase tracking-wider">
            Reference
          </h1>
          <p className="mt-2 text-base text-muted-foreground leading-relaxed">
            Canonical end-state mockups for the Styling Sweep milestone. Each
            page is hardcoded, server-rendered, and serves as a visual anchor
            for tickets and spike work.
          </p>
        </header>

        <div className="bg-card border border-border doom-corners divide-y divide-border">
          <ReferenceRow
            href="/dev/reference/training"
            title="Training Page"
            description="Bracketed workout list, week navigator, four row states on one screen, field-guide tip treatment."
            tickets="#700 #702 #704 #717"
          />
          <ReferenceRow
            href="/dev/reference/logger"
            title="Exercise Logger"
            description="Input-stamped numeric fields, segmented tabs, drawer context banner, weight keypad with muted CANCEL."
            tickets="#707 #708 #710 #711 #712 #713"
          />
        </div>

        <aside className="mt-8 p-4 border border-dashed border-border/40 bg-muted/35">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            How to use these pages
          </h2>
          <ul className="space-y-1.5 text-sm text-muted-foreground leading-relaxed">
            <li>
              <span className="text-foreground font-semibold">Source of truth:</span>{' '}
              <code className="text-xs">PRODUCT.md</code>,{' '}
              <code className="text-xs">DESIGN.md</code>,{' '}
              <code className="text-xs">.impeccable/design.json</code>. If a page
              disagrees with the spec, the spec wins.
            </li>
            <li>
              <span className="text-foreground font-semibold">JSX is inline on purpose.</span>{' '}
              The spike (#721) recommends which primitives to extract. These
              pages get refactored along with the rest.
            </li>
            <li>
              <span className="text-foreground font-semibold">Theme-aware.</span>{' '}
              Open the theme switcher in the header to verify each theme reads
              correctly.
            </li>
          </ul>
        </aside>
      </div>
    </div>
  )
}

function ReferenceRow({
  href,
  title,
  description,
  tickets,
}: {
  href: string
  title: string
  description: string
  tickets: string
}) {
  return (
    <Link
      href={href}
      className="block px-4 py-4 hover:bg-muted/50 active:bg-muted/70 transition-colors doom-focus-ring"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground doom-heading">
            {title.toUpperCase()}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground/80 font-semibold uppercase tracking-wider tabular-nums">
            Anchors: {tickets}
          </p>
        </div>
        <ArrowRight
          size={20}
          className="text-muted-foreground shrink-0"
          strokeWidth={1.8}
        />
      </div>
    </Link>
  )
}
