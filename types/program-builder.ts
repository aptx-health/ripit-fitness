export type Week = {
  id: string
  weekNumber: number
  name?: string | null
  description?: string | null
  workouts: Workout[]
}

export type Workout = {
  id: string
  name: string
  dayNumber: number
  exercises: Exercise[]
}

export type Exercise = {
  id: string
  name: string
  order: number
  notes?: string | null
  prescribedSets: PrescribedSet[]
  exerciseDefinition: {
    id: string
    name: string
    primaryFAUs: string[]
    secondaryFAUs: string[]
    isSystem?: boolean
    createdBy?: string | null
  }
}

export type PrescribedSet = {
  id: string
  setNumber: number
  reps: string
  weight?: string | null
  rpe?: number | null
  rir?: number | null
  isWarmup?: boolean
}

export type WeekSummary = {
  id: string
  weekNumber: number
  name?: string | null
  description?: string | null
}

export type ExistingProgram = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  weeksSummary: WeekSummary[]
  initialWeek: Week | null
}

export type ProgramBuilderProps = {
  editMode?: boolean
  existingProgram?: ExistingProgram
  onComplete?: () => void
}
