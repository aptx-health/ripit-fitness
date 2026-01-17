/**
 * Data transformation utilities for PowerSync
 *
 * Converts SQLite types to TypeScript/Prisma types:
 * - INTEGER (0/1) → boolean
 * - TEXT (JSON) → array
 * - TEXT (ISO 8601) → Date
 */

// ============================================
// BASE TYPE TRANSFORMATIONS
// ============================================

/**
 * Convert SQLite INTEGER (0/1) to boolean
 */
export function parseBoolean(value: number | null | undefined): boolean {
  return value === 1;
}

/**
 * Convert SQLite TEXT (JSON array) to TypeScript array
 */
export function parseArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Convert SQLite TEXT (ISO 8601) to Date object
 */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  try {
    return new Date(value);
  } catch {
    return null;
  }
}

// ============================================
// STRENGTH TRAINING TRANSFORMATIONS
// ============================================

export interface Program {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  isActive: boolean;
  isArchived: boolean;
  archivedAt: Date | null;
  programType: string;
  isUserCreated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function transformProgram(raw: any): Program {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description || null,
    userId: raw.userId,
    isActive: parseBoolean(raw.isActive),
    isArchived: parseBoolean(raw.isArchived),
    archivedAt: parseDate(raw.archivedAt),
    programType: raw.programType,
    isUserCreated: parseBoolean(raw.isUserCreated),
    createdAt: parseDate(raw.createdAt)!,
    updatedAt: parseDate(raw.updatedAt)!,
  };
}

export interface Week {
  id: string;
  weekNumber: number;
  programId: string;
  userId: string;
}

export function transformWeek(raw: any): Week {
  return {
    id: raw.id,
    weekNumber: raw.weekNumber,
    programId: raw.programId,
    userId: raw.userId,
  };
}

export interface Workout {
  id: string;
  name: string;
  dayNumber: number;
  weekId: string;
  userId: string;
}

export function transformWorkout(raw: any): Workout {
  return {
    id: raw.id,
    name: raw.name,
    dayNumber: raw.dayNumber,
    weekId: raw.weekId,
    userId: raw.userId,
  };
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  normalizedName: string;
  aliases: string[];
  category: string | null;
  primaryFAUs: string[];
  secondaryFAUs: string[];
  equipment: string[];
  instructions: string | null;
  isSystem: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function transformExerciseDefinition(raw: any): ExerciseDefinition {
  return {
    id: raw.id,
    name: raw.name,
    normalizedName: raw.normalizedName,
    aliases: parseArray(raw.aliases),
    category: raw.category || null,
    primaryFAUs: parseArray(raw.primaryFAUs),
    secondaryFAUs: parseArray(raw.secondaryFAUs),
    equipment: parseArray(raw.equipment),
    instructions: raw.instructions || null,
    isSystem: parseBoolean(raw.isSystem),
    createdBy: raw.createdBy || null,
    createdAt: parseDate(raw.createdAt)!,
    updatedAt: parseDate(raw.updatedAt)!,
  };
}

export interface Exercise {
  id: string;
  name: string;
  exerciseDefinitionId: string;
  order: number;
  exerciseGroup: string | null;
  workoutId: string;
  userId: string;
  notes: string | null;
}

export function transformExercise(raw: any): Exercise {
  return {
    id: raw.id,
    name: raw.name,
    exerciseDefinitionId: raw.exerciseDefinitionId,
    order: raw.order,
    exerciseGroup: raw.exerciseGroup || null,
    workoutId: raw.workoutId,
    userId: raw.userId,
    notes: raw.notes || null,
  };
}

export interface PrescribedSet {
  id: string;
  setNumber: number;
  reps: string;
  weight: string | null;
  rpe: number | null;
  rir: number | null;
  exerciseId: string;
  userId: string;
}

export function transformPrescribedSet(raw: any): PrescribedSet {
  return {
    id: raw.id,
    setNumber: raw.setNumber,
    reps: raw.reps,
    weight: raw.weight || null,
    rpe: raw.rpe || null,
    rir: raw.rir || null,
    exerciseId: raw.exerciseId,
    userId: raw.userId,
  };
}

export interface WorkoutCompletion {
  id: string;
  workoutId: string;
  userId: string;
  completedAt: Date;
  status: string;
  notes: string | null;
}

export function transformWorkoutCompletion(raw: any): WorkoutCompletion {
  return {
    id: raw.id,
    workoutId: raw.workoutId,
    userId: raw.userId,
    completedAt: parseDate(raw.completedAt)!,
    status: raw.status,
    notes: raw.notes || null,
  };
}

export interface LoggedSet {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
  weightUnit: string;
  rpe: number | null;
  rir: number | null;
  exerciseId: string;
  completionId: string;
  createdAt: Date;
}

export function transformLoggedSet(raw: any): LoggedSet {
  return {
    id: raw.id,
    setNumber: raw.setNumber,
    reps: raw.reps,
    weight: raw.weight,
    weightUnit: raw.weightUnit,
    rpe: raw.rpe || null,
    rir: raw.rir || null,
    exerciseId: raw.exerciseId,
    completionId: raw.completionId,
    createdAt: parseDate(raw.createdAt)!,
  };
}

// ============================================
// CARDIO TRAINING TRANSFORMATIONS
// ============================================

export interface CardioProgram {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  isActive: boolean;
  isArchived: boolean;
  archivedAt: Date | null;
  isUserCreated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function transformCardioProgram(raw: any): CardioProgram {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description || null,
    userId: raw.userId,
    isActive: parseBoolean(raw.isActive),
    isArchived: parseBoolean(raw.isArchived),
    archivedAt: parseDate(raw.archivedAt),
    isUserCreated: parseBoolean(raw.isUserCreated),
    createdAt: parseDate(raw.createdAt)!,
    updatedAt: parseDate(raw.updatedAt)!,
  };
}

export interface CardioWeek {
  id: string;
  weekNumber: number;
  cardioProgramId: string;
  userId: string;
}

export function transformCardioWeek(raw: any): CardioWeek {
  return {
    id: raw.id,
    weekNumber: raw.weekNumber,
    cardioProgramId: raw.cardioProgramId,
    userId: raw.userId,
  };
}

export interface PrescribedCardioSession {
  id: string;
  weekId: string;
  userId: string;
  dayNumber: number;
  name: string;
  description: string | null;
  targetDuration: number;
  intensityZone: string | null;
  equipment: string | null;
  targetHRRange: string | null;
  targetPowerRange: string | null;
  intervalStructure: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function transformPrescribedCardioSession(raw: any): PrescribedCardioSession {
  return {
    id: raw.id,
    weekId: raw.weekId,
    userId: raw.userId,
    dayNumber: raw.dayNumber,
    name: raw.name,
    description: raw.description || null,
    targetDuration: raw.targetDuration,
    intensityZone: raw.intensityZone || null,
    equipment: raw.equipment || null,
    targetHRRange: raw.targetHRRange || null,
    targetPowerRange: raw.targetPowerRange || null,
    intervalStructure: raw.intervalStructure || null,
    notes: raw.notes || null,
    createdAt: parseDate(raw.createdAt)!,
    updatedAt: parseDate(raw.updatedAt)!,
  };
}

export interface LoggedCardioSession {
  id: string;
  prescribedSessionId: string | null;
  userId: string;
  completedAt: Date;
  status: string;
  name: string;
  equipment: string;
  duration: number;
  avgHR: number | null;
  peakHR: number | null;
  avgPower: number | null;
  peakPower: number | null;
  distance: number | null;
  elevationGain: number | null;
  elevationLoss: number | null;
  avgPace: string | null;
  cadence: number | null;
  strokeRate: number | null;
  strokeCount: number | null;
  calories: number | null;
  intensityZone: string | null;
  intervalStructure: string | null;
  notes: string | null;
}

export function transformLoggedCardioSession(raw: any): LoggedCardioSession {
  return {
    id: raw.id,
    prescribedSessionId: raw.prescribedSessionId || null,
    userId: raw.userId,
    completedAt: parseDate(raw.completedAt)!,
    status: raw.status,
    name: raw.name,
    equipment: raw.equipment,
    duration: raw.duration,
    avgHR: raw.avgHR || null,
    peakHR: raw.peakHR || null,
    avgPower: raw.avgPower || null,
    peakPower: raw.peakPower || null,
    distance: raw.distance || null,
    elevationGain: raw.elevationGain || null,
    elevationLoss: raw.elevationLoss || null,
    avgPace: raw.avgPace || null,
    cadence: raw.cadence || null,
    strokeRate: raw.strokeRate || null,
    strokeCount: raw.strokeCount || null,
    calories: raw.calories || null,
    intensityZone: raw.intensityZone || null,
    intervalStructure: raw.intervalStructure || null,
    notes: raw.notes || null,
  };
}

export interface UserCardioMetricPreferences {
  id: string;
  userId: string;
  equipment: string;
  customMetrics: string[];
  createdAt: Date;
  updatedAt: Date;
}

export function transformUserCardioMetricPreferences(raw: any): UserCardioMetricPreferences {
  return {
    id: raw.id,
    userId: raw.userId,
    equipment: raw.equipment,
    customMetrics: parseArray(raw.customMetrics),
    createdAt: parseDate(raw.createdAt)!,
    updatedAt: parseDate(raw.updatedAt)!,
  };
}
