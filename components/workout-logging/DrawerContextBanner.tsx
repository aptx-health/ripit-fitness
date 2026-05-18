import { Settings } from 'lucide-react'
import ExerciseQuickActionsMenu, { type QuickAction } from './ExerciseQuickActionsMenu'

/**
 * Persistent context banner shown between the segmented tab row and the input
 * area on the LOG SETS tab of the exercise logger. Surfaces:
 *
 *   - The current exercise name (UPPERCASE, doom-heading)
 *   - The user's position within the set sequence ("Set 3 of 4")
 *   - The prescription for the current set ("Prescribed: 5 reps @ 135 lb, RIR 2")
 *   - An optional gear menu for exercise-scoped actions (edit / swap / delete)
 *
 * The gear lives here — beside the exercise name it modifies — rather than
 * in the global header where it competed with the FINISH / X destination
 * controls.
 *
 * Degrades cleanly when prescription data is missing (e.g. ad-hoc / freestyle
 * mode): `totalSets` and `prescribed` are both optional.
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
  /** Exercise-scoped actions (edit, swap, delete...). Omit to hide the gear. */
  menuActions?: QuickAction[]
}

export default function DrawerContextBanner({
  exerciseName,
  currentSet,
  totalSets,
  prescribed,
  isInputExpanded = false,
  menuActions,
}: DrawerContextBannerProps) {
  const setLabel =
    typeof totalSets === 'number' ? `Set ${currentSet} of ${totalSets}` : `Set ${currentSet}`

  return (
    <div className="px-4 pt-2 pb-2 border-b border-border/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-foreground doom-heading leading-tight break-words">
            {exerciseName.toUpperCase()}
          </h2>
          {prescribed && !isInputExpanded && (
            <p className="mt-1 text-base text-muted-foreground tabular-nums">
              Prescribed: <span className="text-foreground">{prescribed}</span>
            </p>
          )}
        </div>
        {/* Right column: stacked when "Set N of M" needs the width
            (prescribed mode); horizontal in adhoc mode where the set
            label is just "Set N" and there's room for Edit beside it. */}
        <div
          className={`flex shrink-0 ${
            typeof totalSets === 'number'
              ? 'flex-col items-end gap-0.5'
              : 'items-center gap-3'
          }`}
        >
          <span className="text-base text-muted-foreground font-bold uppercase tracking-wider tabular-nums">
            {setLabel}
          </span>
          {menuActions && menuActions.length > 0 && !isInputExpanded && (
            <ExerciseQuickActionsMenu
              actions={menuActions}
              triggerIcon={Settings}
              triggerLabel="Edit"
              triggerAriaLabel="Exercise options"
              triggerClassName="text-muted-foreground hover:text-foreground"
            />
          )}
        </div>
      </div>
    </div>
  )
}
