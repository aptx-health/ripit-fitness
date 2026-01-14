/**
 * Cardio Validation Utilities
 *
 * Validation functions for cardio session forms and data.
 */

import type { CardioSessionFormState, ValidationResult, LogCardioSessionRequest } from './types'
import type { CardioEquipment, IntensityZone } from './equipment-profiles'

// ============================================
// VALIDATION CONSTANTS
// ============================================

const MIN_DURATION = 1 // minutes
const MAX_DURATION = 1440 // 24 hours
const MIN_HR = 30
const MAX_HR = 250
const MIN_POWER = 0
const MAX_POWER = 10000 // watts
const MIN_DISTANCE = 0.01
const MAX_DISTANCE = 1000 // miles/km
const MIN_ELEVATION = -1000 // feet/meters (death valley)
const MAX_ELEVATION = 50000 // feet/meters

// ============================================
// FORM VALIDATION
// ============================================

/**
 * Validate cardio session form
 * @param formState - Form state to validate
 * @returns Validation result with errors
 */
export function validateCardioSessionForm(
  formState: CardioSessionFormState
): ValidationResult {
  const errors: Record<string, string> = {}

  // Required fields
  if (!formState.name || formState.name.trim() === '') {
    errors.name = 'Session name is required'
  }

  if (!formState.equipment) {
    errors.equipment = 'Equipment is required'
  }

  if (!formState.duration || formState.duration.trim() === '') {
    errors.duration = 'Duration is required'
  } else {
    const duration = parseFloat(formState.duration)
    if (isNaN(duration) || duration < MIN_DURATION) {
      errors.duration = `Duration must be at least ${MIN_DURATION} minute`
    } else if (duration > MAX_DURATION) {
      errors.duration = `Duration cannot exceed ${MAX_DURATION} minutes (24 hours)`
    }
  }

  // Optional fields - validate only if provided
  if (formState.avgHR && formState.avgHR.trim() !== '') {
    const avgHR = parseInt(formState.avgHR)
    if (isNaN(avgHR) || avgHR < MIN_HR || avgHR > MAX_HR) {
      errors.avgHR = `Average HR must be between ${MIN_HR}-${MAX_HR} bpm`
    }
  }

  if (formState.peakHR && formState.peakHR.trim() !== '') {
    const peakHR = parseInt(formState.peakHR)
    if (isNaN(peakHR) || peakHR < MIN_HR || peakHR > MAX_HR) {
      errors.peakHR = `Peak HR must be between ${MIN_HR}-${MAX_HR} bpm`
    }
  }

  // Validate peak HR >= avg HR if both provided
  if (formState.avgHR && formState.peakHR) {
    const avgHR = parseInt(formState.avgHR)
    const peakHR = parseInt(formState.peakHR)
    if (!isNaN(avgHR) && !isNaN(peakHR) && peakHR < avgHR) {
      errors.peakHR = 'Peak HR cannot be less than average HR'
    }
  }

  if (formState.avgPower && formState.avgPower.trim() !== '') {
    const avgPower = parseInt(formState.avgPower)
    if (isNaN(avgPower) || avgPower < MIN_POWER || avgPower > MAX_POWER) {
      errors.avgPower = `Average power must be between ${MIN_POWER}-${MAX_POWER}W`
    }
  }

  if (formState.peakPower && formState.peakPower.trim() !== '') {
    const peakPower = parseInt(formState.peakPower)
    if (isNaN(peakPower) || peakPower < MIN_POWER || peakPower > MAX_POWER) {
      errors.peakPower = `Peak power must be between ${MIN_POWER}-${MAX_POWER}W`
    }
  }

  // Validate peak power >= avg power if both provided
  if (formState.avgPower && formState.peakPower) {
    const avgPower = parseInt(formState.avgPower)
    const peakPower = parseInt(formState.peakPower)
    if (!isNaN(avgPower) && !isNaN(peakPower) && peakPower < avgPower) {
      errors.peakPower = 'Peak power cannot be less than average power'
    }
  }

  if (formState.distance && formState.distance.trim() !== '') {
    const distance = parseFloat(formState.distance)
    if (isNaN(distance) || distance < MIN_DISTANCE || distance > MAX_DISTANCE) {
      errors.distance = `Distance must be between ${MIN_DISTANCE}-${MAX_DISTANCE}`
    }
  }

  if (formState.elevationGain && formState.elevationGain.trim() !== '') {
    const elevationGain = parseInt(formState.elevationGain)
    if (isNaN(elevationGain) || elevationGain < 0 || elevationGain > MAX_ELEVATION) {
      errors.elevationGain = `Elevation gain must be between 0-${MAX_ELEVATION}`
    }
  }

  if (formState.elevationLoss && formState.elevationLoss.trim() !== '') {
    const elevationLoss = parseInt(formState.elevationLoss)
    if (isNaN(elevationLoss) || elevationLoss < 0 || elevationLoss > MAX_ELEVATION) {
      errors.elevationLoss = `Elevation loss must be between 0-${MAX_ELEVATION}`
    }
  }

  if (formState.cadence && formState.cadence.trim() !== '') {
    const cadence = parseInt(formState.cadence)
    if (isNaN(cadence) || cadence < 0 || cadence > 500) {
      errors.cadence = 'Cadence must be between 0-500'
    }
  }

  if (formState.strokeRate && formState.strokeRate.trim() !== '') {
    const strokeRate = parseInt(formState.strokeRate)
    if (isNaN(strokeRate) || strokeRate < 0 || strokeRate > 200) {
      errors.strokeRate = 'Stroke rate must be between 0-200 spm'
    }
  }

  if (formState.strokeCount && formState.strokeCount.trim() !== '') {
    const strokeCount = parseInt(formState.strokeCount)
    if (isNaN(strokeCount) || strokeCount < 0) {
      errors.strokeCount = 'Stroke count must be a positive number'
    }
  }

  if (formState.calories && formState.calories.trim() !== '') {
    const calories = parseInt(formState.calories)
    if (isNaN(calories) || calories < 0 || calories > 10000) {
      errors.calories = 'Calories must be between 0-10000'
    }
  }

  // Pace validation (flexible format: "8:30", "8:30/mi", "5:20/km")
  if (formState.avgPace && formState.avgPace.trim() !== '') {
    const pacePattern = /^\d{1,2}:\d{2}(\/mi|\/km)?$/
    if (!pacePattern.test(formState.avgPace.trim())) {
      errors.avgPace = 'Pace format: "8:30" or "8:30/mi" or "5:20/km"'
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// ============================================
// DATA CONVERSION
// ============================================

/**
 * Convert form state to API request
 * @param formState - Form state
 * @returns LogCardioSessionRequest
 */
export function formStateToRequest(
  formState: CardioSessionFormState
): LogCardioSessionRequest {
  return {
    name: formState.name.trim(),
    equipment: formState.equipment!,
    duration: parseInt(formState.duration),

    // Optional metrics - only include if provided
    ...(formState.avgHR && { avgHR: parseInt(formState.avgHR) }),
    ...(formState.peakHR && { peakHR: parseInt(formState.peakHR) }),
    ...(formState.avgPower && { avgPower: parseInt(formState.avgPower) }),
    ...(formState.peakPower && { peakPower: parseInt(formState.peakPower) }),
    ...(formState.distance && { distance: parseFloat(formState.distance) }),
    ...(formState.elevationGain && { elevationGain: parseInt(formState.elevationGain) }),
    ...(formState.elevationLoss && { elevationLoss: parseInt(formState.elevationLoss) }),
    ...(formState.avgPace && { avgPace: formState.avgPace.trim() }),
    ...(formState.cadence && { cadence: parseInt(formState.cadence) }),
    ...(formState.strokeRate && { strokeRate: parseInt(formState.strokeRate) }),
    ...(formState.strokeCount && { strokeCount: parseInt(formState.strokeCount) }),
    ...(formState.calories && { calories: parseInt(formState.calories) }),

    // Context
    ...(formState.intensityZone && { intensityZone: formState.intensityZone }),
    ...(formState.intervalStructure && { intervalStructure: formState.intervalStructure.trim() }),
    ...(formState.notes && { notes: formState.notes.trim() }),
    status: formState.status
  }
}

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Check if value is valid CardioEquipment
 * @param value - Value to check
 * @returns True if valid equipment type
 */
export function isValidEquipment(value: string): value is CardioEquipment {
  const validEquipment: CardioEquipment[] = [
    'stationary_bike', 'spin_bike', 'air_bike', 'recumbent_bike', 'road_bike', 'mountain_bike',
    'treadmill', 'outdoor_run', 'track_run', 'trail_run', 'walking', 'hiking',
    'rower', 'ski_erg',
    'elliptical', 'stairmaster', 'stair_climber', 'stepper',
    'pool_swim', 'open_water_swim',
    'jump_rope', 'battle_ropes', 'sled_push', 'sled_pull', 'other'
  ]
  return validEquipment.includes(value as CardioEquipment)
}

/**
 * Check if value is valid IntensityZone
 * @param value - Value to check
 * @returns True if valid intensity zone
 */
export function isValidIntensityZone(value: string): value is IntensityZone {
  const validZones: IntensityZone[] = ['zone1', 'zone2', 'zone3', 'zone4', 'zone5', 'hiit', 'sprint']
  return validZones.includes(value as IntensityZone)
}

// ============================================
// SANITIZATION
// ============================================

/**
 * Sanitize string input (trim, prevent XSS)
 * @param value - Input value
 * @returns Sanitized string
 */
export function sanitizeString(value: string): string {
  return value.trim().replace(/[<>]/g, '')
}

/**
 * Parse numeric input safely
 * @param value - Input value
 * @param defaultValue - Default if invalid
 * @returns Parsed number or default
 */
export function safeParseInt(value: string, defaultValue: number = 0): number {
  const parsed = parseInt(value)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Parse float input safely
 * @param value - Input value
 * @param defaultValue - Default if invalid
 * @returns Parsed float or default
 */
export function safeParseFloat(value: string, defaultValue: number = 0): number {
  const parsed = parseFloat(value)
  return isNaN(parsed) ? defaultValue : parsed
}
