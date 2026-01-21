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

## Final Decisions Summary

All design questions have been resolved. See `docs/CARDIO_DESIGN.md` for complete documentation.

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

### Additional Decision: Metric Customization System ✓
**Decision**: Hybrid approach - System defaults + user customization
- Provide equipment-specific default metrics (primary + secondary)
- Allow users to customize which metrics they want to track per equipment
- UI shows "Modify Fields" button for customization
- No prompts, no learning, no bundles
- Preferences saved per equipment type
- "Reset to Defaults" button available

**Additional Metrics Added**:
- elevationGain, elevationLoss (hiking, trail running)
- avgPace (running, walking)
- cadence (cycling, running)
- strokeRate, strokeCount (rowing, swimming)

**Removed**:
- METs (not needed)
- Sprint as equipment (keep as intensity zone only)

**Equipment Added**:
- walking, hiking

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

## Completion Tracking

### How Checkmarks Work

For a prescribed cardio session to show as "completed":
1. User has active CardioProgram
2. Program has CardioWeek with PrescribedCardioSession
3. User creates LoggedCardioSession with `prescribedSessionId` linking to the prescribed session
4. LoggedCardioSession has `status = "completed"`

### Querying Completion Status

```typescript
// Get Week 1 with completion status
const week1 = await prisma.cardioWeek.findFirst({
  where: {
    cardioProgramId: program.id,
    weekNumber: 1
  },
  include: {
    sessions: {
      include: {
        loggedSessions: {
          where: { userId: user.id },
          orderBy: { completedAt: 'desc' },
          take: 1  // Most recent log
        }
      }
    }
  }
});

// For each prescribed session:
// - If loggedSessions.length > 0 && status === "completed" → Show checkmark
// - Else → Show as incomplete
```

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

---

## Row Level Security (RLS) Policies

### CardioProgram
```sql
-- Users can only see their own cardio programs
CREATE POLICY "users_own_cardio_programs" ON cardio_programs
  FOR ALL USING (auth.uid() = user_id);
```

### CardioWeek
```sql
-- Users can access weeks from their programs
CREATE POLICY "users_own_cardio_weeks" ON cardio_weeks
  FOR ALL USING (
    cardio_program_id IN (
      SELECT id FROM cardio_programs WHERE user_id = auth.uid()
    )
  );
```

### PrescribedCardioSession
```sql
-- Users can access prescribed sessions from their programs
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
-- Users can only see their own logged sessions
CREATE POLICY "users_own_logged_cardio" ON logged_cardio_sessions
  FOR ALL USING (auth.uid() = user_id);
```

---

## Data Examples

### Example 1: Zone 2 Endurance Program (Week 1)

**Prescribed:**
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

**Logged (followed plan):**
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
  "status": "completed"
}
```

**Logged (weather pivot):**
```json
{
  "prescribedSessionId": "abc123",
  "name": "Zone 2 Endurance",
  "equipment": "elliptical",  // Changed from bike
  "duration": 45,
  "avgHR": 148,
  "peakHR": 155,
  "calories": 480,
  "intensityZone": "zone2",
  "notes": "Raining, used elliptical instead",
  "status": "completed"
}
```

### Example 2: HIIT Intervals

**Prescribed:**
```json
{
  "weekNumber": 1,
  "dayNumber": 3,
  "name": "HIIT Intervals",
  "targetDuration": 20,
  "intensityZone": "hiit",
  "equipment": "air_bike",
  "intervalStructure": "8x30s/90s",
  "notes": "All-out effort on work intervals"
}
```

**Logged:**
```json
{
  "prescribedSessionId": "def456",
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
  "status": "completed"
}
```

### Example 3: Ad-Hoc MTB Ride (No Program)

**Logged:**
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
  "notes": "Great trail conditions",
  "status": "completed"
}
```

---

## Future Considerations

### CSV Import for Cardio Programs

Similar to strength programs, users should be able to import cardio programs via CSV:

```csv
week,day,name,duration,intensity_zone,equipment,hr_range,notes
1,1,Zone 2 Endurance,45,zone2,stationary_bike,140-150,Conversational pace
1,3,Zone 2 Endurance,45,zone2,stationary_bike,140-150,
1,5,HIIT Intervals,20,hiit,air_bike,,"8x30s/90s intervals"
2,1,Zone 2 Endurance,50,zone2,stationary_bike,140-150,
2,3,Zone 3 Tempo,40,zone3,outdoor_run,155-165,
```

### LLM Integration

The structured schema enables future LLM features:

**Program Generation:**
- "Create a 12-week cardio program focusing on endurance with 3 sessions per week"
- LLM generates CardioProgram → CardioWeeks → PrescribedCardioSessions

**Analysis & Insights:**
- "Analyze my Zone 2 consistency over the last month"
- Query LoggedCardioSession where intensityZone = "zone2", aggregate avgHR, duration
- "Am I improving in HIIT workouts?"
- Compare peakPower/peakHR across HIIT sessions over time

**Prescription Adjustments:**
- "My avg HR in Zone 2 sessions is trending higher, should I adjust target?"
- LLM analyzes logged data and suggests updating targetHRRange in prescribed sessions

### Calendar Integration (Future)

When calendar feature is added:
```prisma
model CalendarEntry {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime
  label     String   // "Push Day", "Zone 2 Cardio"
  type      String   // "strength", "cardio"

  // Optional links (not required)
  workoutId              String?
  prescribedCardioId     String?

  completed Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, date])
}
```

Calendar entries are display/scheduling layer, separate from programs.

---

## Implementation Phases

### Phase 1: Core Schema & Logging
- [ ] Add CardioProgram, CardioWeek, PrescribedCardioSession, LoggedCardioSession tables
- [ ] Implement RLS policies
- [ ] Create API routes for CRUD operations
- [ ] Basic UI: Log ad-hoc cardio session

### Phase 2: Program Management
- [ ] Create/edit cardio programs
- [ ] Program → Week → Session creation UI
- [ ] Set active cardio program
- [ ] View program with completion checkmarks

### Phase 3: CSV Import
- [ ] CSV parser for cardio programs
- [ ] Import flow (similar to strength)
- [ ] Validation and error handling

### Phase 4: Enhanced Logging
- [ ] Equipment-specific logging forms
- [ ] Auto-populate from prescribed session
- [ ] History view and session comparison

### Phase 5: Calendar (Future)
- [ ] Unified calendar view
- [ ] Drag-drop scheduling
- [ ] Completion tracking integration

---

## Summary

This design provides:
1. **Parallel structure** to strength training (familiar patterns)
2. **Flexibility** in execution (can deviate from plan)
3. **Optional programs** (can log without any program)
4. **Simple completion tracking** (LoggedCardioSession serves dual purpose)
5. **LLM-ready** (structured data for analysis and generation)
6. **Future-proof** (calendar integration planned)

Key principle: **Structure when you want it, flexibility when you need it.**
