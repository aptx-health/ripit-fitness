# Ripit Fitness - Development Roadmap

## What Is Ripit Fitness?

Ripit Fitness is a strength training and cardio tracker designed for people who want flexibility and control over their workouts. Unlike rigid fitness apps that force you into their way of doing things, Ripit lets you import your own training programs via CSV and track your progress without constraints.

**Key Philosophy**: Import your program, log your workouts, track your progress. No rigid templates, no forced progressions.

## Current State

The app currently supports:
- ✅ CSV program import (strength programs)
- ✅ Workout logging with sets, reps, weight, RPE/RIR
- ✅ Cardio tracking (running, cycling, rowing, etc.)
- ✅ Basic program and workout management
- ✅ Authentication and user accounts

## The Plan Forward

The roadmap is organized into 4 phases, each building on the previous:

---

## Phase 1: Bug Fixes & Stability

**Goal**: Clean up existing issues before building new features.

### Issues to Fix:

**#75: Prevent saving empty workouts**
- Problem: Users can currently save workouts with zero exercises
- Fix: Add validation to program editor
- Why it matters: Prevents broken/useless workouts in the database

**#63: Reset button should clear localStorage**
- Problem: "Reset" button doesn't clear cached workout completion data
- Fix: Clear localStorage when workout is reset
- Why it matters: Users see stale "completed" states that don't match reality

**#80: Skipped workouts not displaying correctly**
- Problem: When users skip a workout, it doesn't show properly on the training page
- Fix: Correct the display logic for skipped workout status
- Why it matters: Users can't tell which workouts they've skipped vs. not started

**#87: Mobile tab switching cycles rapidly**
- Problem: On mobile devices, switching tabs on /programs page causes rapid cycling
- Fix: Debug state management issue causing multiple re-renders
- Why it matters: Makes the app unusable on mobile for program browsing

---

## Phase 2: Exercise Database Expansion (#90)

**Goal**: Add hundreds of exercise definitions to support varied training styles and equipment access.

### Why This Matters:

Right now, the app has a limited set of exercises (mostly barbell compound lifts). To make the app useful for:
- Beginners who work out at home
- People with limited equipment (dumbbells, bands)
- Climbers who need climbing-specific exercises
- Runners doing strength training

...we need to dramatically expand the exercise database.

### Categories to Add:

**Bodyweight Exercises**
- Push-ups (standard, wide, diamond, decline)
- Pull-ups/chin-ups (various grips)
- Dips, planks, bodyweight squats/lunges
- Core exercises (crunches, leg raises, etc.)

**Limited Equipment**
- Dumbbell exercises (curls, presses, rows, etc.)
- Resistance band variations
- Jump rope and cardio alternatives

**Home Gym**
- Barbell variations (if user has a home rack)
- Kettlebell exercises
- Basic equipment exercises

**Climbing-Specific**
- Hangboard protocols
- Campus board training
- Finger strength work

### Implementation:

Use AI to batch-generate exercise seed files following the existing schema. Each exercise needs:
- Name
- Muscle groups worked
- Equipment required
- Exercise type (strength/cardio/mobility)

**Estimated Output**: 200-300 exercise definitions

---

## Phase 3: Community Programs (#86)

**Goal**: Allow users to publish programs to a shared community library and add community programs to their personal collection.

### The Problem:

Currently, users must create or import their own programs via CSV. Many people don't have programs and don't know where to start. They want proven, ready-to-use programs created by experienced lifters.

Friends are interested in using the app but say: *"I don't have a program to import, and I don't know how to make one."*

### The Solution: Community Programs

#### Publishing a Program

Users can publish their programs to the community library:
1. Click "Publish to Community" from program editor
2. Program is validated (must have exercises, proper structure)
3. **Once published, it's immutable** (can't be edited/deleted)
4. Author's display name is attached for attribution

#### Browsing Community Programs

New page where users can:
- Browse all published community programs
- Filter by type (strength/cardio)
- See author name and publish date
- Preview program structure before adding

#### Adding to "My Programs"

When a user finds a program they like:
1. Click "Add to My Programs"
2. Program is **cloned/forked** to their personal collection
3. They can edit their copy freely
4. Original published version remains unchanged

### Schema Design:

New `community_programs` table:
- Links to existing program structure
- `published_at` timestamp
- `author_user_id` for attribution
- `program_type` (strength/cardio)
- Immutability enforced at database level

### What's NOT Included (keeping it simple):

- No ratings/likes/downloads tracking
- No comments or discussions
- No versioning (programs are immutable once published)
- No "featured" or "trending" algorithms

### Dependencies:

- **Display Name** (#31): Users need display names for author attribution
- **Expanded Exercises** (#90): Community programs need variety to be useful

---

## Phase 4: Brag Strip & Materialized Views (#89)

**Goal**: Create a screenshot-friendly stats page where users can show off their training consistency and volume.

### The Problem:

People want to share their fitness progress with friends, but the app doesn't provide an easy way to visualize achievements. A simple, shareable stats page encourages:
- Social proof (friends see consistency and want to join)
- User motivation (seeing progress is motivating)
- Organic growth (screenshots shared on social media)

### The Solution: Brag Strip

A dedicated page showing key stats:

**Workout Consistency**
- Workouts this week
- Workouts this month
- Total workouts (all-time)

**Volume Metrics**
- Total volume (pounds lifted across all strength workouts)
- Total running miles (from treadmill + outdoor running cardio)

**Design Considerations**
- Clean, visual layout
- Optimized for screenshots (good contrast, readable text)
- Mobile-friendly (most screenshots taken on phones)

### Technical Implementation: Materialized Views

**What are materialized views?**
Materialized views are pre-computed database queries stored as tables. Instead of calculating "total volume" every time a user loads the page (slow), we:
1. Pre-calculate the result periodically
2. Store it in a fast-lookup table
3. Serve the cached result instantly

**Why this matters beyond Brag Strip:**
This is the **first implementation of materialized views** in the app. Once the infrastructure is in place, we can add more advanced analytics like:
- Max rep maxes per exercise (#32)
- Volume trends over time
- PR tracking and progression analysis

**Refresh Strategy:**
- On-demand: Refresh when user requests stats page
- Scheduled: Periodic background refresh (e.g., daily at 3am)
- Hybrid: Cache for X minutes, refresh if stale

**API Design:**
- `GET /api/stats/brag-strip` returns all stats
- Single endpoint, optimized response
- Can expand with query params later (e.g., `?period=month`)

---

## Supporting Features

### #31: User Settings Modal

Required for community programs (display name) but useful on its own.

**Settings to Add:**
- **Display Name**: Used for community program author attribution
- **Weight Units**: lbs/kg preference
- **Intensity Preferences**: RPE vs RIR

**UI**: Modal accessible from header/nav

---

## Out of Scope (For Now)

These are explicitly NOT part of the current plan:

### AI + DevOps (Future Work)

Ideas under consideration but not yet planned:
- LangGraph + GCP for program feedback
- AI-generated program summaries for community programs
- Automated coaching suggestions based on logged sets

**Why not now?** Need to validate friend usage first and establish materialized view infrastructure. AI work builds on these foundations.

### Advanced Analytics (#32)

Exercise-specific performance tracking:
- Max 10 rep max for bench press
- Volume trends per exercise
- PR detection and progression analysis

**Why not now?** Brag Strip (#89) establishes the materialized view patterns. Advanced analytics come after that foundation is proven.

---

## Development Order

Recommended sequence:

1. **Bug Fixes** (#75, #63, #80, #87)
   - Clean slate before new features
   - Quick wins, no architectural changes

2. **Exercise Database Expansion** (#90)
   - Batch-generate with AI (fast)
   - Required before community programs are useful

3. **User Settings Modal** (#31)
   - Small feature, needed for next step
   - Adds display name for attribution

4. **Community Programs** (#86)
   - Biggest architectural lift
   - Can test with expanded exercise library
   - Enables friend onboarding

5. **Brag Strip** (#89)
   - Materialized views learning opportunity
   - Gives friends something to share
   - Foundation for future analytics

---

## Success Metrics

### Phase 1 (Bug Fixes):
- ✅ All 4 bugs resolved
- ✅ App stable on mobile and desktop

### Phase 2 (Exercise Database):
- ✅ 200+ exercise definitions added
- ✅ Coverage for bodyweight, limited equipment, climbing

### Phase 3 (Community Programs):
- ✅ At least 3 starter programs published (newbie strength, C25K, bodyweight)
- ✅ 5-6 friends able to sign up and start a program without CSV import

### Phase 4 (Brag Strip):
- ✅ Materialized views implemented and performant
- ✅ Screenshot-friendly stats page live
- ✅ Foundation in place for advanced analytics

### Ultimate Goal:

**Validate friend usage.** If 5-6 friends actually use the app for 2+ weeks with community programs, that's a strong signal. If not, pivot to AI/DevOps work that teaches marketable skills.

---

## Timeline Expectations

No specific time estimates provided (per project standards), but phases are ordered by:
1. **Simplicity**: Bugs first, big features last
2. **Dependencies**: Exercise database before community programs
3. **Risk**: Validate friend interest before over-investing in polish

Each phase is independently valuable and can be shipped separately.
