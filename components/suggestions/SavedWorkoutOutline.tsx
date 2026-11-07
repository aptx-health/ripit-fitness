import { describeSavedSets, type ExerciseLine } from '@/lib/format/savedWorkoutSets'
import { supersetRuns } from '@/lib/format/supersets'
import SupersetBlock from './SupersetBlock'

/**
 * Read-only outline of a suggested saved workout: notes, then one line per
 * exercise with its sets; a superset's exercises sit in one labelled block.
 * Every value is agent-supplied, so it is plain text.
 */
export default function SavedWorkoutOutline({
  name,
  notes,
  exercises,
}: {
  name: string
  notes?: string | null
  exercises: ExerciseLine[]
}) {
  const line = (exercise: ExerciseLine, i: number) => (
    <li key={i} className="text-sm">
      <div className="flex flex-wrap gap-x-2">
        <span className="text-foreground break-words">
          {i + 1}. {exercise.name}
        </span>
        <span className="text-muted-foreground">{describeSavedSets(exercise.sets)}</span>
      </div>
      {exercise.notes && (
        <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{exercise.notes}</div>
      )}
    </li>
  )
  return (
    <div className="border-2 border-border" data-testid="saved-workout-outline">
      <div className="px-3 py-2 bg-muted border-b border-border text-sm font-semibold text-foreground break-words">
        {name}
      </div>
      {notes && (
        <p className="px-3 pt-2 text-sm text-foreground whitespace-pre-wrap break-words">{notes}</p>
      )}
      <ol className="p-3 space-y-1.5">
        {supersetRuns(exercises, (e) => e.exerciseGroup).map((run) =>
          run.group ? (
            <SupersetBlock key={run.entries[0].index} label={run.group}>
              {run.entries.map(({ item, index }) => line(item, index))}
            </SupersetBlock>
          ) : (
            line(run.entries[0].item, run.entries[0].index)
          )
        )}
      </ol>
    </div>
  )
}
