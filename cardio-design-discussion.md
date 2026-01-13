# Cardio Feature Design Discussion

## Date: 2026-01-13

## Design Decisions Made

### 1. Cardio Programs vs Ad-Hoc Sessions
**Decision**: Option A - Completely separate and flexible
- Cardio programs are optional
- Users can create structured multi-week programs OR log ad-hoc sessions
- Programs provide structure but users can deviate based on recovery, weather, etc.

### 2. Calendar Integration
**Decision**: Unified calendar (deferred for now - out of scope for initial design)
- Shows both strength and cardio
- Not tied to programs - separate scheduling layer
- Just labels + color coding + completion checkboxes

### 3. Cardio Session Granularity
**Decision**: Session-level metrics only (NO interval-level tracking)
- No need to track individual intervals within HIIT
- Duration + metrics tell the story (20min + peak HR 185 vs 45min avg HR 145)
- Keeps model simple

### 4. Cardio Types
**Decision**: Flexible/universal model - one table for all cardio types
- Steady cardio (Zone 2 bike)
- HIIT (sprint intervals)
- Free cardio (group run, MTB ride)
- All use same table with optional fields based on what's captured

### 5. Prescribed Cardio Philosophy
**Decision**: Descriptive and specific prescriptions, flexible execution
- Programs should be detailed and specific
- Users can deviate during execution (bike → elliptical due to weather)
- Balance between structure and flexibility

### 6. Hierarchical Structure
**Decision**: Option A - Session is atomic unit
```
CardioProgram → Week → PrescribedCardioSession

LoggedCardioSession (standalone, optionally references PrescribedCardioSession)
```
- No "Workout" container needed
- One day = one cardio session
- Simpler than strength hierarchy

---

## Equipment and Intensity Zone Definitions

### Equipment Enum (Exhaustive List)
```typescript
type CardioEquipment =
  // Bikes
  | "stationary_bike"
  | "spin_bike"
  | "air_bike"      // Assault Bike, Rogue Echo
  | "recumbent_bike"

  // Running/Walking
  | "treadmill"
  | "outdoor_run"
  | "track_run"
  | "trail_run"

  // Rowing/Skiing
  | "rower"         // Concept2, etc.
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

### Intensity Zone Enum (Standard HR Zones)
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

---

## Finalized Schema

### CardioProgram
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

### CardioWeek
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

### PrescribedCardioSession
```prisma
model PrescribedCardioSession {
  id          String     @id @default(cuid())
  weekId      String
  week        CardioWeek @relation(fields: [weekId], references: [id], onDelete: Cascade)
  dayNumber   Int        // Position within week (1, 2, 3...)
  name        String     // "Zone 2 Endurance", "HIIT Intervals"
  description String?    // Freeform notes

  // Prescription details
  targetDuration     Int     // minutes
  intensityZone      String? // "zone1", "zone2", "zone3", "zone4", "zone5", "hiit", "sprint"
  equipment          String? // CardioEquipment enum (see above)
  targetHRRange      String? // "140-150" (flexible text)
  targetPowerRange   String? // "150-180W" (flexible text)
  intervalStructure  String? // "8x30s/90s" for HIIT
  notes              String? // "If weather bad, use elliptical"

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  loggedSessions LoggedCardioSession[]

  @@unique([weekId, dayNumber])
  @@index([weekId])
}
```

### LoggedCardioSession
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
  equipment String  // CardioEquipment enum
  duration  Int     // Actual minutes

  // Metrics (all optional)
  avgHR     Int?    // Average heart rate
  peakHR    Int?    // Peak heart rate
  avgPower  Int?    // Average power (watts)
  peakPower Int?    // Peak power (watts)
  calories  Int?    // Total calories
  distance  Float?  // Distance (miles or km)

  // Context
  intensityZone     String? // What zone you aimed for
  intervalStructure String? // What you did for HIIT (e.g., "8x30s/90s")
  notes             String? // Freeform

  @@index([prescribedSessionId])
  @@index([userId, completedAt])
}
```

---

## Decisions Made (Answered)

### Question 1: Prescribed Detail Level ✓
**Decision**: Prescribed fields look good
- targetDuration, intensityZone, equipment, targetHRRange, targetPowerRange, intervalStructure, notes
- Provides good detail for program creation

### Question 2: Logged Metrics Structure ✓
**Decision**: Keep it simple and flat
- All metrics as optional fields at top level
- No need for complex nested structures

### Question 3: Equipment Handling ✓
**Decision**: Predefined equipment list (exhaustive)
- Will create comprehensive list of common cardio equipment
- Keeps data consistent for analysis

### Question 4: Intensity Zones ✓
**Decision**: Define standard zones
- Use standard HR zones (Zone 1-5) as baseline
- Include HIIT as additional option

### Question 5: Active Program Constraint ✓
**Decision**: One active cardio program per user
- Mirrors strength program behavior
- Use `isActive` flag on CardioProgram

### Additional Decision: Completion Tracking ✓
**Decision**: Link LoggedCardioSession to PrescribedCardioSession (optional)
- Want to see if workout is checked off (like strength)
- LoggedCardioSession serves as both completion record AND logged data

---

## Comparison to Strength Architecture

### Strength (Current)
```
Program (isActive: one per user)
└── Week
    └── Workout (container for exercises)
        └── Exercise
            ├── PrescribedSet (template)
            └── LoggedSet (actual performance)

WorkoutCompletion (tracks completion, has status)
├── References Workout
└── Contains LoggedSet[]
```

### Cardio (Proposed)
```
CardioProgram (isActive: one per user)
└── CardioWeek
    └── PrescribedCardioSession (template)

LoggedCardioSession (serves as BOTH completion record AND logged data)
├── Optional reference to PrescribedCardioSession
└── Has status field ("completed", "incomplete", "abandoned")
```

**Key Differences**:
1. **No "Workout" container**: Session is atomic (one session per day)
2. **No granular sub-units**: No sets/intervals - session level only
3. **Simpler completion model**: LoggedCardioSession serves as both completion and data (no separate completion table)
4. **More flexible logging**: Can log without any program (prescribedSessionId is optional)
5. **Parallel tables**: CardioProgram/CardioWeek separate from Program/Week

---

## Use Cases to Support

### Use Case 1: Structured Program
User creates 12-week cardio program:
- Week 1: 3x Zone 2 sessions (30min each)
- Week 2: 2x Zone 2 (35min) + 1x HIIT (20min)
- Follows program rigorously

### Use Case 2: Flexible Execution
User has program prescribing "Zone 2 bike 45min"
- Day of: Weather bad, uses elliptical instead
- Logs: Elliptical, 45min, Zone 2, avgHR 145

### Use Case 3: Ad-Hoc Logging
User has no cardio program
- Goes on group MTB ride
- Logs: "MTB ride, 90min, 1200 cals, avgHR 155, free cardio"

### Use Case 4: HIIT Session
Program prescribes: "HIIT airbike, 20min, 8x30s/90s intervals"
- Logs: 20min, 8 rounds completed, peakHR 185, avgPower 380W

---

## LLM Analysis Considerations

To support future LLM-assisted program development and analysis, schema should:

1. **Parallel strength structure** where possible (Program → Week pattern)
2. **Consistent naming** (prescribed vs logged)
3. **Structured data** over freeform where reasonable (enums for equipment/zones)
4. **Optional references** (logged can link to prescribed for plan vs actual analysis)
5. **Flexible metrics** (capture what matters for each session type)

---

## Next Steps

1. Answer open questions (1-5)
2. Finalize schema
3. Consider CardioProgram table structure
4. Plan migration strategy
5. Write complete design document with examples
