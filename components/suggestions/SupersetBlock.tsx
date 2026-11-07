import type { ReactNode } from 'react'

/** Exercises of one superset in an outline: one labelled block, like the logger's "Superset A" tag. */
export default function SupersetBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li role="group" aria-label={`Superset ${label}`} className="border-l-2 border-accent pl-2 space-y-1">
      <span className="inline-block px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent border border-accent">
        Superset {label}
      </span>
      <ol className="space-y-1">{children}</ol>
    </li>
  )
}
