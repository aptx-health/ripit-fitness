import type { ProgramInput } from '@/lib/proposals/program'

type SetInput = ProgramInput['weeks'][number]['workouts'][number]['exercises'][number]['prescribedSets'][number]

function describeSet(set: SetInput): string {
  let text = set.reps
  if (set.weight) text += ` @ ${set.weight}`
  if (set.rpe !== undefined) text += ` @ RPE ${set.rpe}`
  if (set.rir !== undefined) text += ` @ RIR ${set.rir}`
  if (set.isWarmup) text += ' warm-up'
  return text
}

/** Compact set summary: runs of identical sets collapse, e.g. `3 × 5 @ RPE 8, 1 × 10 warm-up`. */
export function setSummary(sets: SetInput[]): string {
  const runs: Array<{ text: string; count: number }> = []
  for (const set of sets) {
    const text = describeSet(set)
    const last = runs.at(-1)
    if (last?.text === text) last.count++
    else runs.push({ text, count: 1 })
  }
  return runs.map((r) => `${r.count} × ${r.text}`).join(', ')
}

/**
 * Read-only outline of a suggested program: weeks, workouts, exercises and a
 * set summary. Every value is agent-supplied, so it is rendered as plain text.
 */
export default function ProgramOutline({
  program,
  definitionNames,
}: {
  program: ProgramInput
  definitionNames: Record<string, string>
}) {
  return (
    <div className="space-y-3" data-testid="program-outline">
      {program.description && (
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">{program.description}</p>
      )}
      {program.weeks.map((week, wi) => (
        <div key={wi} className="border-2 border-border">
          <div className="px-3 py-2 bg-muted border-b border-border doom-label text-secondary">
            Week {wi + 1}
            {week.name && <span className="normal-case text-foreground"> · {week.name}</span>}
          </div>
          <div className="divide-y divide-border">
            {week.workouts.map((workout, di) => (
              <div key={di} className="p-3 space-y-1.5">
                <div className="text-sm font-semibold text-foreground break-words">
                  Day {di + 1} · {workout.name}
                </div>
                <ol className="space-y-1">
                  {workout.exercises.map((exercise, oi) => (
                    <li key={oi} className="text-sm">
                      <div className="flex flex-wrap gap-x-2">
                        <span className="text-foreground break-words">
                          {definitionNames[exercise.exerciseDefinitionId] ?? 'Missing exercise'}
                        </span>
                        <span className="text-muted-foreground">{setSummary(exercise.prescribedSets)}</span>
                      </div>
                      {exercise.notes && (
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                          {exercise.notes}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
