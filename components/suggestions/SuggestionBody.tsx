import type { SuggestionBody as Body } from '@/lib/suggestions/types'
import FieldDiff from './FieldDiff'
import ProgramOutline from './ProgramOutline'
import SavedWorkoutOutline from './SavedWorkoutOutline'

/** The shared per-kind renderer for a suggestion's body. */
export default function SuggestionBody({ body }: { body: Body }) {
  switch (body.type) {
    case 'saved_workout_create':
      return <SavedWorkoutOutline name={body.name} notes={body.notes} exercises={body.exercises} />
    case 'program':
      return <ProgramOutline program={body.program} definitionNames={body.definitionNames} />
    case 'saved_workout_update':
    case 'diff':
      return <FieldDiff rows={body.rows} mode="update" staleLabel="Changed since suggested." />
  }
}
