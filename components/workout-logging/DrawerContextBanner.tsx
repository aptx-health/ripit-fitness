/**
 * Persistent context banner shown between the segmented tab row and the input
 * area on the LOG SETS tab of the exercise logger. Surfaces:
 *
 *   - The current exercise name (UPPERCASE, doom-heading)
 *   - The user's position within the set sequence ("Set 3 of 4")
 *   - The prescription for the current set ("Prescribed: 5 reps @ 135 lb, RIR 2")
 *
 * Stays visible whether the weight/RIR drawer is open or closed, so the user
 * never loses sight of which set they are on while the input takes over.
 *
 * Degrades cleanly when prescription data is missing (e.g. ad-hoc / freestyle
 * mode): `totalSets` and `prescribed` are both optional. When `totalSets` is
 * omitted the right-side label renders as just "Set N"; when `prescribed` is
 * omitted the prescribed line is dropped entirely (no placeholder).
 *
 * Read-only — no buttons, no actions. It is context, not control.
 */
type DrawerContextBannerProps = {
  exerciseName: string
  currentSet: number
  /** Omit to render just "Set N" (e.g. ad-hoc / freestyle mode). */
  totalSets?: number
  /** Omit to drop the "Prescribed: ..." line entirely. */
  prescribed?: string
  /**
   * True when an input drawer (weight/reps/intensity) is expanded. Suppresses
   * the "Prescribed: ..." line to give the expanded input more breathing room
   * — the logger's own surface carries the immediate context.
   */
  isInputExpanded?: boolean
}

export default function DrawerContextBanner({
  exerciseName,
  currentSet,
  totalSets,
  prescribed,
  isInputExpanded = false,
}: DrawerContextBannerProps) {
  const setLabel =
    typeof totalSets === 'number' ? `Set ${currentSet} of ${totalSets}` : `Set ${currentSet}`

  return (
    <div className="px-4 pt-2 pb-2 border-b border-border/60">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground doom-heading truncate">
          {exerciseName.toUpperCase()}
        </h2>
        <span className="text-base text-muted-foreground font-bold uppercase tracking-wider tabular-nums shrink-0">
          {setLabel}
        </span>
      </div>
      {prescribed && !isInputExpanded && (
        <p className="mt-1 text-base text-muted-foreground tabular-nums">
          Prescribed: <span className="text-foreground">{prescribed}</span>
        </p>
      )}
    </div>
  )
}
