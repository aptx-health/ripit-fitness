/**
 * Cardio Types
 *
 * TypeScript types and interfaces for cardio training features.
 * Extends Prisma-generated types with additional UI/API types.
 */

import type { CardioProgram, CardioWeek, PrescribedCardioSession, LoggedCardioSession, UserCardioMetricPreferences } from '@prisma/client'
import type { CardioEquipment, IntensityZone, CardioMetric } from './equipment-profiles'

// ============================================
// PRISMA TYPE EXTENSIONS
// ============================================

/**
 * CardioProgram with related weeks
 */
export type CardioMath = CardioProgram & {
  weeks: CardioWeek[]
}

/**
 * CardioWeek with related sessions
 */
export type CardioWeekWithSessions = CardioWeek & {
  sessions: PrescribedCardioSession[]
}

/**
 * CardioProgram with weeks and sessions (full hierarchy)
 */
export type CardioMathWithWeeks = CardioProgram & {
  weeks: CardioWeekWithSessions[]
}

/**
 * PrescribedCardioSession with logged sessions (for completion tracking)
 */
export type PrescribedCardioSessionWithLogs = PrescribedCardioSession & {
  loggedSessions: LoggedCardioSession[]
}

/**
 * CardioWeek with sessions and their logs
 */
export type CardioWeekWithSessionsAndLogs = CardioWeek & {
  sessions: PrescribedCardioSessionWithLogs[]
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

/**
 * Request body for logging a cardio session
 */
export interface LogCardioSessionRequest {
  // Optional link to prescribed session
  prescribedSessionId?: string

  // Required fields
  name: string
  equipment: CardioEquipment
  duration: number // minutes

  // Optional metrics
  avgHR?: number
  peakHR?: number
  avgPower?: number
  peakPower?: number
  distance?: number
  elevationGain?: number
  elevationLoss?: number
  avgPace?: string
  cadence?: number
  strokeRate?: number
  strokeCount?: number
  calories?: number

  // Context
  intensityZone?: IntensityZone
  intervalStructure?: string
  notes?: string
  status?: 'completed' | 'incomplete' | 'abandoned'
}

/**
 * Response for logged cardio session
 */
export interface LogCardioSessionResponse {
  success: boolean
  session?: LoggedCardioSession
  error?: string
}

/**
 * Request body for saving metric preferences
 */
export interface SaveMetricPreferencesRequest {
  equipment: CardioEquipment
  metrics: CardioMetric[]
}

/**
 * Response for metric preferences
 */
export interface MetricPreferencesResponse {
  success: boolean
  preferences?: UserCardioMetricPreferences
  error?: string
}

/**
 * Response for getting metrics for equipment
 */
export interface GetMetricsResponse {
  equipment: CardioEquipment
  metrics: CardioMetric[]
  isCustom: boolean // true if user has custom preferences
}

/**
 * Request body for creating a cardio program
 */
export interface CreateCardioProgramRequest {
  name: string
  description?: string
  isUserCreated: boolean
}

/**
 * Response for cardio program operations
 */
export interface CardioProgramResponse {
  success: boolean
  program?: CardioProgram
  error?: string
}

// ============================================
// UI STATE TYPES
// ============================================

/**
 * Form state for logging cardio session
 */
export interface CardioSessionFormState {
  name: string
  equipment: CardioEquipment | null
  duration: string // String for input, convert to number on submit

  // Optional metrics (all as strings for form inputs)
  avgHR: string
  peakHR: string
  avgPower: string
  peakPower: string
  distance: string
  elevationGain: string
  elevationLoss: string
  avgPace: string
  cadence: string
  strokeRate: string
  strokeCount: string
  calories: string

  // Context
  intensityZone: IntensityZone | null
  intervalStructure: string
  notes: string
  status: 'completed' | 'incomplete' | 'abandoned'
}

/**
 * Initial empty form state
 */
export const INITIAL_CARDIO_FORM_STATE: CardioSessionFormState = {
  name: '',
  equipment: null,
  duration: '',
  avgHR: '',
  peakHR: '',
  avgPower: '',
  peakPower: '',
  distance: '',
  elevationGain: '',
  elevationLoss: '',
  avgPace: '',
  cadence: '',
  strokeRate: '',
  strokeCount: '',
  calories: '',
  intensityZone: null,
  intervalStructure: '',
  notes: '',
  status: 'completed'
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Cardio session status
 */
export type CardioSessionStatus = 'completed' | 'incomplete' | 'abandoned'

/**
 * Metric value type (for flexible metric handling)
 */
export type MetricValue = string | number | null | undefined

/**
 * Grouped cardio sessions (by date, equipment, etc.)
 */
export interface GroupedCardioSessions {
  [key: string]: LoggedCardioSession[]
}

/**
 * Cardio stats summary
 */
export interface CardioStats {
  totalSessions: number
  totalDuration: number // minutes
  totalDistance: number // miles or km
  totalCalories: number
  avgHR: number | null
  peakHR: number | null
  equipmentBreakdown: Record<CardioEquipment, number>
  zoneBreakdown: Record<IntensityZone, number>
}

// ============================================
// FILTER & SORT TYPES
// ============================================

/**
 * Filter options for cardio history
 */
export interface CardioHistoryFilters {
  equipment?: CardioEquipment[]
  intensityZone?: IntensityZone[]
  dateFrom?: Date
  dateTo?: Date
  minDuration?: number
  maxDuration?: number
}

/**
 * Sort options for cardio history
 */
export type CardioHistorySortField = 'completedAt' | 'duration' | 'distance' | 'calories'
export type CardioHistorySortOrder = 'asc' | 'desc'

export interface CardioHistorySort {
  field: CardioHistorySortField
  order: CardioHistorySortOrder
}
