FitCSV Program Management & Editing Implementation Plan

 Overview

 Build comprehensive program creation and editing system to replace CSV-only workflow.
 Phase 1: In-app program builder with wizard-style creation flow.
 Phase 2: Program editing with change tracking and snapshot system.
 Focus on user-friendly program management with muscle group visualization.

 User Requirements (Updated)

 **Program Creation (Priority 1)**:
 1. Wizard-style program builder: Type → Name → Notes → Week creation
 2. Week duplication for faster program building
 3. Exercise library with search and muscle group metadata
 4. Full editing for NEW programs (created post-implementation)

 **Exercise Metadata (Priority 1)**:
 1. Primary/secondary muscle groups for workload visualization
 2. Functional aesthetic units (e.g., "upper-arm-anterior", "mid-back")
 3. Database integration (not reference files)

 **Change Tracking (Priority 2)**:
 1. Program snapshots (auto: creation, manual: major changes)
 2. Change log with modification history
 3. Preserve existing CSV-imported programs as read-only initially

 Architecture Decisions

 **Program Builder Flow**:
 Route: /programs/new (wizard), /programs/[id]/edit (full editing)

 **Workout Editing**:
 Route: /programs/[id]/workouts/[workoutId]/edit

 **Exercise Library**:
 Database schema extensions with muscle metadata

 Rationale:
 - Wizard reduces cognitive load for program creation
 - Separate edit flows for programs vs workouts
 - Database-driven exercise library enables rich filtering/search
 - Change tracking provides audit trail without version complexity

 Implementation Phases

 Phase 1: Database Schema & Exercise Library

 1.1 Database Schema Updates

 File: prisma/schema.prisma

 Add exercise metadata and program tracking:
 ```prisma
 model ExerciseDefinition {
   // ... existing fields
   primaryMuscles    String[]  // ["upper-arm-anterior", "mid-back"]
   secondaryMuscles  String[]  // ["rear-delts", "forearm-flexors"]
   movementPattern   String?   // "horizontal-push", "elbow-flexion"
   equipment         String[]  // ["barbell", "dumbbell"]
   instructions      String?   // Setup and execution notes
   createdAt         DateTime @default(now())
   updatedAt         DateTime @updatedAt
 }

 model Program {
   // ... existing fields
   programType       String    @default("strength") // "strength", "hypertrophy", "powerlifting"
   isUserCreated     Boolean   @default(false) // vs CSV imported
   createdAt         DateTime  @default(now())
   updatedAt         DateTime  @updatedAt
   snapshots         ProgramSnapshot[]
   changeLogs        ProgramChangeLog[]
 }

 model ProgramSnapshot {
   id          String   @id @default(cuid())
   programId   String
   program     Program  @relation(fields: [programId], references: [id], onDelete: Cascade)
   name        String   // "Initial Creation", "Week 3 Exercise Swap"
   description String?  // "Swapped incline press for flat bench due to shoulder"
   snapshotData Json    // Full program structure at time of snapshot
   createdAt   DateTime @default(now())
 }

 model ProgramChangeLog {
   id          String   @id @default(cuid())
   programId   String
   program     Program  @relation(fields: [programId], references: [id], onDelete: Cascade)
   changeType  String   // "exercise_added", "exercise_removed", "sets_modified"
   description String   // "Added 21s bicep curls to Upper Day"
   details     Json?    // Additional metadata about the change
   createdAt   DateTime @default(now())
 }
 ```

 Migration: doppler run -- npx prisma migrate dev --name add_program_management_schema

 1.2 Exercise Library Seeding

 File: lib/exercise-library-seed.ts (NEW)

 /**
  * Seed exercise library with muscle metadata
  * Consolidate existing exercises and add new muscle group data
  */
 export async function seedExerciseLibrary() {
   // Common exercises with muscle metadata
   const exercises = [
     {
       name: "Barbell Bench Press",
       aliases: ["bench press", "bench", "bb bench"],
       primaryMuscles: ["chest", "front-delts"],
       secondaryMuscles: ["triceps"],
       movementPattern: "horizontal-push",
       equipment: ["barbell", "bench"]
     },
     {
       name: "Hammer Curl",
       aliases: ["hammer curls", "neutral grip curls"],
       primaryMuscles: ["upper-arm-anterior"], // brachialis, brachioradialis
       secondaryMuscles: [],
       movementPattern: "elbow-flexion",
       equipment: ["dumbbell"]
     }
     // ... expand with ~100 common exercises
   ]
 }

 1.3 Program Validation Utilities

 File: lib/queries/program-validation.ts (NEW)

 /**
  * Check if program is editable (user-created, not CSV)
  * Check if workout is editable (not completed)
  */
 export async function isProgramEditable(programId: string, userId: string)
 export async function isWorkoutEditable(workoutId: string, userId: string)
 export async function canCreateSnapshot(programId: string): Promise<boolean>

 Phase 2: Program Creation APIs

 2.1 Program Creation Wizard

 File: app/api/programs/route.ts (NEW)

 POST: Create new program
 ```typescript
 {
   name: string,
   description?: string,
   programType: "strength" | "hypertrophy" | "powerlifting",
   weekCount: number
 }
 ```
 - Creates empty program with specified weeks
 - Sets isUserCreated = true
 - Creates initial snapshot
 - Returns program with week structure

 2.2 Week Management

 File: app/api/programs/[id]/weeks/route.ts (NEW)

 - POST: Add new week to program
 - PUT: Duplicate existing week
 ```typescript
 {
   sourceWeekId?: string, // If duplicating
   weekNumber: number,
   name?: string
 }
 ```
 - Validation: Check program is user-created

 Phase 3: Exercise Library & Search APIs

 3.1 Exercise Library Search

 File: app/api/exercises/search/route.ts (NEW)

 - GET: Search exercise definitions
 ```typescript
 {
   query?: string,        // Name/alias search
   muscleGroups?: string[], // Filter by primary muscles
   equipment?: string[],    // Filter by available equipment
   limit?: number
 }
 ```
 - Returns exercises with muscle metadata
 - Fuzzy search on names and aliases

 3.2 Custom Exercise Creation

 File: app/api/exercises/custom/route.ts (NEW)

 - POST: Create custom exercise definition
 ```typescript
 {
   name: string,
   aliases?: string[],
   primaryMuscles: string[],
   secondaryMuscles?: string[],
   movementPattern?: string,
   equipment?: string[],
   instructions?: string
 }
 ```
 - Sets createdBy to current user
 - Available for user's future programs

 Phase 4: Program Builder UI Components

 4.1 Program Creation Wizard

 File: components/ProgramWizard.tsx (NEW, ~200 lines)

 - Step 1: Program type, name, description
 - Step 2: Number of weeks
 - Step 3: Week 1 builder (add workouts)
 - Step 4: Review and create
 - Stepper UI with progress indication
 - Props: { onComplete: (programId: string) => void }

 4.2 Exercise Library Browser

 File: components/ExerciseLibraryBrowser.tsx (NEW, ~150 lines)

 - Search input with debounced queries
 - Muscle group filter chips
 - Equipment filter dropdown
 - Exercise cards with muscle visualization
 - "Add Custom Exercise" button
 - Exercise selection callback
 - Props: { onExerciseSelect: (exercise: ExerciseDefinition) => void }

 4.3 Week Builder

 File: components/WeekBuilder.tsx (NEW, ~120 lines)

 - Week overview with workout list
 - "Add Workout" button
 - "Duplicate from Week X" dropdown
 - Workout cards with exercise count
 - Drag-and-drop reordering
 - Props: { weekId, programId, onWeekUpdate }

 4.4 Muscle Group Visualizer

 File: components/MuscleGroupVisualizer.tsx (NEW, ~100 lines)

 - Weekly volume by muscle group (bar chart)
 - Exercise distribution pie chart
 - Push/pull/legs balance indicator
 - Warning for muscle imbalances
 - Props: { exercises: ExerciseWithSets[] }

 Phase 5: Program Management Pages

 5.1 Program Creation Page

 File: app/(app)/programs/new/page.tsx (NEW)

 Server component:
 - Check auth
 - Fetch exercise library for search
 - Render <ProgramWizard /> with data
 - Redirect to program detail on completion

 5.2 Program Management Dashboard

 File: app/(app)/programs/page.tsx (MODIFY)

 Add program creation flow:
 - "Create New Program" prominent button
 - Program list with type indicators (CSV vs created)
 - Edit/duplicate buttons for user-created programs
 - Change log preview for recent modifications

 Phase 6: Change Tracking & Advanced Features

 6.1 Program Snapshots
 - Auto-snapshot on program creation
 - Manual snapshot with description
 - Snapshot restoration (create new program from snapshot)

 6.2 Change Logging
 - Automatic change tracking (exercise added/removed/modified)
 - Change history view with timestamps
 - Visual diff for major changes

 6.3 Workload Analytics
 - Weekly volume calculations by muscle group
 - Program balance analysis
 - Exercise frequency tracking

 6.4 Polish
 - Error handling and validation messages
 - Loading states and optimistic updates
 - Mobile responsiveness
 - Exercise reordering with drag-and-drop

 Data Flow: Program Creation

 ProgramWizard (client state)
   ↓ User completes wizard
   ↓ API calls:
     1. POST /api/programs (create program)
     2. POST /api/programs/[id]/weeks (create weeks)
     3. POST /api/workouts (create workouts for week 1)
     4. POST /api/exercises/search (populate exercise library)
   ↓ Success
   ↓ router.push() to program detail page

 Program Editing Flow:
   ↓ User modifies program
   ↓ Change tracking:
     1. Log change to ProgramChangeLog
     2. Update program timestamp
     3. Optional: Create snapshot for major changes
   ↓ Batch save program changes
   ↓ Update UI with change indicators

 Security Enforcement

 All API routes must:
 1. Verify user authentication via Supabase
 2. Check user owns workout via RLS-friendly query:
 const workout = await prisma.workout.findUnique({
   where: { id: workoutId },
   include: { week: { include: { program: true } } }
 });
 if (workout.week.program.userId !== user.id) {
   return 403 Unauthorized
 }
 3. Validate workout not completed via isWorkoutEditable()
 4. Sanitize and validate inputs

 Edge Cases Handled

 1. Completed workouts: Edit button hidden, API blocks edits, show error message
 2. Empty exercises: Allow exercises with 0 sets, show warning in UI
 3. Exercise name changes: Use matchOrCreateExerciseDefinition() to link to existing or
 create new definition
 4. Reordering: Up/down buttons swap order values with adjacent exercise
 5. Concurrent edits: Last save wins (acceptable for single-user MVP)
 6. Exercise history: Links via exerciseDefinitionId, preserved if same definition
 matched

 Critical Files

 New Files

 **Backend/API:**
 1. lib/exercise-library-seed.ts - Exercise database seeding
 2. lib/queries/program-validation.ts - Program/workout validation
 3. app/api/programs/route.ts - Program CRUD
 4. app/api/programs/[id]/weeks/route.ts - Week management
 5. app/api/exercises/search/route.ts - Exercise library search
 6. app/api/exercises/custom/route.ts - Custom exercise creation
 7. app/api/programs/[id]/snapshots/route.ts - Program snapshots

 **Frontend/Components:**
 8. components/ProgramWizard.tsx - Multi-step program creation
 9. components/ExerciseLibraryBrowser.tsx - Searchable exercise library
 10. components/WeekBuilder.tsx - Week creation and duplication
 11. components/MuscleGroupVisualizer.tsx - Workload visualization
 12. app/(app)/programs/new/page.tsx - Program creation page

 **Database:**
 13. prisma/migrations/xxx_program_management_schema.sql - New tables

 Modified Files

 1. prisma/schema.prisma - Add exercise metadata, program tracking, snapshots
 2. app/(app)/programs/page.tsx - Add "Create Program" button and management
 3. components/ProgramList.tsx - Show program types and edit indicators
 4. lib/csv/import-to-db.ts - Mark CSV programs as isUserCreated = false

 Testing Strategy

 1. API Testing: Manual via browser fetch() or Postman
   - Test all CRUD endpoints
   - Verify auth and completion checks
   - Test edge cases (empty sets, invalid inputs)
 2. UI Testing: Manual browser testing
   - Chrome DevTools mobile emulation
   - Test on iPhone SE, Pixel 5, Desktop
   - Flows: Add exercise, edit sets, reorder, save, cancel
 3. Integration Testing: Full flow
   - Import CSV → Edit workout → Log workout → Verify history preserved

 Success Criteria

 **Phase 1 (Program Creation):**
 - User can create new programs via wizard interface
 - Exercise library search works with muscle group filtering
 - Week duplication reduces program building time
 - Muscle group visualization shows training balance
 - Program creation faster than CSV import for simple programs

 **Phase 2 (Program Editing):**
 - User-created programs fully editable (add/remove/modify)
 - Change tracking provides audit trail of modifications
 - Snapshots allow restoration to previous states
 - CSV-imported programs remain protected from accidental changes

 **Technical:**
 - Exercise metadata enables rich program analysis
 - Database performance good with ~1000+ exercises
 - Mobile UI usable for program creation
 - Backward compatibility with existing CSV workflow

 Estimated Effort

 - Phase 1 (Schema & Exercise Library): ~6 hours
   - Database migration with muscle metadata: 2 hours
   - Exercise library seeding: 3 hours
   - Validation utilities: 1 hour

 - Phase 2 (Program Creation APIs): ~4 hours
   - Program creation endpoint: 2 hours
   - Week management APIs: 2 hours

 - Phase 3 (Exercise Library APIs): ~4 hours
   - Search endpoint with filtering: 2 hours
   - Custom exercise creation: 2 hours

 - Phase 4 (UI Components): ~12 hours
   - Program wizard (multi-step): 4 hours
   - Exercise library browser: 3 hours
   - Week builder: 3 hours
   - Muscle visualizer: 2 hours

 - Phase 5 (Integration): ~4 hours
   - Program creation page: 2 hours
   - Dashboard updates: 2 hours

 - Phase 6 (Advanced Features): ~6 hours
   - Snapshot system: 3 hours
   - Change logging: 2 hours
   - Analytics: 1 hour

 - Total: ~36 hours (4.5 full days)

 Next Steps

 1. **Database Foundation** (Phase 1)
    - Add exercise metadata fields to schema
    - Seed exercise library with muscle group data
    - Consolidate/clean existing exercise definitions

 2. **Program Creation MVP** (Phases 2-4)
    - Build wizard-style program creation
    - Implement exercise library search
    - Week duplication functionality

 3. **Advanced Features** (Phases 5-6)
    - Change tracking and snapshots
    - Workload visualization
    - Full program editing capabilities

 **Immediate Priority**: Schema updates and exercise library seeding
 This creates foundation for both program creation AND existing workout editing.
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
