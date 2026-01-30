/**
 * Cardio Equipment Profiles
 *
 * Defines default metric profiles (primary + secondary) for each equipment type.
 * See docs/CARDIO_EQUIPMENT_PROFILES.md for complete reference.
 */

// ============================================
// TYPES & ENUMS
// ============================================

export type CardioEquipment =
  // Bikes
  | 'stationary_bike'
  | 'spin_bike'
  | 'air_bike'
  | 'recumbent_bike'
  | 'road_bike'
  | 'mountain_bike'

  // Running/Walking
  | 'treadmill'
  | 'outdoor_run'
  | 'track_run'
  | 'trail_run'
  | 'walking'
  | 'hiking'

  // Rowing/Skiing
  | 'rower'
  | 'ski_erg'

  // Elliptical/Steppers
  | 'elliptical'
  | 'stairmaster'
  | 'stair_climber'
  | 'stepper'

  // Swimming
  | 'pool_swim'
  | 'open_water_swim'

  // Other
  | 'jump_rope'
  | 'battle_ropes'
  | 'sled_push'
  | 'sled_pull'
  | 'other'

export type IntensityZone =
  | 'zone1'  // Recovery: 50-60% max HR
  | 'zone2'  // Endurance: 60-70% max HR
  | 'zone3'  // Tempo: 70-80% max HR
  | 'zone4'  // Threshold: 80-90% max HR
  | 'zone5'  // VO2 Max: 90-100% max HR
  | 'hiit'   // High-Intensity Interval Training
  | 'sprint' // All-out effort

export type CardioMetric =
  // Required
  | 'duration'
  | 'name'
  | 'equipment'

  // Heart Rate
  | 'avgHR'
  | 'peakHR'

  // Power
  | 'avgPower'
  | 'peakPower'

  // Distance & Elevation
  | 'distance'
  | 'elevationGain'
  | 'elevationLoss'

  // Pace & Cadence
  | 'avgPace'
  | 'cadence'

  // Rowing/Swimming Specific
  | 'strokeRate'
  | 'strokeCount'

  // General
  | 'calories'

  // Context
  | 'intensityZone'
  | 'intervalStructure'
  | 'notes'

export interface EquipmentProfile {
  primary: CardioMetric[]    // Almost always logged
  secondary: CardioMetric[]  // Commonly logged
}

// ============================================
// EQUIPMENT METRIC PROFILES
// ============================================

export const EQUIPMENT_PROFILES: Record<CardioEquipment, EquipmentProfile> = {
  // Bikes
  stationary_bike: {
    primary: ['duration'],
    secondary: ['distance', 'avgPower', 'calories', 'avgHR', 'cadence']
  },

  spin_bike: {
    primary: ['duration'],
    secondary: ['distance', 'avgPower', 'cadence', 'calories', 'avgHR']
  },

  air_bike: {
    primary: ['duration'],
    secondary: ['avgPower', 'peakPower', 'calories', 'avgHR', 'peakHR']
  },

  recumbent_bike: {
    primary: ['duration'],
    secondary: ['distance', 'calories', 'avgHR']
  },

  road_bike: {
    primary: ['duration', 'distance'],
    secondary: ['avgPace', 'elevationGain', 'avgHR', 'cadence']
  },

  mountain_bike: {
    primary: ['duration', 'distance'],
    secondary: ['elevationGain', 'elevationLoss', 'avgHR']
  },

  // Running/Walking
  outdoor_run: {
    primary: ['duration', 'distance'],
    secondary: ['avgPace', 'elevationGain', 'avgHR', 'peakHR']
  },

  track_run: {
    primary: ['duration', 'distance'],
    secondary: ['avgPace', 'avgHR', 'peakHR']
  },

  trail_run: {
    primary: ['duration', 'distance'],
    secondary: ['avgPace', 'elevationGain', 'elevationLoss', 'avgHR']
  },

  treadmill: {
    primary: ['duration', 'distance'],
    secondary: ['avgPace', 'elevationGain', 'avgHR', 'calories']
  },

  walking: {
    primary: ['duration', 'distance'],
    secondary: ['avgPace', 'avgHR']
  },

  hiking: {
    primary: ['duration', 'distance'],
    secondary: ['elevationGain', 'elevationLoss', 'avgHR']
  },

  // Rowing/Skiing
  rower: {
    primary: ['duration', 'distance'],
    secondary: ['avgPower', 'peakPower', 'strokeRate', 'calories', 'avgHR']
  },

  ski_erg: {
    primary: ['duration', 'distance'],
    secondary: ['avgPower', 'peakPower', 'calories', 'strokeRate']
  },

  // Elliptical/Steppers
  elliptical: {
    primary: ['duration'],
    secondary: ['calories', 'avgHR', 'peakHR']
  },

  stairmaster: {
    primary: ['duration'],
    secondary: ['elevationGain', 'calories', 'avgHR']
  },

  stair_climber: {
    primary: ['duration'],
    secondary: ['elevationGain', 'calories', 'avgHR']
  },

  stepper: {
    primary: ['duration'],
    secondary: ['calories', 'avgHR']
  },

  // Swimming
  pool_swim: {
    primary: ['duration', 'distance'],
    secondary: ['strokeCount', 'strokeRate', 'calories']
  },

  open_water_swim: {
    primary: ['duration', 'distance'],
    secondary: ['calories', 'avgHR']
  },

  // Other
  jump_rope: {
    primary: ['duration'],
    secondary: ['calories', 'avgHR', 'peakHR']
  },

  battle_ropes: {
    primary: ['duration'],
    secondary: ['calories', 'avgHR', 'peakHR']
  },

  sled_push: {
    primary: ['duration', 'distance'],
    secondary: ['avgPower', 'peakPower', 'calories']
  },

  sled_pull: {
    primary: ['duration', 'distance'],
    secondary: ['avgPower', 'peakPower', 'calories']
  },

  other: {
    primary: ['duration'],
    secondary: ['calories', 'avgHR']
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safely get equipment profile, falling back to 'other' if not found
 */
function getProfile(equipment: CardioEquipment): EquipmentProfile {
  return EQUIPMENT_PROFILES[equipment] ?? EQUIPMENT_PROFILES.other
}

/**
 * Get metrics for equipment (either custom user preferences or default profile)
 * @param equipment - CardioEquipment type
 * @param userPreferences - Optional user custom metrics
 * @returns Array of metric names to display
 */
export function getMetricsForEquipment(
  equipment: CardioEquipment,
  userPreferences?: CardioMetric[]
): CardioMetric[] {
  if (userPreferences && userPreferences.length > 0) {
    return userPreferences
  }

  const profile = getProfile(equipment)
  return [...profile.primary, ...profile.secondary]
}

/**
 * Get primary metrics for equipment
 * @param equipment - CardioEquipment type
 * @returns Array of primary metric names
 */
export function getPrimaryMetrics(equipment: CardioEquipment): CardioMetric[] {
  return getProfile(equipment).primary
}

/**
 * Get secondary metrics for equipment
 * @param equipment - CardioEquipment type
 * @returns Array of secondary metric names
 */
export function getSecondaryMetrics(equipment: CardioEquipment): CardioMetric[] {
  return getProfile(equipment).secondary
}

/**
 * Get all available metrics (for "Modify Fields" dialog)
 * @returns Array of all possible metric names
 */
export function getAllMetrics(): CardioMetric[] {
  return [
    'duration',
    'distance',
    'avgHR',
    'peakHR',
    'avgPower',
    'peakPower',
    'elevationGain',
    'elevationLoss',
    'avgPace',
    'cadence',
    'strokeRate',
    'strokeCount',
    'calories',
    'intensityZone',
    'intervalStructure',
    'notes'
  ]
}

/**
 * Check if a metric is relevant for given equipment
 * Helps filter out irrelevant metrics in UI
 * @param equipment - CardioEquipment type
 * @param metric - Metric to check
 * @returns True if metric is relevant for this equipment
 */
export function isMetricRelevantForEquipment(
  equipment: CardioEquipment,
  metric: CardioMetric
): boolean {
  // Duration is always relevant
  if (metric === 'duration' || metric === 'name' || metric === 'equipment') {
    return true
  }

  // Context fields always relevant
  if (metric === 'intensityZone' || metric === 'intervalStructure' || metric === 'notes') {
    return true
  }

  const profile = EQUIPMENT_PROFILES[equipment]
  return [...profile.primary, ...profile.secondary].includes(metric)
}

// ============================================
// EQUIPMENT METADATA
// ============================================

/**
 * Human-readable labels for equipment types
 */
export const EQUIPMENT_LABELS: Record<CardioEquipment, string> = {
  stationary_bike: 'Stationary Bike',
  spin_bike: 'Spin Bike',
  air_bike: 'Air Bike',
  recumbent_bike: 'Recumbent Bike',
  road_bike: 'Road Bike',
  mountain_bike: 'Mountain Bike',
  treadmill: 'Treadmill',
  outdoor_run: 'Outdoor Run',
  track_run: 'Track Run',
  trail_run: 'Trail Run',
  walking: 'Walking',
  hiking: 'Hiking',
  rower: 'Rower',
  ski_erg: 'Ski Erg',
  elliptical: 'Elliptical',
  stairmaster: 'Stairmaster',
  stair_climber: 'Stair Climber',
  stepper: 'Stepper',
  pool_swim: 'Pool Swim',
  open_water_swim: 'Open Water Swim',
  jump_rope: 'Jump Rope',
  battle_ropes: 'Battle Ropes',
  sled_push: 'Sled Push',
  sled_pull: 'Sled Pull',
  other: 'Other'
}

/**
 * Human-readable labels for intensity zones
 */
export const INTENSITY_ZONE_LABELS: Record<IntensityZone, string> = {
  zone1: 'Zone 1 (Recovery)',
  zone2: 'Zone 2 (Endurance)',
  zone3: 'Zone 3 (Tempo)',
  zone4: 'Zone 4 (Threshold)',
  zone5: 'Zone 5 (VO2 Max)',
  hiit: 'HIIT',
  sprint: 'Sprint'
}

/**
 * Human-readable labels for metrics
 */
export const METRIC_LABELS: Record<CardioMetric, string> = {
  duration: 'Duration',
  name: 'Name',
  equipment: 'Equipment',
  avgHR: 'Avg HR',
  peakHR: 'Peak HR',
  avgPower: 'Avg Power',
  peakPower: 'Peak Power',
  distance: 'Distance',
  elevationGain: 'Elevation Gain',
  elevationLoss: 'Elevation Loss',
  avgPace: 'Avg Pace',
  cadence: 'Cadence',
  strokeRate: 'Stroke Rate',
  strokeCount: 'Stroke Count',
  calories: 'Calories',
  intensityZone: 'Intensity Zone',
  intervalStructure: 'Interval Structure',
  notes: 'Notes'
}

/**
 * Units for metrics (for display purposes)
 */
export const METRIC_UNITS: Partial<Record<CardioMetric, string>> = {
  duration: 'min',
  avgHR: 'bpm',
  peakHR: 'bpm',
  avgPower: 'W',
  peakPower: 'W',
  distance: 'mi', // or 'km' based on user preference
  elevationGain: 'ft', // or 'm' based on user preference
  elevationLoss: 'ft', // or 'm' based on user preference
  avgPace: '/mi', // or '/km'
  cadence: 'rpm', // or 'spm' (steps per minute for running)
  strokeRate: 'spm',
  strokeCount: 'strokes',
  calories: 'kcal'
}
