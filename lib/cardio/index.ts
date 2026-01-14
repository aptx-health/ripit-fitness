/**
 * Cardio Module
 *
 * Centralized exports for all cardio-related utilities, types, and constants.
 */

// Equipment profiles and metadata
export {
  EQUIPMENT_PROFILES,
  EQUIPMENT_LABELS,
  INTENSITY_ZONE_LABELS,
  METRIC_LABELS,
  METRIC_UNITS,
  getMetricsForEquipment,
  getPrimaryMetrics,
  getSecondaryMetrics,
  getAllMetrics,
  isMetricRelevantForEquipment
} from './equipment-profiles'

// Types
export type {
  CardioEquipment,
  IntensityZone,
  CardioMetric,
  EquipmentProfile
} from './equipment-profiles'

export type {
  CardioMath,
  CardioWeekWithSessions,
  CardioMathWithWeeks,
  PrescribedCardioSessionWithLogs,
  CardioWeekWithSessionsAndLogs,
  LogCardioSessionRequest,
  LogCardioSessionResponse,
  SaveMetricPreferencesRequest,
  MetricPreferencesResponse,
  GetMetricsResponse,
  CreateCardioProgramRequest,
  CardioProgramResponse,
  CardioSessionFormState,
  ValidationResult,
  CardioSessionStatus,
  MetricValue,
  GroupedCardioSessions,
  CardioStats,
  CardioHistoryFilters,
  CardioHistorySortField,
  CardioHistorySortOrder,
  CardioHistorySort
} from './types'

export { INITIAL_CARDIO_FORM_STATE } from './types'

// Validation utilities
export {
  validateCardioSessionForm,
  formStateToRequest,
  isValidEquipment,
  isValidIntensityZone,
  sanitizeString,
  safeParseInt,
  safeParseFloat
} from './validation'
