# Cardio Equipment Metric Profiles

**Reference for Implementation**

This document defines the default primary and secondary metrics for each equipment type. These are used when users first log a cardio session for a given equipment type.

---

## Usage

When user selects equipment during logging:
1. Check if user has custom preferences: `UserCardioMetricPreferences` for this equipment
2. If yes → use custom metrics
3. If no → use profile below (primary + secondary)

---

## Equipment Profiles

### Bikes

#### stationary_bike
- **Primary**: duration
- **Secondary**: distance, avgPower, calories, avgHR, cadence

#### spin_bike
- **Primary**: duration
- **Secondary**: distance, avgPower, cadence, calories, avgHR

#### air_bike
- **Primary**: duration
- **Secondary**: avgPower, peakPower, calories, avgHR, peakHR

#### recumbent_bike
- **Primary**: duration
- **Secondary**: distance, calories, avgHR

#### road_bike
- **Primary**: duration, distance
- **Secondary**: avgPace, elevationGain, avgHR, cadence

#### mountain_bike
- **Primary**: duration, distance
- **Secondary**: elevationGain, elevationLoss, avgHR

---

### Running/Walking

#### outdoor_run
- **Primary**: duration, distance
- **Secondary**: avgPace, elevationGain, avgHR, peakHR

#### track_run
- **Primary**: duration, distance
- **Secondary**: avgPace, avgHR, peakHR

#### trail_run
- **Primary**: duration, distance
- **Secondary**: avgPace, elevationGain, elevationLoss, avgHR

#### treadmill
- **Primary**: duration, distance
- **Secondary**: avgPace, elevationGain, avgHR, calories

#### walking
- **Primary**: duration, distance
- **Secondary**: avgPace, avgHR

#### hiking
- **Primary**: duration, distance
- **Secondary**: elevationGain, elevationLoss, avgHR

---

### Rowing/Skiing

#### rower
- **Primary**: duration, distance
- **Secondary**: avgPower, peakPower, strokeRate, calories, avgHR

#### ski_erg
- **Primary**: duration, distance
- **Secondary**: avgPower, peakPower, calories, strokeRate

---

### Elliptical/Steppers

#### elliptical
- **Primary**: duration
- **Secondary**: calories, avgHR, peakHR

#### stairmaster
- **Primary**: duration
- **Secondary**: elevationGain, calories, avgHR

#### stair_climber
- **Primary**: duration
- **Secondary**: elevationGain, calories, avgHR

#### stepper
- **Primary**: duration
- **Secondary**: calories, avgHR

---

### Swimming

#### pool_swim
- **Primary**: duration, distance
- **Secondary**: strokeCount, strokeRate, calories

#### open_water_swim
- **Primary**: duration, distance
- **Secondary**: calories, avgHR

---

### Other

#### jump_rope
- **Primary**: duration
- **Secondary**: calories, avgHR, peakHR

#### battle_ropes
- **Primary**: duration
- **Secondary**: calories, avgHR, peakHR

#### sled_push
- **Primary**: duration, distance
- **Secondary**: avgPower, peakPower, calories

#### sled_pull
- **Primary**: duration, distance
- **Secondary**: avgPower, peakPower, calories

#### other
- **Primary**: duration
- **Secondary**: calories, avgHR

---

## Metric Definitions

### Always Available
- **duration** (Int): Minutes (required for all sessions)
- **name** (String): Session name (required)
- **equipment** (String): Equipment type (required)
- **status** (String): completed/incomplete/abandoned (required)

### Optional Metrics

#### Heart Rate
- **avgHR** (Int): Average heart rate (bpm)
- **peakHR** (Int): Peak heart rate (bpm)

#### Power
- **avgPower** (Int): Average power (watts)
- **peakPower** (Int): Peak power (watts)

#### Distance & Elevation
- **distance** (Float): Distance covered (miles or km)
- **elevationGain** (Int): Elevation gained (feet or meters)
- **elevationLoss** (Int): Elevation lost (feet or meters)

#### Pace & Cadence
- **avgPace** (String): Average pace ("8:30/mi" or "5:20/km")
- **cadence** (Int): Cadence - RPM for cycling, steps/min for running

#### Rowing/Swimming Specific
- **strokeRate** (Int): Strokes per minute
- **strokeCount** (Int): Total strokes

#### General
- **calories** (Int): Total calories burned

#### Context
- **intensityZone** (String): zone1-5, hiit, sprint
- **intervalStructure** (String): "8x30s/90s" for HIIT
- **notes** (String): Freeform notes

---

## Implementation Example

```typescript
// lib/cardio/equipment-profiles.ts

export const EQUIPMENT_PROFILES: Record<CardioEquipment, {
  primary: string[];
  secondary: string[];
}> = {
  rower: {
    primary: ['duration', 'distance'],
    secondary: ['avgPower', 'peakPower', 'strokeRate', 'calories', 'avgHR']
  },
  outdoor_run: {
    primary: ['duration', 'distance'],
    secondary: ['avgPace', 'elevationGain', 'avgHR', 'peakHR']
  },
  // ... etc
};

// Get metrics for equipment
export function getMetricsForEquipment(
  equipment: CardioEquipment,
  userPreferences?: string[]
): string[] {
  if (userPreferences) {
    return userPreferences;
  }

  const profile = EQUIPMENT_PROFILES[equipment];
  return [...profile.primary, ...profile.secondary];
}
```

---

## UI Considerations

### Form Layout

**Primary Metrics**: Show at top, slightly emphasized
**Secondary Metrics**: Show below, normal styling
**All Other Metrics**: Available via "Modify Fields" button

### Example: Rowing Form

```
┌─────────────────────────────────┐
│ Log Cardio Session              │
├─────────────────────────────────┤
│ Equipment: Rower ▼              │
│                                 │
│ Primary Fields:                 │
│ Duration*: [___] minutes        │
│ Distance:  [___] meters         │
│                                 │
│ Secondary Fields:               │
│ Avg Power:    [___] watts       │
│ Peak Power:   [___] watts       │
│ Stroke Rate:  [___] spm         │
│ Calories:     [___] kcal        │
│ Avg HR:       [___] bpm         │
│                                 │
│ [⚙ Modify Fields]              │
│                                 │
│ Context:                        │
│ Intensity Zone: [zone2 ▼]      │
│ Notes: [_______________]        │
│                                 │
│ [Cancel] [Save Session]         │
└─────────────────────────────────┘
```

### Modify Fields Dialog

```
┌─────────────────────────────────┐
│ Customize Metrics for Rower    │
├─────────────────────────────────┤
│ Select which metrics to track: │
│                                 │
│ ☑ Duration (required)           │
│ ☑ Distance                      │
│ ☑ Avg Power                     │
│ ☑ Stroke Rate                   │
│ ☐ Peak Power                    │
│ ☐ Calories                      │
│ ☐ Avg HR                        │
│ ☐ Peak HR                       │
│ ☐ Elevation Gain                │
│ ☐ Cadence                       │
│ ☐ ... (all metrics)             │
│                                 │
│ ☑ Save as default for Rower    │
│                                 │
│ [Reset to Defaults] [Save]      │
└─────────────────────────────────┘
```

---

## Notes

- **Duration is always required** - it's the minimum viable data point
- **Primary metrics** should be the bare minimum for useful tracking
- **Secondary metrics** are commonly tracked but not essential
- **Equipment type determines relevant metrics** (e.g., strokeRate only relevant for rowing/swimming)
- **Users can always customize** - these are just sensible defaults
- **No prompts or learning curves** - user sees defaults immediately, can modify if desired
