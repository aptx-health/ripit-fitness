import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { libraryHref } from '@/lib/library/links'

/** The program detail page's back link, styled like SubpageHeader's (48px tall). */
export default function ProgramBackLink() {
  return (
    <Link
      href={libraryHref({ type: 'programs' })}
      className="inline-flex min-h-12 items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground doom-focus-ring"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      Library
    </Link>
  )
}
