// CSV Validation Logic

import type { CsvRow, ValidationError, DetectedColumns, ParsedCsvRow } from './types';

// Required columns that must be present
export const REQUIRED_COLUMNS = [
  'week',
  'day',
  'workout_name',
  'exercise',
  'set',
  'reps',
  'weight',
] as const;

// Optional columns that can be auto-detected
export const OPTIONAL_COLUMNS = ['rir', 'rpe', 'notes', 'exercise_group'] as const;

// Validate that all required columns are present
export function validateHeaders(headers: string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  for (const required of REQUIRED_COLUMNS) {
    if (!lowerHeaders.includes(required)) {
      errors.push({
        row: 0,
        column: required,
        message: `Missing required column: ${required}`,
      });
    }
  }

  return errors;
}

// Detect which optional columns are present
export function detectOptionalColumns(headers: string[]): DetectedColumns {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  return {
    hasRir: lowerHeaders.includes('rir'),
    hasRpe: lowerHeaders.includes('rpe'),
    hasNotes: lowerHeaders.includes('notes'),
    hasExerciseGroup: lowerHeaders.includes('exercise_group'),
  };
}

// Validate a single CSV row
export function validateRow(
  row: CsvRow,
  rowIndex: number,
  detectedColumns: DetectedColumns
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate week (must be positive integer)
  const week = parseInt(row.week, 10);
  if (isNaN(week) || week < 1) {
    errors.push({
      row: rowIndex,
      column: 'week',
      message: 'Week must be a positive integer (≥ 1)',
      value: row.week,
    });
  }

  // Validate day (must be positive integer)
  const day = parseInt(row.day, 10);
  if (isNaN(day) || day < 1) {
    errors.push({
      row: rowIndex,
      column: 'day',
      message: 'Day must be a positive integer (≥ 1)',
      value: row.day,
    });
  }

  // Validate workout_name (cannot be empty)
  if (!row.workout_name || row.workout_name.trim() === '') {
    errors.push({
      row: rowIndex,
      column: 'workout_name',
      message: 'Workout name cannot be empty',
      value: row.workout_name,
    });
  }

  // Validate exercise (cannot be empty)
  if (!row.exercise || row.exercise.trim() === '') {
    errors.push({
      row: rowIndex,
      column: 'exercise',
      message: 'Exercise name cannot be empty',
      value: row.exercise,
    });
  }

  // Validate set (must be positive integer)
  const set = parseInt(row.set, 10);
  if (isNaN(set) || set < 1) {
    errors.push({
      row: rowIndex,
      column: 'set',
      message: 'Set must be a positive integer (≥ 1)',
      value: row.set,
    });
  }

  // Validate reps (must be positive integer)
  const reps = parseInt(row.reps, 10);
  if (isNaN(reps) || reps < 1) {
    errors.push({
      row: rowIndex,
      column: 'reps',
      message: 'Reps must be a positive integer (≥ 1)',
      value: row.reps,
    });
  }

  // Validate weight (cannot be empty)
  if (!row.weight || row.weight.trim() === '') {
    errors.push({
      row: rowIndex,
      column: 'weight',
      message: 'Weight cannot be empty',
      value: row.weight,
    });
  }

  // Validate RIR if present (must be 0-5)
  if (detectedColumns.hasRir && row.rir !== undefined && row.rir.trim() !== '') {
    const rir = parseInt(row.rir, 10);
    if (isNaN(rir) || rir < 0 || rir > 5) {
      errors.push({
        row: rowIndex,
        column: 'rir',
        message: 'RIR must be an integer between 0 and 5',
        value: row.rir,
      });
    }
  }

  // Validate RPE if present (must be 1-10)
  if (detectedColumns.hasRpe && row.rpe !== undefined && row.rpe.trim() !== '') {
    const rpe = parseInt(row.rpe, 10);
    if (isNaN(rpe) || rpe < 1 || rpe > 10) {
      errors.push({
        row: rowIndex,
        column: 'rpe',
        message: 'RPE must be an integer between 1 and 10',
        value: row.rpe,
      });
    }
  }

  // Validate mutual exclusivity of RIR and RPE
  if (
    detectedColumns.hasRir &&
    detectedColumns.hasRpe &&
    row.rir &&
    row.rpe &&
    row.rir.trim() !== '' &&
    row.rpe.trim() !== ''
  ) {
    errors.push({
      row: rowIndex,
      column: 'rir/rpe',
      message: 'Cannot specify both RIR and RPE in the same row',
      value: `rir=${row.rir}, rpe=${row.rpe}`,
    });
  }

  return errors;
}

// Parse and validate a single row
export function parseRow(
  row: CsvRow,
  rowIndex: number,
  detectedColumns: DetectedColumns
): { data?: ParsedCsvRow; errors: ValidationError[] } {
  const errors = validateRow(row, rowIndex, detectedColumns);

  if (errors.length > 0) {
    return { errors };
  }

  const parsedRow: ParsedCsvRow = {
    week: parseInt(row.week, 10),
    day: parseInt(row.day, 10),
    workoutName: row.workout_name.trim(),
    exercise: row.exercise.trim(),
    set: parseInt(row.set, 10),
    reps: parseInt(row.reps, 10),
    weight: row.weight.trim(),
  };

  // Add optional fields if present and valid
  if (detectedColumns.hasRir && row.rir && row.rir.trim() !== '') {
    parsedRow.rir = parseInt(row.rir, 10);
  }

  if (detectedColumns.hasRpe && row.rpe && row.rpe.trim() !== '') {
    parsedRow.rpe = parseInt(row.rpe, 10);
  }

  if (detectedColumns.hasNotes && row.notes) {
    parsedRow.notes = row.notes.trim();
  }

  if (detectedColumns.hasExerciseGroup && row.exercise_group) {
    parsedRow.exerciseGroup = row.exercise_group.trim();
  }

  return { data: parsedRow, errors: [] };
}
