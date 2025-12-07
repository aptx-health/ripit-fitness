# FitCSV Architecture

## Project Overview

A focused strength training tracker that prioritizes flexibility and user control over beginner-friendly guidance. Built to import programs from CSV and track workout completion without rigid app constraints.

## Core Principles

- **Strength-first**: Cardio support planned for later
- **CSV-based program import**: Users bring their own programming
- **Simple tracking**: Log sets, reps, weight - nothing more
- **No fluff**: No exercise instructions, images, or social features
- **Single-user**: One account = one user (no multi-tenancy)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with Row Level Security (RLS)
- **ORM**: Prisma
- **Secrets**: Doppler
- **Deployment**: Vercel
- **Styling**: Tailwind CSS

## Data Hierarchy

Programs are structured in a clear hierarchy:

```
Program
└── Week (1, 2, 3...)
    └── Workout (Day 1, Day 2...)
        └── Exercise (Bench Press, Squat...)
            └── Set (1, 2, 3...)
                └── Rep count + Weight
```

## Database Schema

### Core Tables

**User** (managed by Supabase Auth)
- Standard Supabase auth.users table
- Extended with custom user preferences if needed

**Program**
- User's training program
- Only one active strength program at a time
- Supports multiple programs (archived/future)

**Week**
- Represents a week within a program
- Ordered by week number (1, 2, 3...)

**Workout**
- A single training session (e.g., "Upper Power", "Monday")
- Belongs to a specific week
- Ordered by day number within week

**Exercise**
- Individual exercise within a workout
- Name + optional notes
- Ordered within workout

**PrescribedSet**
- What the program prescribes (template)
- Reps, weight, optional RPE/RIR
- Flexible weight field: "135lbs", "65%", "RPE 8"

**LoggedSet**
- What the user actually did
- Actual reps, weight (numeric), optional RPE/RIR
- Links to WorkoutCompletion

**WorkoutCompletion**
- Tracks when a workout was completed
- Status: completed, incomplete, abandoned
- Links logged sets to a specific session

### Design Decisions

1. **Prescribed vs Logged Sets**: Store both to enable:
   - Comparison of plan vs reality
   - Workout templates can be reused
   - Historical tracking of adherence

2. **Flexible Weight Field**: PrescribedSet.weight is a string to support:
   - Absolute: "135lbs"
   - Percentage: "65%"
   - RPE-based: "RPE 8"
   - Variable: "AMRAP", "max"

3. **No Multi-Tenancy**:
   - Simpler RLS policies
   - Reduced complexity
   - Faster queries

4. **RLS over Application-Level Auth**:
   - Database enforces security
   - Can't accidentally expose data
   - Works with Supabase client libraries

## CSV Import Strategy

### Approach: Flatten to Database (Option A)

CSV is parsed and fully imported into the database structure. This enables:
- Fast queries (no runtime parsing)
- Progress tracking against original program
- Easy modifications to imported programs

### CSV Format

Standard CSV with intelligent column detection:

```csv
week,day,workout_name,exercise,set,reps,weight,rir,notes
1,1,Upper Power,Bench Press,1,5,135lbs,2,
1,1,Upper Power,Bench Press,2,5,135lbs,2,
1,1,Upper Power,Rows,1,8,95lbs,2,Pause at chest
```

**Required columns:**
- `week`: Week number (1, 2, 3...)
- `day`: Day number within week (1, 2, 3...)
- `workout_name`: Name of the workout
- `exercise`: Exercise name
- `set`: Set number (1, 2, 3...)
- `reps`: Target reps
- `weight`: Target weight (flexible format)

**Optional columns** (auto-detected):
- `rir`: Reps in Reserve (0-5)
- `rpe`: Rated Perceived Exertion (1-10)
- `notes`: Exercise-specific notes

**Metadata inference:**
- Program name: derived from filename (`my-program.csv` → "My Program")
- Program type: default to "strength"
- Optional columns: detected from headers

### Why This Format?

- **Standard CSV**: Works in Excel, Google Sheets, any text editor
- **No special syntax**: No metadata comments or custom formats
- **Flexible**: Optional columns detected automatically
- **Portable**: Easy to share, version control, backup

## Authentication & Security

### Supabase Auth + RLS

Using Supabase's built-in authentication with Row Level Security policies:

```sql
-- Users can only see their own programs
CREATE POLICY "users_own_programs" ON programs
  FOR ALL USING (auth.uid() = user_id);

-- Users can only see workouts from their programs
CREATE POLICY "users_own_workouts" ON workouts
  FOR ALL USING (
    week_id IN (
      SELECT w.id FROM weeks w
      JOIN programs p ON p.id = w.program_id
      WHERE p.user_id = auth.uid()
    )
  );
```

**Benefits:**
- Security enforced at database level
- Can't accidentally leak data via API bugs
- Works across all clients (web, mobile, API)
- Simpler than application-level auth middleware

## User Experience Flow

### Program Selection
1. User sees list of programs
2. Active strength program highlighted
3. Cardio program grayed out (future)
4. Button to upload new CSV

### Week View
1. User opens active program
2. Sees current week's workouts
3. Completed workouts show checkmark
4. Left/right arrows navigate weeks
5. Hamburger menu: "Mark week as done"

### Workout Session
1. User taps incomplete workout
2. Sees list of exercises
3. Taps exercise → modal opens
4. Logs each set: reps + weight (+ optional RPE/RIR)
5. Hamburger menu: Complete / Abandon / Save Incomplete

### Completed Workout Review
1. User taps completed workout
2. Sees overview of logged sets/reps
3. Option to clear or redo workout

## Development Phases

### Phase 1: POC (First Deploy)
- [ ] Next.js + Supabase + Doppler setup
- [ ] Supabase Auth (email/password)
- [ ] Prisma schema + migrations
- [ ] RLS policies
- [ ] Seed one hardcoded program
- [ ] Basic UI: Program → Week → Workout → Exercise
- [ ] Log sets (reps + weight only)
- [ ] Mark workout complete
- [ ] Deploy to Vercel

### Phase 2: CSV Import
- [ ] CSV parser with column detection
- [ ] Upload interface
- [ ] Validation and error handling
- [ ] Program name from filename
- [ ] Support optional columns (RPE/RIR)

### Phase 3: Polish
- [ ] Improved UI/UX
- [ ] Week navigation
- [ ] Progress visualization
- [ ] Edit/delete programs
- [ ] Workout history view

### Phase 4: Advanced Features (Future)
- [ ] Cardio program support
- [ ] Export logged data
- [ ] Program templates/library
- [ ] Progressive overload suggestions

## Key Decisions Log

| Decision | Rationale | Date |
|----------|-----------|------|
| No multi-tenancy | Single user per account = simpler auth, faster queries | 2025-12-05 |
| Supabase Auth over BetterAuth | Built-in to Supabase, simpler for POC, RLS integration | 2025-12-05 |
| Flatten CSV to DB (Option A) | Better querying, progress tracking, no runtime parsing | 2025-12-05 |
| Infer metadata from CSV | Standard CSV format, no special syntax, user-friendly | 2025-12-05 |
| Store prescribed + logged sets | Enables plan vs actual comparison, adherence tracking | 2025-12-05 |
| Flexible weight string | Supports "135lbs", "65%", "RPE 8", "AMRAP" | 2025-12-05 |

## Reference

See `/NEW_PROJECT_REFERENCE.md` for Next.js + Supabase + BetterAuth patterns and best practices.
