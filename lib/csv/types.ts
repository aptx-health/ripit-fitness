// CSV Import Type Definitions

// Raw CSV row as parsed from file
export interface CsvRow {
  week: string;
  day: string;
  workout_name: string;
  exercise: string;
  set: string;
  reps: string;
  weight: string;
  rir?: string;
  rpe?: string;
  notes?: string;
  exercise_group?: string;
}

// Validated and typed CSV row
export interface ParsedCsvRow {
  week: number;
  day: number;
  workoutName: string;
  exercise: string;
  set: number;
  reps: number;
  weight: string;
  rir?: number;
  rpe?: number;
  notes?: string;
  exerciseGroup?: string;
}

// Detected optional columns
export interface DetectedColumns {
  hasRir: boolean;
  hasRpe: boolean;
  hasNotes: boolean;
  hasExerciseGroup: boolean;
}

// Validation error
export interface ValidationError {
  row: number;
  column: string;
  message: string;
  value?: string;
}

// Parse result
export interface ParseResult {
  success: boolean;
  data?: ParsedCsvRow[];
  detectedColumns?: DetectedColumns;
  errors?: ValidationError[];
  fileName?: string;
}

// Program metadata inferred from CSV
export interface ProgramMetadata {
  name: string;
  totalWeeks: number;
  detectedColumns: DetectedColumns;
}

// Structured program data ready for database import
export interface StructuredProgram {
  metadata: ProgramMetadata;
  weeks: StructuredWeek[];
}

export interface StructuredWeek {
  weekNumber: number;
  workouts: StructuredWorkout[];
}

export interface StructuredWorkout {
  name: string;
  dayNumber: number;
  exercises: StructuredExercise[];
}

export interface StructuredExercise {
  name: string;
  order: number;
  exerciseGroup?: string;
  notes?: string;
  prescribedSets: StructuredPrescribedSet[];
}

export interface StructuredPrescribedSet {
  setNumber: number;
  reps: number;
  weight: string;
  rpe?: number;
  rir?: number;
}
