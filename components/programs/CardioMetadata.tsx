type CardioMetadataProps = {
  weekCount?: number
  sessionCount?: number
}

export default function CardioMetadata({
  weekCount,
  sessionCount,
}: CardioMetadataProps) {
  if (!weekCount && !sessionCount) return null

  return (
    <div className="flex gap-4 text-sm text-muted-foreground">
      {weekCount !== undefined && (
        <span>
          {weekCount} week{weekCount !== 1 ? 's' : ''}
        </span>
      )}
      {sessionCount !== undefined && (
        <span>
          {sessionCount} session{sessionCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}
