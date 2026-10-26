const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warning-muted text-warning-text border-warning-border',
  applied: 'bg-success-muted text-success-text border-success-border',
  conflict: 'bg-error-muted text-error-text border-error-border',
  rejected: 'bg-muted text-muted-foreground border-border',
  reverted: 'bg-muted text-muted-foreground border-border',
}

export default function ProposalStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 border font-semibold uppercase tracking-wider ${
        STATUS_STYLES[status] ?? STATUS_STYLES.rejected
      }`}
    >
      {status}
    </span>
  )
}
