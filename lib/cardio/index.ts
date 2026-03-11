/**
 * Cardio Module
 *
 * Centralized exports for all cardio-related utilities, types, and constants.
 */


// Types
export type {
  CardioEquipment,
  CardioMetric,
  EquipmentProfile, 
  IntensityZone
} from './equipment-profiles'
// Equipment profiles and metadata
export {
  EQUIPMENT_LABELS,
  EQUIPMENT_PROFILES,
  getAllMetrics,
  getMetricsForEquipment,
  getPrimaryMetrics,
  getSecondaryMetrics,
  INTENSITY_ZONE_LABELS,
  isMetricRelevantForEquipment, 
  METRIC_LABELS,
  METRIC_UNITS
} from './equipment-profiles'

export type {
  CardioHistoryFilters,
  CardioHistorySort, 
  CardioHistorySortField,
  CardioHistorySortOrder,
  CardioMath,
  CardioMathWithWeeks,
  CardioProgramResponse,
  CardioSessionFormState,
  CardioSessionStatus,
  CardioStats,
  CardioWeekWithSessions,
  CardioWeekWithSessionsAndLogs,
  CreateCardioProgramRequest,
  GetMetricsResponse,
  GroupedCardioSessions,
  LogCardioSessionRequest,
  LogCardioSessionResponse,
  MetricPreferencesResponse,
  MetricValue,
  PrescribedCardioSessionWithLogs,
  SaveMetricPreferencesRequest,
  ValidationResult
} from './types'

export { INITIAL_CARDIO_FORM_STATE } from './types'

// Validation utilities
export {
  formStateToRequest,
  isValidEquipment,
  isValidIntensityZone,
  normalizeEquipment,
  safeParseFloat, 
  safeParseInt,
  sanitizeString,
  validateCardioSessionForm
} from './validation'
