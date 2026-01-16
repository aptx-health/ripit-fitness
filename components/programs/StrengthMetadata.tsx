type StrengthMetadataProps = {
  weekCount?: number
  workoutCount?: number
}

export default function StrengthMetadata({
  weekCount,
  workoutCount,
}: StrengthMetadataProps) {
  if (!weekCount && !workoutCount) return null

  return (
    <div className="flex gap-4 text-sm text-muted-foreground">
      {weekCount !== undefined && (
        <span>
          {weekCount} week{weekCount !== 1 ? 's' : ''}
        </span>
      )}
      {workoutCount !== undefined && (
        <span>
          {workoutCount} workout{workoutCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}
