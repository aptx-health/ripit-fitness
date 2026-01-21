# Cardio Training Feature - Design Document

**Date**: 2026-01-13
**Status**: Design Phase
**Author**: Dustin (with Claude Code)

---

## Table of Contents
1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Data Model](#data-model)
4. [Equipment & Intensity Zones](#equipment--intensity-zones)
5. [Completion Tracking](#completion-tracking)
6. [Security (RLS Policies)](#security-rls-policies)
7. [Use Cases & Examples](#use-cases--examples)
8. [Comparison to Strength Training](#comparison-to-strength-training)
9. [Future Considerations](#future-considerations)
10. [Implementation Phases](#implementation-phases)

---

## Overview

FitCSV is expanding beyond strength training to include cardio training. The goal is to provide a **simple, flexible cardio tracking system** that complements the existing strength program architecture without adding unnecessary complexity.

### What We're Building
- Program-based cardio training (structured multi-week programs)
- Flexible ad-hoc cardio logging (log without a program)
- Session-level metrics (no interval-level granularity)
- Completion tracking aligned with strength training patterns

### What We're NOT Building
- Strava clone (no routes, GPS tracking, social features)
- Intense biometric analysis
- Granular interval-by-interval tracking
- Complex performance analytics

---

## Design Principles

1. **Structure when you want it, flexibility when you need it**
   - Users can create detailed multi-week programs
   - Users can also log ad-hoc sessions without any program

2. **Parallel to strength training architecture**
   - Similar patterns: Program → Week → Session
   - Prescribed vs Logged separation
   - One active program at a time

3. **Session-level metrics only**
   - No interval-by-interval tracking for HIIT
   - Duration + metrics tell the story

4. **Equipment flexibility**
   - Programs prescribe recommended equipment
   - Users can deviate during execution (bike → elliptical)

5. **LLM-ready**
   - Structured data for future AI-assisted program generation
   - Enables logged data analysis and insights

---

## Data Model

### Entity Relationship Diagram

```
User (Supabase Auth)
│
├─── CardioProgram (isActive: one per user)
│    └── CardioWeek (week 1, 2, 3...)
│         └── PrescribedCardioSession (day 1, 2, 3...)
│              └── LoggedCardioSession (optional reference)
│
└─── LoggedCardioSession (can exist independently)
```

### Schema Definitions

#### CardioProgram

```prisma
model CardioProgram {
  id            String    @id @default(cuid())
  name          String
  description   String?
  userId        String    // References auth.users in Supabase
  isActive      Boolean   @default(false)  // Only one active cardio program per user
  isArchived    Boolean   @default(false)
  archivedAt    DateTime?
  isUserCreated Boolean   @default(false)  // true for in-app, false for CSV imported
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  weeks CardioWeek[]

  @@index([userId, isActive])
  @@index([userId, isArchived])
}
```

**Notes**:
- Only one active cardio program per user (mirrors strength training)
- `isUserCreated` distinguishes in-app created programs from CSV imports
- `isArchived` allows hiding programs without deletion

#### CardioWeek

```prisma
model CardioWeek {
  id              String        @id @default(cuid())
  weekNumber      Int           // 1, 2, 3...
  cardioProgramId String
  cardioProgram   CardioProgram @relation(fields: [cardioProgramId], references: [id], onDelete: Cascade)

  sessions PrescribedCardioSession[]

  @@unique([cardioProgramId, weekNumber])
  @@index([cardioProgramId])
}
```

**Notes**:
- Separate from strength `Week` table (keeps cardio independent)
- Unique constraint on `cardioProgramId + weekNumber` prevents duplicates
- Cascade delete ensures cleanup when program deleted

#### PrescribedCardioSession

```prisma
model PrescribedCardioSession {
  id          String     @id @default(cuid())
  weekId      String
  week        CardioWeek @relation(fields: [weekId], references: [id], onDelete: Cascade)
  dayNumber   Int        // Position within week (1, 2, 3...)
  name        String     // "Zone 2 Endurance", "HIIT Intervals"
  description String?    // Freeform notes

  // Prescription details
  targetDuration     Int     // minutes (required)
  intensityZone      String? // "zone1", "zone2", "zone3", "zone4", "zone5", "hiit", "sprint"
  equipment          String? // CardioEquipment enum
  targetHRRange      String? // "140-150" (flexible text)
  targetPowerRange   String? // "150-180W" (flexible text)
  intervalStructure  String? // "8x30s/90s" for HIIT (freeform text)
  notes              String? // "If weather bad, use elliptical"

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  loggedSessions LoggedCardioSession[]

  @@unique([weekId, dayNumber])
  @@index([weekId])
}
```

**Notes**:
- `dayNumber` positions session within week (like strength workouts)
- `targetDuration` is required; everything else is optional guidance
- Text fields (`targetHRRange`, `targetPowerRange`, `intervalStructure`) provide flexibility
- `notes` field allows coaches/users to add context
- Unique constraint prevents duplicate days in a week

#### LoggedCardioSession

```prisma
model LoggedCardioSession {
  id                  String                   @id @default(cuid())
  prescribedSessionId String?                  // Optional link to prescribed session
  prescribedSession   PrescribedCardioSession? @relation(fields: [prescribedSessionId], references: [id])
  userId              String                   // References auth.users in Supabase
  completedAt         DateTime                 @default(now())
  status              String                   @default("completed") // "completed", "incomplete", "abandoned"

  // What you actually did
  name      String  // Copy from prescribed or user enters
  equipment String  // CardioEquipment enum (what actually used)
  duration  Int     // Actual minutes

  // Heart Rate Metrics
  avgHR  Int? // Average heart rate (bpm)
  peakHR Int? // Peak heart rate (bpm)

  // Power Metrics
  avgPower  Int? // Average power (watts)
  peakPower Int? // Peak power (watts)

  // Distance & Elevation
  distance       Float? // Distance (miles or km - user preference)
  elevationGain  Int?   // Elevation gained (feet or meters)
  elevationLoss  Int?   // Elevation lost (feet or meters)

  // Pace & Cadence
  avgPace String? // Average pace: "8:30/mi" or "5:20/km" (text)
  cadence Int?    // Cadence: RPM (cycling) or steps/min (running)

  // Rowing/Swimming Specific
  strokeRate  Int? // Strokes per minute
  strokeCount Int? // Total strokes

  // General
  calories Int? // Total calories burned

  // Context
  intensityZone     String? // What zone you aimed for
  intervalStructure String? // What you did for HIIT (e.g., "8x30s/90s")
  notes             String? // Freeform notes

  @@index([prescribedSessionId])
  @@index([userId, completedAt])
}
```

**Notes**:
- **Serves dual purpose**: Completion record AND logged data
- `prescribedSessionId` is **optional** - can log without program
- `status` field enables incomplete/abandoned tracking
- All metrics are optional - user logs what makes sense for their equipment
- Metrics organized by category for clarity
- `avgPace` stored as text for flexibility ("8:30/mi", "5:20/km", etc.)
- Equipment-specific metrics (strokeRate for rowing, elevationGain for hiking, etc.)
- `completedAt` indexed for chronological queries

---

## Equipment & Intensity Zones

### CardioEquipment Enum

```typescript
type CardioEquipment =
  // Bikes
  | "stationary_bike"
  | "spin_bike"
  | "air_bike"        // Assault Bike, Rogue Echo Bike
  | "recumbent_bike"

  // Running/Walking
  | "treadmill"
  | "outdoor_run"
  | "track_run"
  | "trail_run"
  | "walking"         // Casual/fitness walking
  | "hiking"          // Trail hiking

  // Rowing/Skiing
  | "rower"           // Concept2, etc.
  | "ski_erg"

  // Elliptical/Steppers
  | "elliptical"
  | "stairmaster"
  | "stair_climber"
  | "stepper"

  // Swimming
  | "pool_swim"
  | "open_water_swim"

  // Other
  | "jump_rope"
  | "battle_ropes"
  | "sled_push"
  | "sled_pull"
  | "mountain_bike"
  | "road_bike"
  | "other"
```

**Implementation**: Store as string in database, validate on API layer.

**Note**: "Sprint" is NOT an equipment type - it's an intensity zone. Sprint workouts use equipment like `track_run` or `air_bike` with `intensityZone: "sprint"`.

### IntensityZone Enum

Based on standard heart rate training zones:

```typescript
type IntensityZone =
  | "zone1"      // Recovery: 50-60% max HR
  | "zone2"      // Endurance: 60-70% max HR
  | "zone3"      // Tempo: 70-80% max HR
  | "zone4"      // Threshold: 80-90% max HR
  | "zone5"      // VO2 Max: 90-100% max HR
  | "hiit"       // High-Intensity Interval Training
  | "sprint"     // All-out effort
```

**Notes**:
- Standard zones based on % of max heart rate
- Users can also track power zones via `targetPowerRange` / logged power metrics
- `hiit` and `sprint` are distinct from zone5 for clarity

---

## Metric Customization System

### The Problem

Different cardio activities have different relevant metrics:
- **Rowing**: Distance, power, stroke rate, calories
- **Running**: Distance, pace, elevation, HR
- **Hiking**: Distance, elevation gain/loss, duration
- **Swimming**: Distance, stroke count, duration

If all metrics are optional without guidance, users face:
- **Inconsistency**: "I forgot to log watts for this rowing session"
- **Cognitive load**: "What do I usually track for this?"
- **Analysis problems**: Missing data makes trends difficult

### The Solution: Equipment Profiles + User Customization

**Approach**: Provide sensible defaults per equipment type, but allow users to customize which metrics they want to track.

#### 1. System Default Profiles

Each equipment type has predefined **primary** and **secondary** metrics:

```typescript
const EQUIPMENT_METRIC_PROFILES: Record<CardioEquipment, {
  primary: string[];    // Almost always logged
  secondary: string[];  // Commonly logged
}> = {
  rower: {
    primary: ['duration', 'distance'],
    secondary: ['avgPower', 'peakPower', 'strokeRate', 'calories', 'avgHR']
  },
  outdoor_run: {
    primary: ['duration', 'distance'],
    secondary: ['avgPace', 'elevationGain', 'avgHR', 'peakHR']
  },
  air_bike: {
    primary: ['duration'],
    secondary: ['avgPower', 'peakPower', 'calories', 'avgHR', 'peakHR']
  },
  hiking: {
    primary: ['duration', 'distance'],
    secondary: ['elevationGain', 'elevationLoss', 'avgHR']
  },
  pool_swim: {
    primary: ['duration', 'distance'],
    secondary: ['strokeCount', 'strokeRate', 'calories']
  },
  stationary_bike: {
    primary: ['duration'],
    secondary: ['distance', 'avgPower', 'calories', 'avgHR', 'cadence']
  },
  treadmill: {
    primary: ['duration', 'distance'],
    secondary: ['avgPace', 'elevationGain', 'avgHR', 'calories']
  },
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
  ski_erg: {
    primary: ['duration', 'distance'],
    secondary: ['avgPower', 'peakPower', 'calories', 'strokeRate']
  },
  treadmill: {
    primary: ['duration', 'distance'],
    secondary: ['avgPace', 'elevationGain', 'avgHR', 'calories']
  },
  track_run: {
    primary: ['duration', 'distance'],
    secondary: ['avgPace', 'avgHR', 'peakHR']
  },
  trail_run: {
    primary: ['duration', 'distance'],
    secondary: ['avgPace', 'elevationGain', 'elevationLoss', 'avgHR']
  },
  walking: {
    primary: ['duration', 'distance'],
    secondary: ['avgPace', 'avgHR']
  },
  spin_bike: {
    primary: ['duration'],
    secondary: ['distance', 'avgPower', 'cadence', 'calories', 'avgHR']
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
  pool_swim: {
    primary: ['duration', 'distance'],
    secondary: ['strokeCount', 'strokeRate', 'calories']
  },
  open_water_swim: {
    primary: ['duration', 'distance'],
    secondary: ['calories', 'avgHR']
  },
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
  stepper: {
    primary: ['duration'],
    secondary: ['calories', 'avgHR']
  },
  other: {
    primary: ['duration'],
    secondary: ['calories', 'avgHR']
  }
};
```

#### 2. User Customization

Users can modify which metrics they want to track per equipment type.

**UserCardioMetricPreferences Table**:

```prisma
model UserCardioMetricPreferences {
  id              String   @id @default(cuid())
  userId          String
  equipment       String   // CardioEquipment enum

  // User's selected metrics (overrides defaults if set)
  customMetrics   String[] // ["duration", "distance", "avgPower", "calories"]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, equipment])
  @@index([userId])
}
```

**Logic**:
- If user has custom preferences for equipment → use custom metrics
- Else → use system default profile (primary + secondary)

#### 3. UI Flow

**First time logging equipment:**
1. User selects equipment: "Rower"
2. Form shows default metrics (primary + secondary from profile)
   - Primary: Duration, Distance (prominent)
   - Secondary: Avg Power, Peak Power, Stroke Rate, Calories, Avg HR (visible)
3. User sees "Modify Fields" button (gear icon)
4. User can add/remove metrics as desired
5. Optional: "Save as default for Rower" checkbox
6. User logs session

**Subsequent logging:**
1. Form remembers user's last configuration (if saved)
2. Shows saved metrics
3. "Modify Fields" still available
4. "Reset to Defaults" button available

**Modify Fields UI:**
```
┌─────────────────────────────────────┐
│ Customize Metrics for Rower        │
├─────────────────────────────────────┤
│ Current Fields:                     │
│ ☑ Duration                          │
│ ☑ Distance                          │
│ ☑ Avg Power                         │
│ ☑ Calories                          │
│ ☐ Peak Power                        │
│ ☐ Stroke Rate                       │
│ ☐ Avg HR                            │
│ ☐ Peak HR                           │
│ ☐ Elevation Gain                    │
│ ☐ Cadence                           │
│ ... (all possible metrics)          │
├─────────────────────────────────────┤
│ [Reset to Defaults] [Save] [Cancel] │
└─────────────────────────────────────┘
```

#### 4. Data Consistency Benefits

- ✅ **Guided logging**: Users see relevant metrics for their equipment
- ✅ **Consistency**: Users track same metrics each session
- ✅ **Flexibility**: Can customize per personal preference
- ✅ **No setup required**: Defaults work out of the box
- ✅ **Analysis ready**: Consistent data enables trend analysis

#### 5. Implementation Notes

**API Endpoints:**
```typescript
// Get metric profile for equipment
GET /api/cardio/metrics/:equipment
// Returns: default profile OR user custom preferences

// Save user preferences
POST /api/cardio/metrics/preferences
Body: { equipment: "rower", metrics: ["duration", "distance", "avgPower"] }

// Reset to defaults
DELETE /api/cardio/metrics/preferences/:equipment
```

**Form Behavior:**
```typescript
// When user selects equipment
const metrics = await getMetricsForEquipment(equipment, userId);
// Returns: customMetrics || defaultProfile[equipment]

// Render form with these metrics prominent
// Other metrics available via "Modify Fields"

// On save:
if (saveAsDefault) {
  await saveUserMetricPreferences(userId, equipment, selectedMetrics);
}
```

---

## Completion Tracking

### How Checkmarks Work

A prescribed cardio session shows as "completed" when:
1. User has an active `CardioProgram`
2. Program has a `PrescribedCardioSession` for the day
3. User creates a `LoggedCardioSession` with:
   - `prescribedSessionId` linking to the prescribed session
   - `status = "completed"`

### Query Pattern

```typescript
// Get Week 1 with completion status
const week = await prisma.cardioWeek.findFirst({
  where: {
    cardioProgramId: activeProgramId,
    weekNumber: 1
  },
  include: {
    sessions: {
      include: {
        loggedSessions: {
          where: { userId: currentUser.id },
          orderBy: { completedAt: 'desc' },
          take: 1  // Most recent completion
        }
      }
    }
  }
});

// For each prescribed session:
week.sessions.forEach(session => {
  const latestLog = session.loggedSessions[0];
  const isCompleted = latestLog && latestLog.status === 'completed';
  // Show checkmark if isCompleted
});
```

### Status Options

- **"completed"**: Session fully completed
- **"incomplete"**: Started but not finished
- **"abandoned"**: Stopped early due to injury, time, etc.

### Ad-Hoc Logging (No Program)

Users can log cardio without any program:

```typescript
await prisma.loggedCardioSession.create({
  data: {
    prescribedSessionId: null,  // No link to program
    userId: user.id,
    name: "Morning run",
    equipment: "outdoor_run",
    duration: 30,
    avgHR: 155,
    distance: 3.5,
    status: "completed"
  }
});
```

This enables flexible tracking for:
- Group classes
- Spontaneous activities
- Activities outside program scope

---

## Security (RLS Policies)

All tables require Row Level Security policies to ensure users only access their own data.

### CardioProgram

```sql
CREATE POLICY "users_own_cardio_programs" ON cardio_programs
  FOR ALL USING (auth.uid() = user_id);
```

### CardioWeek

```sql
CREATE POLICY "users_own_cardio_weeks" ON cardio_weeks
  FOR ALL USING (
    cardio_program_id IN (
      SELECT id FROM cardio_programs WHERE user_id = auth.uid()
    )
  );
```

### PrescribedCardioSession

```sql
CREATE POLICY "users_own_prescribed_cardio" ON prescribed_cardio_sessions
  FOR ALL USING (
    week_id IN (
      SELECT cw.id FROM cardio_weeks cw
      JOIN cardio_programs cp ON cw.cardio_program_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );
```

### LoggedCardioSession

```sql
CREATE POLICY "users_own_logged_cardio" ON logged_cardio_sessions
  FOR ALL USING (auth.uid() = user_id);
```

---

## Use Cases & Examples

### Use Case 1: Structured Zone 2 Program (Followed Plan)

**Prescribed Session:**
```json
{
  "weekNumber": 1,
  "dayNumber": 1,
  "name": "Zone 2 Endurance",
  "targetDuration": 45,
  "intensityZone": "zone2",
  "equipment": "stationary_bike",
  "targetHRRange": "140-150",
  "notes": "Keep it conversational pace"
}
```

**Logged Session (followed plan):**
```json
{
  "prescribedSessionId": "abc123",
  "name": "Zone 2 Endurance",
  "equipment": "stationary_bike",
  "duration": 47,
  "avgHR": 144,
  "peakHR": 152,
  "calories": 520,
  "intensityZone": "zone2",
  "status": "completed",
  "notes": "Felt great, slightly over time"
}
```

**Result**: Checkmark appears on prescribed session. User can compare prescribed vs actual.

---

### Use Case 2: Flexible Execution (Weather Pivot)

**Prescribed Session:**
```json
{
  "weekNumber": 1,
  "dayNumber": 3,
  "name": "Zone 2 Endurance",
  "targetDuration": 45,
  "intensityZone": "zone2",
  "equipment": "outdoor_run",
  "targetHRRange": "145-155",
  "notes": "Easy pace run"
}
```

**Logged Session (weather pivot):**
```json
{
  "prescribedSessionId": "def456",
  "name": "Zone 2 Endurance",
  "equipment": "elliptical",  // Changed from outdoor_run
  "duration": 45,
  "avgHR": 148,
  "peakHR": 155,
  "calories": 480,
  "intensityZone": "zone2",
  "status": "completed",
  "notes": "Raining outside, used elliptical instead"
}
```

**Result**: Session marked complete despite equipment change. Notes explain deviation.

---

### Use Case 3: HIIT Intervals

**Prescribed Session:**
```json
{
  "weekNumber": 2,
  "dayNumber": 3,
  "name": "HIIT Intervals",
  "targetDuration": 20,
  "intensityZone": "hiit",
  "equipment": "air_bike",
  "intervalStructure": "8x30s/90s",
  "notes": "All-out effort on work intervals"
}
```

**Logged Session:**
```json
{
  "prescribedSessionId": "ghi789",
  "name": "HIIT Intervals",
  "equipment": "air_bike",
  "duration": 20,
  "intervalStructure": "8x30s/90s",
  "peakHR": 185,
  "avgHR": 162,
  "peakPower": 450,
  "avgPower": 280,
  "calories": 320,
  "intensityZone": "hiit",
  "status": "completed",
  "notes": "Last 2 rounds were tough, power dropped"
}
```

**Result**: Session-level aggregates captured. No per-interval tracking, but user can note observations.

---

### Use Case 4: Ad-Hoc MTB Ride (No Program)

**Logged Session:**
```json
{
  "prescribedSessionId": null,  // Not tied to any program
  "name": "Weekend MTB",
  "equipment": "mountain_bike",
  "duration": 90,
  "distance": 12.5,
  "avgHR": 155,
  "peakHR": 178,
  "calories": 1200,
  "intensityZone": "zone3",
  "status": "completed",
  "notes": "Great trail conditions, lots of climbing"
}
```

**Result**: Logged independently. Shows in user's cardio history but not tied to any program.

---

### Use Case 5: Abandoned Session

**Logged Session:**
```json
{
  "prescribedSessionId": "jkl012",
  "name": "Zone 2 Endurance",
  "equipment": "rower",
  "duration": 15,  // Planned 45min
  "avgHR": 138,
  "status": "abandoned",
  "notes": "Lower back twinge, stopped early to be safe"
}
```

**Result**: Partial completion logged. Status shows abandoned. User can review later.

---

## Comparison to Strength Training

### Strength Training Architecture

```
Program (isActive: one per user)
└── Week
    └── Workout (container for exercises)
        └── Exercise
            ├── PrescribedSet (template: "3x5 @ 135lbs")
            └── LoggedSet (actual: "3x5 @ 140lbs, RPE 8")

WorkoutCompletion (separate completion record)
├── References Workout
├── Has status: "completed" | "incomplete" | "abandoned"
└── Contains LoggedSet[] via completion_id FK
```

**Key characteristics**:
- Granular tracking (set-by-set)
- Workout contains multiple exercises
- Separate completion table
- Prescribed sets define template, logged sets record actuals

### Cardio Training Architecture

```
CardioProgram (isActive: one per user)
└── CardioWeek
    └── PrescribedCardioSession (template: "45min Zone 2")

LoggedCardioSession (serves as BOTH completion and logged data)
├── Optional FK to PrescribedCardioSession
├── Has status: "completed" | "incomplete" | "abandoned"
└── Contains session-level metrics
```

**Key characteristics**:
- Session-level tracking (no sub-intervals)
- Session is atomic unit (one per day)
- No separate completion table (LoggedCardioSession serves dual purpose)
- Can log without program (prescribedSessionId optional)

### Key Differences

| Aspect | Strength | Cardio |
|--------|----------|--------|
| **Granularity** | Set-level (3x5) | Session-level (45min) |
| **Container** | Workout (multiple exercises) | No container (session is atomic) |
| **Completion** | Separate `WorkoutCompletion` table | `LoggedCardioSession` serves dual purpose |
| **Flexibility** | Must log within workout | Can log without any program |
| **Hierarchy depth** | Program → Week → Workout → Exercise → Set | Program → Week → Session |

### Design Rationale

**Why simpler for cardio?**
1. Cardio sessions are typically single-activity (not multiple exercises)
2. No need for set-by-set tracking (duration + metrics sufficient)
3. More ad-hoc usage (runs, group classes, spontaneous activities)
4. Reduced complexity = faster implementation and easier maintenance

**What's preserved?**
1. Program-based structure for those who want it
2. Prescribed vs logged separation
3. One active program constraint
4. Completion tracking with status
5. RLS security model

---

## Future Considerations

### Calendar Integration

When unified calendar is added (future phase):

```prisma
model CalendarEntry {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime
  label     String   // "Push Day", "Zone 2 Cardio"
  type      String   // "strength", "cardio"

  // Optional links (not required for flexibility)
  workoutId              String?
  prescribedCardioId     String?

  completed Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, date])
}
```

**Key features**:
- Shows both strength and cardio on unified calendar
- NOT tied to programs (separate scheduling layer)
- User can manually add "Push Day" without linking to specific workout
- Checkmarks show completion status
- Enables flexible scheduling (swap days, skip workouts, deloads)

### CSV Import for Cardio Programs

Similar to strength program CSV import:

**Example CSV:**
```csv
week,day,name,duration,intensity_zone,equipment,hr_range,power_range,interval_structure,notes
1,1,Zone 2 Endurance,45,zone2,stationary_bike,140-150,,,Conversational pace
1,3,Zone 2 Endurance,45,zone2,stationary_bike,140-150,,,
1,5,HIIT Intervals,20,hiit,air_bike,,,8x30s/90s,All-out sprints
2,1,Zone 2 Endurance,50,zone2,stationary_bike,140-150,,,
2,3,Zone 3 Tempo,40,zone3,outdoor_run,155-165,,,Faster pace
2,5,HIIT Intervals,20,hiit,air_bike,,,8x30s/90s,
```

**Import logic**:
1. Parse CSV and detect columns
2. Create `CardioProgram`
3. Create `CardioWeek` for each unique week
4. Create `PrescribedCardioSession` for each row
5. Validate equipment and intensity zone enums

### LLM Integration

The structured schema enables AI-assisted features:

#### 1. Program Generation
**User**: "Create a 12-week cardio program focusing on Zone 2 endurance with 3 sessions per week"

**LLM Output**:
```typescript
{
  program: {
    name: "12-Week Zone 2 Endurance",
    description: "Focus on aerobic base building",
    weeks: [
      {
        weekNumber: 1,
        sessions: [
          { dayNumber: 1, name: "Zone 2", targetDuration: 30, intensityZone: "zone2", ... },
          { dayNumber: 3, name: "Zone 2", targetDuration: 30, intensityZone: "zone2", ... },
          { dayNumber: 5, name: "Zone 2", targetDuration: 30, intensityZone: "zone2", ... }
        ]
      },
      // ... weeks 2-12 with progressive duration increase
    ]
  }
}
```

#### 2. Performance Analysis
**User**: "Analyze my Zone 2 consistency over the last month"

**LLM Query**:
```sql
SELECT
  DATE(completed_at) as date,
  duration,
  avg_hr,
  peak_hr,
  equipment
FROM logged_cardio_sessions
WHERE
  user_id = 'user123'
  AND intensity_zone = 'zone2'
  AND completed_at >= NOW() - INTERVAL '30 days'
ORDER BY completed_at
```

**LLM Analysis**:
- "Your avg HR in Zone 2 has been consistent at 145 bpm (±3 bpm)"
- "Duration has increased from 30min to 45min over the month"
- "Completed 11/12 prescribed Zone 2 sessions (92% adherence)"

#### 3. Progression Insights
**User**: "Am I improving in HIIT workouts?"

**LLM Analysis**:
```typescript
// Compare first 3 HIIT sessions to most recent 3
const earlyHIIT = sessions.slice(0, 3);  // Avg peakPower: 420W
const recentHIIT = sessions.slice(-3);   // Avg peakPower: 465W

// Result: "Your peak power in HIIT sessions has increased 10.7% (+45W)"
```

#### 4. Prescription Adjustments
**User**: "My avg HR in Zone 2 sessions is trending higher, should I adjust target?"

**LLM Detection**:
```typescript
// User's Zone 2 avg HR: 155 (trending up from 145)
// Target range: 140-150
// Max HR estimate: 185 (based on logged peak HRs)

// Analysis: 155 bpm is 84% of max HR (should be 60-70% for Zone 2)
// Recommendation: "Your Zone 2 target may be too high. Consider slowing pace to keep HR 125-135"
```

---

## Implementation Phases

### Phase 1: Core Schema & Ad-Hoc Logging
**Goal**: Users can log standalone cardio sessions with smart metric defaults

- [ ] Add database tables:
  - CardioProgram, CardioWeek, PrescribedCardioSession, LoggedCardioSession
  - UserCardioMetricPreferences
- [ ] Create Prisma migration
- [ ] Implement RLS policies
- [ ] Define equipment metric profiles (primary/secondary defaults)
- [ ] Create API routes:
  - `POST /api/cardio/log` - Log ad-hoc session
  - `GET /api/cardio/history` - View logged sessions
  - `GET /api/cardio/metrics/:equipment` - Get metric profile for equipment
  - `POST /api/cardio/metrics/preferences` - Save user metric preferences
  - `DELETE /api/cardio/metrics/preferences/:equipment` - Reset to defaults
- [ ] Basic UI:
  - Log cardio modal with equipment selector
  - Dynamic form showing primary/secondary metrics based on equipment
  - "Modify Fields" button with metric customization dialog
  - "Reset to Defaults" functionality
  - Save preferences per equipment
  - Cardio history list view

**Success criteria**:
- Users can log "Morning run, 30min, 3.5mi" without any program
- Form auto-shows relevant metrics when equipment selected
- User can customize which metrics to track for each equipment type

---

### Phase 2: Program Creation & Management
**Goal**: Users can create structured multi-week cardio programs

- [ ] API routes:
  - `POST /api/cardio/programs` - Create program
  - `POST /api/cardio/programs/:id/weeks` - Add weeks
  - `POST /api/cardio/programs/:id/weeks/:week/sessions` - Add prescribed sessions
  - `PUT /api/cardio/programs/:id/activate` - Set active program
- [ ] UI:
  - Create cardio program form
  - Week builder (add sessions to days)
  - Program list (view all programs)
  - Set active program

**Success criteria**: Users can create "12-Week Zone 2 Program" with prescribed sessions

---

### Phase 3: Program Following & Completion Tracking
**Goal**: Users can follow programs and see completion checkmarks

- [ ] API routes:
  - `GET /api/cardio/active-program` - Get active program with completion status
  - `POST /api/cardio/log-from-program` - Log session linked to prescribed session
- [ ] UI:
  - Active program view (week-by-week)
  - Prescribed session detail (show target duration, zone, equipment)
  - Log from prescribed session (pre-fill from prescription)
  - Completion checkmarks on prescribed sessions

**Success criteria**: User sees "Week 1, Day 1: Zone 2 - 45min ✓" after logging session

---

### Phase 4: CSV Import
**Goal**: Users can import cardio programs via CSV

- [ ] CSV parser for cardio programs
- [ ] CSV validation (required columns, equipment/zone enums)
- [ ] Import flow UI (similar to strength programs)
- [ ] Error handling and preview

**Success criteria**: User can import 12-week program from CSV file

---

### Phase 5: Enhanced Logging & History
**Goal**: Improve logging UX and data visualization

- [ ] Equipment-specific logging forms
  - Running: duration + distance + pace
  - Biking: duration + power + HR
  - Swimming: duration + distance + stroke count
- [ ] Auto-populate from prescribed session
- [ ] Session comparison (prescribed vs logged)
- [ ] History filters (by equipment, zone, date range)
- [ ] Basic charts (HR trends, duration over time)

**Success criteria**: User sees "You averaged 5W more power than prescribed in HIIT sessions this week"

---

### Phase 6: Calendar Integration (Future)
**Goal**: Unified calendar showing strength + cardio

- [ ] Add `CalendarEntry` table
- [ ] API routes for calendar CRUD
- [ ] Calendar UI (month/week views)
- [ ] Drag-drop scheduling
- [ ] Manual entry (no program link required)
- [ ] Completion integration

**Success criteria**: User sees Mon: Push ✓, Wed: Zone 2 ✓, Fri: Pull (pending) on calendar

---

## Open Questions / Future Decisions

### 1. Unit Preferences (Distance, Weight)
Should users have preferences for:
- Distance units (miles vs km)?
- Weight units (lbs vs kg)?
- Power display (watts vs kJ)?

**Recommendation**: Add `UserPreferences` table in Phase 5

### 2. Heart Rate Zone Customization
Should users be able to customize HR zone percentages?

**Recommendation**: Use standard zones initially, add customization in Phase 5 if requested

### 3. Cardio + Strength Same Day
How to handle days with both strength workout AND cardio session?

**Recommendation**: Address in Phase 6 (Calendar) - allow multiple entries per day

### 4. Cardio "Templates"
Should users be able to save favorite sessions as templates?

**Example**: "Save 'Weekend HIIT' as template" → quick-log later

**Recommendation**: Phase 5+ feature if user feedback requests it

---

## Summary

This design provides a **flexible, structured cardio tracking system** that:

✅ Mirrors strength training patterns (familiar to existing users)
✅ Enables structured multi-week programs (for disciplined training)
✅ Allows ad-hoc logging (for flexible, spontaneous cardio)
✅ Tracks completion (checkmarks on prescribed sessions)
✅ Supports equipment flexibility (bike → elliptical pivots)
✅ Captures comprehensive metrics (HR, power, distance, elevation, pace, etc.)
✅ Provides smart metric defaults per equipment type
✅ Allows user customization of tracked metrics (no cognitive load)
✅ Ensures data consistency (same metrics logged each session)
✅ Prepares for LLM integration (structured data for analysis)
✅ Keeps implementation simple (no over-engineering)

**Core principle**: **Structure when you want it, flexibility when you need it.**

---

## Appendix: Migration Script (Draft)

```sql
-- Create cardio_programs table
CREATE TABLE cardio_programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMP,
  is_user_created BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create cardio_weeks table
CREATE TABLE cardio_weeks (
  id TEXT PRIMARY KEY,
  week_number INTEGER NOT NULL,
  cardio_program_id TEXT NOT NULL REFERENCES cardio_programs(id) ON DELETE CASCADE,
  UNIQUE(cardio_program_id, week_number)
);

-- Create prescribed_cardio_sessions table
CREATE TABLE prescribed_cardio_sessions (
  id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL REFERENCES cardio_weeks(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_duration INTEGER NOT NULL,
  intensity_zone TEXT,
  equipment TEXT,
  target_hr_range TEXT,
  target_power_range TEXT,
  interval_structure TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(week_id, day_number)
);

-- Create logged_cardio_sessions table
CREATE TABLE logged_cardio_sessions (
  id TEXT PRIMARY KEY,
  prescribed_session_id TEXT REFERENCES prescribed_cardio_sessions(id),
  user_id TEXT NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'completed',
  name TEXT NOT NULL,
  equipment TEXT NOT NULL,
  duration INTEGER NOT NULL,

  -- Heart Rate Metrics
  avg_hr INTEGER,
  peak_hr INTEGER,

  -- Power Metrics
  avg_power INTEGER,
  peak_power INTEGER,

  -- Distance & Elevation
  distance REAL,
  elevation_gain INTEGER,
  elevation_loss INTEGER,

  -- Pace & Cadence
  avg_pace TEXT,
  cadence INTEGER,

  -- Rowing/Swimming Specific
  stroke_rate INTEGER,
  stroke_count INTEGER,

  -- General
  calories INTEGER,

  -- Context
  intensity_zone TEXT,
  interval_structure TEXT,
  notes TEXT
);

-- Create user_cardio_metric_preferences table
CREATE TABLE user_cardio_metric_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  equipment TEXT NOT NULL,
  custom_metrics TEXT[] NOT NULL,  -- Array of metric names
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, equipment)
);

-- Indexes
CREATE INDEX idx_cardio_programs_user_active ON cardio_programs(user_id, is_active);
CREATE INDEX idx_cardio_programs_user_archived ON cardio_programs(user_id, is_archived);
CREATE INDEX idx_cardio_weeks_program ON cardio_weeks(cardio_program_id);
CREATE INDEX idx_prescribed_cardio_week ON prescribed_cardio_sessions(week_id);
CREATE INDEX idx_logged_cardio_prescribed ON logged_cardio_sessions(prescribed_session_id);
CREATE INDEX idx_logged_cardio_user_completed ON logged_cardio_sessions(user_id, completed_at);
CREATE INDEX idx_user_cardio_prefs_user ON user_cardio_metric_preferences(user_id);

-- RLS Policies (enable RLS first)
ALTER TABLE cardio_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardio_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescribed_cardio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE logged_cardio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cardio_metric_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY users_own_cardio_programs ON cardio_programs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY users_own_cardio_weeks ON cardio_weeks
  FOR ALL USING (
    cardio_program_id IN (
      SELECT id FROM cardio_programs WHERE user_id = auth.uid()
    )
  );

CREATE POLICY users_own_prescribed_cardio ON prescribed_cardio_sessions
  FOR ALL USING (
    week_id IN (
      SELECT cw.id FROM cardio_weeks cw
      JOIN cardio_programs cp ON cw.cardio_program_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY users_own_logged_cardio ON logged_cardio_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY users_own_cardio_metric_prefs ON user_cardio_metric_preferences
  FOR ALL USING (auth.uid() = user_id);
```

---

**End of Design Document**
