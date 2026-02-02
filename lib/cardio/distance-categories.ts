/**
 * Cardio Distance Categories
 *
 * Maps cardio equipment types to user-friendly categories for distance aggregation
 */

import { CardioEquipment } from './equipment-profiles'

export type CardioDistanceCategory =
  | 'running'
  | 'biking'
  | 'rowing'
  | 'swimming'
  | 'all'

export const CARDIO_CATEGORY_LABELS: Record<CardioDistanceCategory, string> = {
  running: 'Running',
  biking: 'Biking',
  rowing: 'Rowing',
  swimming: 'Swimming',
  all: 'All Cardio'
}

/**
 * Map categories to their equipment types
 */
export const CATEGORY_EQUIPMENT_MAP: Record<CardioDistanceCategory, CardioEquipment[]> = {
  running: [
    'treadmill',
    'outdoor_run',
    'track_run',
    'trail_run',
    'walking',
    'hiking'
  ],
  biking: [
    'stationary_bike',
    'spin_bike',
    'air_bike',
    'recumbent_bike',
    'road_bike',
    'mountain_bike'
  ],
  rowing: [
    'rower',
    'ski_erg'
  ],
  swimming: [
    'pool_swim',
    'open_water_swim'
  ],
  all: [
    // Running
    'treadmill',
    'outdoor_run',
    'track_run',
    'trail_run',
    'walking',
    'hiking',
    // Biking
    'stationary_bike',
    'spin_bike',
    'air_bike',
    'recumbent_bike',
    'road_bike',
    'mountain_bike',
    // Rowing
    'rower',
    'ski_erg',
    // Swimming
    'pool_swim',
    'open_water_swim',
    // Other distance-based
    'sled_push',
    'sled_pull'
  ]
}

/**
 * Get equipment types for a given category
 */
export function getEquipmentForCategory(category: CardioDistanceCategory): CardioEquipment[] {
  return CATEGORY_EQUIPMENT_MAP[category] || CATEGORY_EQUIPMENT_MAP.all
}
