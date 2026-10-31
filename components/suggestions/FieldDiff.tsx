import type { DiffRow } from '@/lib/suggestions/types'

export type { DiffRow }

function format(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  return String(value)
}

/**
 * Before/after table for a proposal (admin) or suggestion (user review). Every
 * value is agent-supplied or derived from it, so it is rendered as plain text only.
 */
export default function FieldDiff({
  rows,
  mode,
  staleLabel = 'Changed since proposed.',
}: {
  rows: DiffRow[]
  mode: 'create' | 'update'
  /** Lead-in for a value that moved while pending. */
  staleLabel?: string
}) {
  return (
    <div className="border-2 border-border divide-y divide-border">
      {rows.map((row) => (
        <div key={row.field} className="p-3 space-y-1.5">
          <div className="doom-label text-secondary">{row.field}</div>
          {mode === 'update' && (
            <div className="text-sm whitespace-pre-wrap break-words bg-error-muted text-error-text border-l-4 border-error-border px-2 py-1">
              <span className="sr-only">Before: </span>
              {format(row.before)}
            </div>
          )}
          <div className="text-sm whitespace-pre-wrap break-words bg-success-muted text-success-text border-l-4 border-success-border px-2 py-1">
            <span className="sr-only">{mode === 'update' ? 'After: ' : 'Value: '}</span>
            {format(row.after)}
          </div>
          {row.current !== undefined && (
            <div className="text-xs text-warning-text">
              {`${staleLabel} Now: `}<span className="whitespace-pre-wrap break-words">{format(row.current)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
