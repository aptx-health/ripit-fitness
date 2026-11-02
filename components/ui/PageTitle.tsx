import type { ReactNode } from 'react'

/** The hero title of a top-level screen (TRAINING, LIBRARY): one per screen. */
export default function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-4xl font-bold text-foreground doom-title uppercase tracking-wider">{children}</h1>
}
