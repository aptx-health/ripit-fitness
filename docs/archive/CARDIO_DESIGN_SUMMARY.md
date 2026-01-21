# Cardio Feature Design - Summary

**Date**: 2026-01-13
**Status**: Design Complete - Ready for Implementation

---

## Quick Overview

We've designed a comprehensive cardio tracking feature for FitCSV that balances structure and flexibility. The design mirrors strength training patterns while addressing the unique needs of cardio activities.

---

## Core Architecture

### Data Model (4 main tables + 1 preferences table)

```
CardioProgram (one active per user)
└── CardioWeek
    └── PrescribedCardioSession
        └── LoggedCardioSession (optional link, serves as completion + data)

UserCardioMetricPreferences (per-equipment metric customization)
```

**Key Differences from Strength**:
- Session is atomic (no workout container)
- Session-level metrics only (no interval granularity)
- LoggedCardioSession serves dual purpose (completion + data)
- Can log without program (prescribedSessionId optional)

---

## Key Features

### 1. Equipment Types (26 total)
- Bikes: stationary, spin, air bike, recumbent
- Running/Walking: treadmill, outdoor, track, trail, walking, hiking
- Rowing/Skiing: rower, ski erg
- Elliptical/Steppers: elliptical, stairmaster, stair climber, stepper
- Swimming: pool, open water
- Other: jump rope, battle ropes, sled push/pull, mountain bike, road bike

### 2. Intensity Zones (7 total)
- zone1 through zone5 (standard HR zones)
- hiit, sprint

### 3. Comprehensive Metrics (15 optional fields)
**Heart Rate**: avgHR, peakHR
**Power**: avgPower, peakPower
**Distance & Elevation**: distance, elevationGain, elevationLoss
**Pace & Cadence**: avgPace, cadence
**Rowing/Swimming**: strokeRate, strokeCount
**General**: calories, duration (required)
**Context**: intensityZone, intervalStructure, notes

### 4. Smart Metric Defaults + User Customization

**The Problem**: Different cardio activities need different metrics. Users might forget what to log, causing inconsistent data.

**The Solution**:
- System provides equipment-specific defaults (primary + secondary metrics)
- Example: Rowing → primary: duration, distance | secondary: avgPower, strokeRate, calories
- User can customize which metrics they want per equipment
- UI shows "Modify Fields" button to add/remove metrics
- Preferences saved per equipment type
- "Reset to Defaults" available anytime

**Benefits**:
- ✅ Consistent data (same metrics each session)
- ✅ No cognitive load ("What do I usually track?")
- ✅ Analysis-ready (complete datasets for trends)
- ✅ Still flexible (can customize anytime)

---

## User Flows

### Ad-Hoc Logging (No Program)
1. User clicks "Log Cardio"
2. Selects equipment: "Outdoor Run"
3. Form shows: duration, distance (primary) + avgPace, elevationGain, avgHR (secondary)
4. User fills in: 30min, 3.5mi, 8:34/mi, 155 avgHR
5. Logs session → appears in history

### Following a Program
1. User has active "12-Week Zone 2 Program"
2. Views Week 1, Day 1: "Zone 2 Bike, 45min, target HR 140-150"
3. Clicks "Log Workout"
4. Form pre-fills from prescription: name, duration, zone, equipment
5. User logs actual metrics: 47min, 145 avgHR, 520 cals
6. Session linked to prescribed → checkmark appears

### Weather Pivot (Equipment Flexibility)
1. Prescribed: "45min outdoor run, Zone 2"
2. Day of: raining
3. User logs: Elliptical (changed), 45min, Zone 2, notes: "weather"
4. Still counts as completed → checkmark appears

### Metric Customization
1. User logs rowing for first time
2. Form shows defaults: duration, distance, avgPower, peakPower, strokeRate, calories, avgHR
3. User thinks: "I never track stroke rate"
4. Clicks "Modify Fields" → unchecks strokeRate
5. Saves preference
6. Next rowing session: Form shows customized metrics (no strokeRate)

---

## Implementation Phases

### Phase 1: Core Logging (MVP)
- Database schema + migrations
- Equipment metric profiles (defaults)
- API routes (log, history, metric preferences)
- UI: Log cardio modal with smart metrics
- Metric customization dialog

### Phase 2: Programs
- Create/edit cardio programs
- Week builder
- Active program management

### Phase 3: Completion Tracking
- Link logged to prescribed
- Checkmarks on completed sessions
- Status tracking (completed/incomplete/abandoned)

### Phase 4: CSV Import
- Import cardio programs from CSV
- Similar to strength import flow

### Phase 5: Enhanced Features
- Session comparison (prescribed vs actual)
- History filters
- Basic charts/trends

### Phase 6: Calendar (Future)
- Unified strength + cardio calendar
- Drag-drop scheduling
- Manual entries

---

## Database Tables

### CardioProgram
- Similar to Program (strength)
- One active per user
- Can archive

### CardioWeek
- weekNumber (1, 2, 3...)
- Belongs to CardioProgram

### PrescribedCardioSession
- dayNumber (position in week)
- name, description
- targetDuration (required)
- intensityZone, equipment (optional)
- targetHRRange, targetPowerRange, intervalStructure (guidance)
- notes

### LoggedCardioSession
- prescribedSessionId (optional FK)
- userId, completedAt, status
- name, equipment, duration (required)
- 15 optional metric fields
- intensityZone, intervalStructure, notes

### UserCardioMetricPreferences
- userId, equipment (unique together)
- customMetrics (array of metric names)
- Used to override system defaults

---

## Security

All tables have Row Level Security (RLS) policies:
- Users can only access their own programs
- Users can only access weeks from their programs
- Users can only access prescribed sessions from their programs
- Users can only access their own logged sessions
- Users can only access their own preferences

---

## LLM Readiness

Structured data enables future AI features:
- **Program Generation**: "Create 12-week Zone 2 program"
- **Analysis**: "Analyze my Zone 2 consistency"
- **Insights**: "Am I improving in HIIT?"
- **Adjustments**: "Should I adjust my Zone 2 target HR?"

---

## Design Decisions Summary

| Decision | Outcome |
|----------|---------|
| CSV Import? | Not in initial phase (may add later) |
| Interval tracking? | No - session level only |
| Cardio types? | One table, flexible (not typed) |
| Equipment? | Predefined list (26 types) |
| Intensity zones? | Standard HR zones (zone1-5, hiit, sprint) |
| Active programs? | One active cardio program (like strength) |
| Metric consistency? | System defaults + user customization |
| METs tracking? | No - skipped |
| Pace tracking? | Yes - stored as text ("8:30/mi") |
| Sprint? | Intensity zone (not equipment) |

---

## What Makes This Design Good

1. **Parallel to strength**: Familiar patterns for existing users
2. **Flexible execution**: Can deviate from plan (equipment, duration, etc.)
3. **Smart defaults**: No cognitive load, relevant metrics shown
4. **User control**: Can customize metrics per equipment
5. **Data consistency**: Same metrics tracked each session
6. **Simple implementation**: No over-engineering, clear scope
7. **LLM ready**: Structured data for future AI features
8. **Future proof**: Calendar integration planned

---

## Next Step: Implementation

Start with **Phase 1** (Core Logging):
1. Create Prisma migration
2. Define equipment metric profiles in code
3. Build API routes
4. Create logging UI with metric customization
5. Test ad-hoc logging flow

**Full design document**: `/Users/dustin/repos/fitcsv/docs/CARDIO_DESIGN.md`
