import { pluralize } from '@/lib/format/pluralize'

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
          {pluralize(weekCount, 'week')}
        </span>
      )}
      {workoutCount !== undefined && (
        <span>
          {pluralize(workoutCount, 'workout')}
        </span>
      )}
    </div>
  )
}
