# FitCSV POC - Remaining Tasks

## Overview

Breaking down remaining work into 6 discrete tasks. Tasks marked with 🔀 can be done concurrently.

---

## Task Breakdown

### **Task 1: Week View & Navigation** 🔀
**Can run in parallel with Tasks 5 & 6**

**Goal**: Users can view workouts for a specific week

**Deliverables**:
- `/programs/[id]` page (redirects to current week)
- `/programs/[id]/weeks/[weekNumber]` page
- Display list of workouts for the week
- Show completion status (checkmark if done)
- Left/right arrow navigation between weeks
- Basic "Mark week done" action (stretch)

**Files to Create/Modify**:
- `app/(app)/programs/[id]/page.tsx` (redirect to week 1)
- `app/(app)/programs/[id]/weeks/[weekNumber]/page.tsx`
- Optional: `components/WeekNavigation.tsx`

**Estimated Complexity**: Medium
**Dependencies**: None (uses existing DB schema)

---

### **Task 2: Workout Detail Page**
**Must complete Task 1 first**

**Goal**: Users can view exercises and prescribed sets for a workout

**Deliverables**:
- `/programs/[id]/workouts/[workoutId]` page
- Display all exercises in order
- Show prescribed sets for each exercise
- Show "Start Logging" button (if not completed)
- Show logged data (if completed)
- "Clear/Redo" option for completed workouts

**Files to Create/Modify**:
- `app/(app)/programs/[id]/workouts/[workoutId]/page.tsx`
- Optional: `components/ExerciseCard.tsx`

**Estimated Complexity**: Medium
**Dependencies**: Task 1 (for navigation flow)

---

### **Task 3: Exercise Logging Modal & UI**
**Must complete Task 2 first**

**Goal**: Users can log sets/reps/weight for exercises

**Deliverables**:
- Modal component that opens when clicking an exercise
- Input fields: Set #, Reps, Weight
- Optional fields: RPE, RIR (if in program)
- "Save Set" button
- "Complete Workout" button
- Client-side state management for logging session

**Files to Create/Modify**:
- `components/ExerciseLoggingModal.tsx`
- `app/(app)/programs/[id]/workouts/[workoutId]/page.tsx` (add modal)

**Estimated Complexity**: High (most complex UI)
**Dependencies**: Task 2

---

### **Task 4: Workout Completion Backend**
**Must complete Task 3 first (or can do in parallel with Task 3 UI work)**

**Goal**: Save logged sets to database and mark workout complete

**Deliverables**:
- API route: `POST /api/workouts/[workoutId]/complete`
- Create `WorkoutCompletion` record
- Create `LoggedSet` records
- Return updated workout status
- Handle errors (validation, duplicate completions)

**Files to Create/Modify**:
- `app/api/workouts/[workoutId]/complete/route.ts`
- Optional: `lib/workouts/complete.ts` (business logic)

**Estimated Complexity**: Medium
**Dependencies**: Task 3 (for data structure)

---

### **Task 5: CSV Parser & Validator** 🔀
**Can run in parallel with Tasks 1-4**

**Goal**: Parse CSV files into program structure

**Deliverables**:
- CSV parser function (handles standard CSV format)
- Column detection (auto-detect optional columns)
- Validation (required fields, data types)
- Error handling with clear messages
- Parse into intermediate format (JSON)

**Files to Create/Modify**:
- `lib/csv/parser.ts`
- `lib/csv/validator.ts`
- `lib/csv/types.ts`
- Unit tests: `tests/csv-parser.test.ts` (optional but recommended)

**Estimated Complexity**: Medium-High (lots of edge cases)
**Dependencies**: None (pure parsing logic)

**Notes**:
- Use a library like `papaparse` or `csv-parse`
- Reference `docs/CSV_SPEC.md` for format
- Can be done by a separate Claude session

---

### **Task 6: CSV Upload UI & Import Flow** 🔀
**Can start in parallel with Task 5, but needs Task 5 to complete**

**Goal**: Users can upload CSV and create programs

**Deliverables**:
- Upload button on `/programs` page
- File picker (accept `.csv` only)
- Parse CSV (use Task 5 parser)
- Show preview/validation results
- Confirm and import to database
- Create Program, Weeks, Workouts, Exercises, PrescribedSets
- Error handling with user-friendly messages

**Files to Create/Modify**:
- `app/(app)/programs/import/page.tsx`
- `components/CsvUploader.tsx`
- `app/api/programs/import/route.ts`
- `lib/csv/import-to-db.ts` (convert parsed CSV to DB records)

**Estimated Complexity**: High
**Dependencies**: Task 5 (CSV parser)

**Notes**:
- Can start UI while parser is being built
- Mock the parser initially
- Can be done by a separate Claude session (after Task 5)

---

## Parallelization Strategy

### **Stream 1: Core Workout Flow** (Primary Claude Session)
```
Task 1 → Task 2 → Task 3 → Task 4
(Week View → Workout Detail → Logging Modal → Backend)
```

### **Stream 2: CSV Import** (Secondary Claude Session - Optional)
```
Task 5 (Parser) → Task 6 (Upload UI)
```

### **Timeline**

**If working sequentially** (one session):
- Session 1: Tasks 1 & 2 (Week + Workout views)
- Session 2: Tasks 3 & 4 (Logging + Backend)
- Session 3: Tasks 5 & 6 (CSV Import)

**If working in parallel** (two sessions):
- Session A: Tasks 1-4 (Workout logging flow)
- Session B: Tasks 5-6 (CSV import feature)
- Both streams merge when complete

---

## Success Criteria

**POC is complete when**:
- ✅ User can sign up / log in
- ✅ User can view their programs
- ✅ User can navigate to a week
- ✅ User can view a workout's exercises
- ✅ User can log sets/reps/weight for each exercise
- ✅ User can mark a workout as complete
- ✅ Completion status shows in week view
- ✅ User can upload a CSV to create a new program

---

## What's Next After POC?

**Phase 2 Features** (Future):
- Week-to-week progression tracking
- Edit programs/workouts
- Export logged data
- Progress charts
- Cardio program support
- Program templates library
- Progressive overload suggestions

---

## Notes

- All tasks use existing database schema (no migrations needed)
- CSV format already documented in `docs/CSV_SPEC.md`
- RLS policies already in place
- Focus on functionality over polish for POC
