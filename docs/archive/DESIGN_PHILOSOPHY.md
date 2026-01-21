# FitCSV Design Philosophy

## Core Philosophy: Program-First Tracker for Sophisticated Users

FitCSV is built for users who **already have a training program** and need a flexible, no-nonsense tool to track it.

### Target User Profile

**Who we're building for:**
- Has a program from a coach, book, or online (nSuns, 5/3/1, GZCL, PHAT, etc.)
- Knows what exercises they're doing
- Wants to track their specific program, not discover exercises
- Values flexibility and data ownership over hand-holding
- Comfortable with CSV files

**Who we're NOT building for (at least not in POC):**
- Complete beginners who don't know what exercises to do
- Users who need "Browse 500 exercises by muscle group"
- Users who want the app to build their program for them
- Users who need video tutorials for every exercise

### Design Implications

This philosophy drives several key decisions:

1. **CSV Import First** - User brings their program, we track it
2. **No Exercise Database** (POC) - User defines exercises via CSV
3. **No Muscle Group Targeting** (POC) - Not needed if user has a program
4. **No Alternative Exercises** (POC) - User can edit their CSV if program changes
5. **Flexible Data Model** - Support whatever the CSV defines

---

## Notes Strategy

### Multi-Level Notes Architecture

Notes exist at different levels of the training hierarchy, each serving a different purpose:

#### 1. **Exercise Notes** (From CSV)
- **Source**: CSV import (`notes` column)
- **Schema**: `Exercise.notes` (String, optional)
- **Purpose**: Coach/program instructions
- **Examples**:
  - "Pause 2 seconds at bottom"
  - "Explode up"
  - "Touch chest, don't bounce"
- **Scope**: Applies to ALL instances of this exercise in this workout

#### 2. **Workout Completion Notes** (User-generated)
- **Source**: User input when completing workout
- **Schema**: `WorkoutCompletion.notes` (String, optional)
- **Purpose**: User's overall workout feedback
- **Examples**:
  - "Felt tired today, cut volume short"
  - "New PR on bench!"
  - "Shoulder felt weird, went lighter"
- **Scope**: Applies to entire workout session

#### 3. **Program Notes** (Future)
- **Source**: User input or CSV metadata
- **Schema**: `Program.notes` (Future addition)
- **Purpose**: High-level program context
- **Examples**:
  - "12-week hypertrophy block"
  - "Coach recommended 2x/week frequency"
- **Scope**: Applies to entire program

### What We're NOT Doing (POC)

❌ **Per-Set Notes** - Too granular, not needed for POC
- User can use workout-level notes if needed
- Can add in Phase 2 if users request it

---

## CSV Spec Decisions

### Required Columns (Unchanged)
- `week` - Week number (1, 2, 3...)
- `day` - Day number within week (1, 2, 3...)
- `workout_name` - Name of workout ("Upper Power", "Push Day")
- `exercise` - Exercise name ("Bench Press", "Squat")
- `set` - Set number (1, 2, 3...)
- `reps` - Target reps
- `weight` - Target weight (flexible format)

### Optional Columns (Auto-Detected)

#### **In POC:**
✅ **`rir`** - Reps in Reserve (0-5)
- Mutually exclusive with `rpe`
- Auto-detected if column present

✅ **`rpe`** - Rate of Perceived Exertion (1-10)
- Mutually exclusive with `rir`
- Auto-detected if column present

✅ **`notes`** - Exercise-specific instructions
- Free text field
- From coach/program

✅ **`exercise_group`** - For supersets/circuits
- Format: Simple letter or number (`A`, `B`, `C` or `1`, `2`, `3`)
- Indicates exercises performed back-to-back
- Example:
  ```csv
  week,day,workout_name,exercise,exercise_group,set,reps,weight
  1,1,Upper,Bench Press,A,1,5,135lbs
  1,1,Upper,Barbell Row,A,1,8,95lbs
  1,1,Upper,Bench Press,A,2,5,135lbs
  1,1,Upper,Barbell Row,A,2,8,95lbs
  1,1,Upper,Bicep Curl,B,1,10,30lbs
  ```
- **Why**: Very common in programs (PHAT, PHUL, PPL with supersets)
- **Schema impact**: Add `Exercise.exerciseGroup String?`

#### **NOT in POC (Phase 2+):**
❌ **`rest_time`** - Rest between sets
- Nice to have but adds complexity
- Can infer standard rest periods

❌ **`tempo`** - Training tempo (3-1-1-0)
- More advanced, not critical

❌ **`equipment`** - Equipment needed
- User already knows their gym setup

❌ **Primary/secondary muscles**
- Not needed for program-first approach
- User's program already specifies exercises

---

## Schema Changes Required

### Add to Prisma Schema

```prisma
model Exercise {
  id            String   @id @default(cuid())
  name          String
  order         Int
  exerciseGroup String?  // NEW: "A", "B", "C" for supersets
  notes         String?  // EXISTING: From CSV
  workoutId     String
  workout       Workout  @relation(fields: [workoutId], references: [id], onDelete: Cascade)

  prescribedSets PrescribedSet[]
  loggedSets     LoggedSet[]

  @@index([workoutId])
}

model WorkoutCompletion {
  id          String   @id @default(cuid())
  workoutId   String
  workout     Workout  @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  userId      String
  completedAt DateTime @default(now())
  status      String   // "completed", "incomplete", "abandoned"
  notes       String?  // EXISTING: User's workout notes

  loggedSets LoggedSet[]

  @@index([workoutId, userId])
  @@index([userId, completedAt])
}

// NO CHANGES to LoggedSet - no per-set notes
```

### Migration Needed

```bash
doppler run -- npx prisma migrate dev --name add_exercise_group
```

---

## Alternative Exercises Strategy

### POC Approach: Keep It Simple
❌ **No built-in alternative exercise system**

**Reasoning:**
1. User can edit their CSV if program changes permanently
2. User can manually log a different exercise for one-off substitutions
3. Most structured programs don't offer alternatives anyway
4. Adds significant complexity for uncertain value

### Phase 2 Consideration: UX Feature

If users request it, could add as an **in-app feature** (not CSV):

**User scenario:**
- Program says "Barbell Bench Press"
- Gym's bench racks are all taken
- User clicks "Substitute exercise for today"
- Logs "Dumbbell Bench Press" instead
- Program structure stays intact
- Tracking shows the substitution

**Implementation approach:**
- Add `LoggedSet.substitutedExerciseName String?`
- Show in workout history: "DB Bench (subbed for BB Bench)"
- Don't modify the program itself

**Decision: Defer to Phase 2** (wait for user feedback)

---

## What's In vs Out

### ✅ POC Feature Set

**CSV Import:**
- Required columns: week, day, workout_name, exercise, set, reps, weight
- Optional columns: rir, rpe, notes, exercise_group
- Auto-detection of optional columns
- Validation with clear error messages
- Infer program name from filename

**Workout Tracking:**
- View program → weeks → workouts → exercises
- Log sets (reps, weight, optional RPE/RIR)
- Mark workout complete
- Show completion status in week view
- Workout-level notes

**Data Model:**
- Support supersets via exercise_group
- Store prescribed vs logged sets separately
- Multi-level notes (exercise, workout)

### ❌ NOT in POC

**Exercise Management:**
- Exercise database with 500+ exercises
- Exercise videos/instructions
- Muscle group targeting
- Equipment filtering
- Alternative exercise suggestions

**Advanced Features:**
- Rest time tracking
- Tempo tracking
- Progressive overload suggestions
- Week-to-week comparison charts
- Export logged data
- Program templates library

**Nice-to-Haves:**
- Per-set notes
- Deload week indicators
- Cardio program support

---

## Future Phases

### Phase 2: Polish & UX
- Week-to-week progression tracking
- Edit programs/workouts in-app
- Exercise substitution feature
- Better mobile UX for logging

### Phase 3: Advanced Tracking
- Rest time tracking
- Progress charts and analytics
- Export logged data (CSV, JSON)
- Week-over-week comparison

### Phase 4: Community Features
- Program templates library (share CSVs)
- Program marketplace
- Coach collaboration tools

---

## Key Principles

1. **Program-First**: User brings the plan, we track execution
2. **Flexibility**: Support any program structure via CSV
3. **Data Ownership**: User owns their program and data
4. **No Bloat**: Don't build features that serve beginners better served by other apps
5. **Progressive Enhancement**: Start simple, add features based on real user needs

---

## Comparisons to Other Apps

### FitCSV vs Hevy/Alpha Progression
- **Hevy/AP**: "I need a program" → Browse templates, exercise database
- **FitCSV**: "I have a program" → Import CSV, track it

### FitCSV vs Strong
- **Strong**: Manual workout builder, large exercise database
- **FitCSV**: CSV import, track pre-planned programs

### FitCSV vs Spreadsheet
- **Spreadsheet**: Ultimate flexibility but tedious to update
- **FitCSV**: Spreadsheet flexibility + mobile UX for logging

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2024-12-07 | Target sophisticated users (Option B) | CSV import suggests users already have programs |
| 2024-12-07 | Skip exercise database in POC | Not needed for program-first approach |
| 2024-12-07 | Add `exercise_group` for supersets | Common in structured programs, simple to implement |
| 2024-12-07 | Multi-level notes (exercise, workout) | Different use cases at different levels |
| 2024-12-07 | Skip per-set notes | Too granular for POC, can add later |
| 2024-12-07 | Defer alternative exercises to Phase 2 | Uncertain value, adds complexity |
