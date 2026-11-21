# Exercise Performance Tracking - Architecture & Design Reference

**Purpose**: Design document for implementing exercise performance tracking and data analysis features.

**Date Created**: 2026-01-15

---

## Table of Contents

1. [Overview](#overview)
2. [Key Metrics to Track](#key-metrics-to-track)
3. [Current Schema Analysis](#current-schema-analysis)
4. [Architectural Patterns](#architectural-patterns)
5. [Recommended Implementation](#recommended-implementation)
6. [Query Patterns](#query-patterns)
7. [UI/UX Considerations](#uiux-considerations)
8. [References](#references)

---

## Overview

Users want to see exercise performance over time to track progress and identify trends. Leading fitness apps (Alpha Progression, Strong, JEFIT) use pre-computed aggregates rather than raw data queries for performance.

**Key Principle**: Decouple atomic events (logged sets) from derived metrics (performance summaries) for fast queries and flexible analysis.

---

## Key Metrics to Track

### 1. Volume Load
**Definition**: Total weight lifted over time
**Formula**: `sum(reps × weight)` per workout or time period
**Use Case**: Track total training volume week-over-week

**Example**:
```
Workout 1: 3 sets × 10 reps × 100 lbs = 3,000 lbs
Workout 2: 4 sets × 8 reps × 110 lbs = 3,520 lbs
```

### 2. Estimated 1-Rep Max (1RM)
**Definition**: Maximum weight you could lift for one rep
**Formula (Epley)**: `weight × (1 + reps / 30)`
**Use Case**: Track strength progression independent of rep ranges

**Example**:
```
8 reps @ 160 lbs → Estimated 1RM = 160 × (1 + 8/30) = ~203 lbs
5 reps @ 185 lbs → Estimated 1RM = 185 × (1 + 5/30) = ~216 lbs
```

### 3. Personal Records (PRs)
**Definition**: Best performance for specific rep ranges
**Tracked**: 1RM, 3RM, 5RM, 10RM, etc.
**Use Case**: Celebrate milestones, track strength peaks

**Example**:
```
Best 1RM: 225 lbs (2025-12-15)
Best 5RM: 185 lbs (2026-01-10)
Best 10RM: 155 lbs (2025-11-20)
```

### 4. Top Set (Heaviest Set)
**Definition**: Highest weight × reps in a workout
**Formula**: `max(weight × reps)` per workout
**Use Case**: Quick "did I do better today?" indicator

### 5. Total Sets & Reps
**Definition**: Count of sets/reps performed
**Use Case**: Track training frequency and volume trends

### 6. Intensity Metrics
**RPE (Rate of Perceived Exertion)**: 1-10 scale of difficulty
**RIR (Reps in Reserve)**: How many more reps could be done
**Use Case**: Track fatigue, adjust programming

### 7. Time-Based Metrics
- **Last Performed**: When exercise was last done
- **Frequency**: How often exercise is performed (per week/month)
- **Consistency**: Gaps between sessions

### 8. Progressive Overload Indicators
- Week-over-week volume change (+/- %)
- Weight progression timeline
- Rep progression at same weight

---

## Current Schema Analysis

### What We Have (✅ Good Foundation)

**Atomic Events Stored**:
```prisma
model LoggedSet {
  id           String            @id
  setNumber    Int               // Set position
  reps         Int               // Actual reps completed
  weight       Float             // Actual weight used
  weightUnit   String            // "lbs" or "kg"
  rpe          Int?              // Rate of perceived exertion
  rir          Int?              // Reps in reserve
  exerciseId   String
  completionId String
  createdAt    DateTime

  exercise     Exercise          @relation(...)
  completion   WorkoutCompletion @relation(...)
}
```

**Canonical Exercise Identity**:
```prisma
model ExerciseDefinition {
  id             String   @id
  name           String   // "Barbell Bench Press"
  normalizedName String   @unique

  exercises      Exercise[]  // Can track across programs
}
```

**Time Series Data**:
```prisma
model WorkoutCompletion {
  id          String   @id
  completedAt DateTime @default(now())  // Timestamp for time series
  status      String   // "completed", "draft", "abandoned"
}
```

### Why This Is Perfect

1. ✅ **Event Sourcing Ready**: Raw sets are immutable source of truth
2. ✅ **Cross-Program Tracking**: ExerciseDefinition links all "Bench Press" regardless of program
3. ✅ **Time Series Data**: completedAt enables chronological analysis
4. ✅ **Flexible Metrics**: All raw data (reps, weight, RPE) available for any calculation
5. ✅ **Rebuildable**: Can recalculate aggregates anytime from raw sets

### What's Missing

❌ **Derived/Aggregate Layer**: No pre-computed metrics for fast queries
❌ **Performance Index**: Missing composite index for time-series queries
❌ **Denormalization**: Requires 3-table JOIN for performance queries

**Current Query Path** (slow):
```
LoggedSet → Exercise → ExerciseDefinition
         → WorkoutCompletion (for timestamp)
```

---

## Architectural Patterns

### Pattern 1: Event Sourcing + Materialized Views

**What It Is**: Store atomic events, maintain derived aggregates separately

**Example**:
- **Events**: Individual set logs (source of truth)
- **Projections**: Pre-computed performance metrics (fast reads)

**Benefits**:
- Immutable event history
- Fast reads from aggregates
- Can rebuild aggregates if formula changes
- Supports any future metric

**Trade-offs**:
- Write complexity (update both events + aggregates)
- Data duplication
- Consistency concerns (what if aggregate update fails?)

### Pattern 2: CQRS (Command Query Responsibility Segregation)

**What It Is**: Separate write models from read models

**For FitCSV**:
- **Write Model**: LoggedSet, WorkoutCompletion (optimized for writes)
- **Read Model**: ExercisePerformanceMetrics (optimized for queries)

**Benefits**:
- Write and read paths optimized independently
- Read model can be structured for specific queries
- Scales better (read-heavy workloads)

### Pattern 3: Incremental Aggregation

**What It Is**: Update aggregates incrementally as events arrive (not batch recalculation)

**Example**:
```typescript
// When logging a set
async function logSet(userId, exerciseDefId, set) {
  // 1. Store atomic event
  await prisma.loggedSet.create({ data: set })

  // 2. Update aggregates incrementally
  await prisma.exerciseMetrics.update({
    where: { userId_exerciseDefId },
    data: {
      totalSets: { increment: 1 },
      totalVolume: { increment: set.reps * set.weight },
      maxWeight: Math.max(existing, set.weight),
      lastPerformed: new Date()
    }
  })
}
```

**Benefits**:
- No batch jobs needed
- Metrics always up-to-date
- Constant-time updates (don't scan all sets)

---

## Recommended Implementation

### Phase 1: Add Aggregate Table

**New Schema**:
```prisma
model ExercisePerformanceMetrics {
  id                   String            @id @default(cuid())
  exerciseDefinitionId String
  exerciseDefinition   ExerciseDefinition @relation(fields: [exerciseDefinitionId], references: [id], onDelete: Cascade)
  userId               String

  // All-time aggregates (updated incrementally)
  totalSets            Int      @default(0)
  totalReps            Int      @default(0)
  totalVolume          Float    @default(0)  // sum(reps × weight)
  maxWeight            Float    @default(0)
  estimated1RM         Float    @default(0)  // Max across all sets
  avgRPE               Float?
  lastPerformed        DateTime?

  // Personal records
  pr1RM                Float?
  pr3RM                Float?
  pr5RM                Float?
  pr10RM               Float?

  // Metadata
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@unique([exerciseDefinitionId, userId])
  @@index([exerciseDefinitionId])
  @@index([userId])
}
```

**Why This Works**:
- One record per exercise per user (simple)
- Stores all-time aggregates (most common queries)
- Updated incrementally when logging sets
- Fast queries (no joins, no aggregation)

### Phase 2: Update Logic

**When Logging a Set**:
```typescript
async function logWorkoutSet(userId: string, data: LogSetData) {
  // 1. Store atomic event (source of truth)
  const loggedSet = await prisma.loggedSet.create({
    data: {
      exerciseId: data.exerciseId,
      completionId: data.completionId,
      setNumber: data.setNumber,
      reps: data.reps,
      weight: data.weight,
      weightUnit: data.weightUnit,
      rpe: data.rpe,
      rir: data.rir
    },
    include: {
      exercise: {
        include: { exerciseDefinition: true }
      }
    }
  })

  // 2. Calculate metrics for this set
  const volume = data.reps * data.weight
  const estimated1RM = data.weight * (1 + data.reps / 30)

  // 3. Update aggregates (upsert for first-time exercises)
  await prisma.exercisePerformanceMetrics.upsert({
    where: {
      exerciseDefinitionId_userId: {
        exerciseDefinitionId: loggedSet.exercise.exerciseDefinitionId,
        userId
      }
    },
    create: {
      exerciseDefinitionId: loggedSet.exercise.exerciseDefinitionId,
      userId,
      totalSets: 1,
      totalReps: data.reps,
      totalVolume: volume,
      maxWeight: data.weight,
      estimated1RM: estimated1RM,
      lastPerformed: new Date()
    },
    update: {
      totalSets: { increment: 1 },
      totalReps: { increment: data.reps },
      totalVolume: { increment: volume },
      maxWeight: Math.max(existing.maxWeight, data.weight),
      estimated1RM: Math.max(existing.estimated1RM, estimated1RM),
      lastPerformed: new Date()
    }
  })

  // 4. Check for PRs and update if needed
  await updatePersonalRecords(userId, loggedSet)

  return loggedSet
}
```

### Phase 3: Query Patterns

**Show Exercise Dashboard**:
```typescript
async function getExerciseMetrics(userId: string, exerciseDefId: string) {
  // Single query, instant results
  const metrics = await prisma.exercisePerformanceMetrics.findUnique({
    where: {
      exerciseDefinitionId_userId: {
        exerciseDefinitionId: exerciseDefId,
        userId
      }
    },
    include: {
      exerciseDefinition: {
        select: { name: true }
      }
    }
  })

  return metrics
  // Returns: { totalVolume: 250000, max1RM: 315, totalSets: 450, ... }
}
```

**Show All Exercises Summary**:
```typescript
async function getAllExerciseMetrics(userId: string) {
  // Fast query - no joins to LoggedSet
  const allMetrics = await prisma.exercisePerformanceMetrics.findMany({
    where: { userId },
    include: {
      exerciseDefinition: {
        select: { name: true, category: true }
      }
    },
    orderBy: { lastPerformed: 'desc' }
  })

  return allMetrics
}
```

**Detailed Timeline (When Needed)**:
```typescript
async function getExerciseTimeline(userId: string, exerciseDefId: string, since: Date) {
  // For charts/graphs - query raw sets
  const sets = await prisma.loggedSet.findMany({
    where: {
      exercise: {
        exerciseDefinitionId: exerciseDefId,
        userId
      },
      completion: {
        status: 'completed',
        completedAt: { gte: since }
      }
    },
    include: {
      completion: {
        select: { completedAt: true }
      }
    },
    orderBy: {
      completion: { completedAt: 'asc' }
    }
  })

  // Group by date and calculate per-workout metrics
  const byDate = groupBy(sets, set =>
    set.completion.completedAt.toISOString().split('T')[0]
  )

  return Object.entries(byDate).map(([date, sets]) => ({
    date,
    volume: sets.reduce((sum, s) => sum + (s.reps * s.weight), 0),
    estimated1RM: Math.max(...sets.map(s => s.weight * (1 + s.reps / 30))),
    maxWeight: Math.max(...sets.map(s => s.weight)),
    totalSets: sets.length
  }))
}
```

### Phase 4: Rebuild Mechanism

**In Case Aggregates Get Out of Sync**:
```typescript
async function rebuildExerciseMetrics(userId: string, exerciseDefId: string) {
  // Fetch all logged sets for this exercise
  const allSets = await prisma.loggedSet.findMany({
    where: {
      exercise: {
        exerciseDefinitionId: exerciseDefId,
        userId
      },
      completion: { status: 'completed' }
    },
    include: {
      completion: { select: { completedAt: true } }
    }
  })

  // Recalculate from scratch
  const metrics = {
    totalSets: allSets.length,
    totalReps: allSets.reduce((sum, s) => sum + s.reps, 0),
    totalVolume: allSets.reduce((sum, s) => sum + (s.reps * s.weight), 0),
    maxWeight: Math.max(...allSets.map(s => s.weight)),
    estimated1RM: Math.max(...allSets.map(s => s.weight * (1 + s.reps / 30))),
    lastPerformed: new Date(Math.max(...allSets.map(s => s.completion.completedAt.getTime())))
  }

  // Update or create
  await prisma.exercisePerformanceMetrics.upsert({
    where: {
      exerciseDefinitionId_userId: { exerciseDefinitionId: exerciseDefId, userId }
    },
    create: { ...metrics, exerciseDefinitionId: exerciseDefId, userId },
    update: metrics
  })
}
```

---

## Query Patterns

### Pattern 1: Fast Dashboard (Use Aggregates)

**Goal**: Show summary cards for all exercises

```typescript
// Instant - no aggregation needed
const metrics = await prisma.exercisePerformanceMetrics.findMany({
  where: { userId },
  select: {
    exerciseDefinition: { select: { name: true } },
    totalVolume: true,
    estimated1RM: true,
    lastPerformed: true
  }
})
```

### Pattern 2: Detailed Charts (Use Raw Sets)

**Goal**: Show volume/1RM progression over last 6 months

```typescript
// Acceptable performance for time-bounded queries
const sets = await prisma.loggedSet.findMany({
  where: {
    exercise: { exerciseDefinitionId, userId },
    completion: {
      status: 'completed',
      completedAt: { gte: sixMonthsAgo }
    }
  },
  include: {
    completion: { select: { completedAt: true } }
  }
})

// Transform in application layer
const chartData = transformToTimeSeries(sets)
```

### Pattern 3: Hybrid (Best of Both)

**Goal**: Show quick stats + detailed chart

```typescript
// 1. Get instant summary from aggregates
const summary = await prisma.exercisePerformanceMetrics.findUnique({
  where: { exerciseDefinitionId_userId: { exerciseDefId, userId } }
})

// 2. Get detailed data for chart (only recent)
const recentSets = await prisma.loggedSet.findMany({
  where: {
    exercise: { exerciseDefinitionId: exerciseDefId, userId },
    completion: { completedAt: { gte: threeMonthsAgo } }
  },
  // ... rest of query
})

return { summary, chartData: transformToTimeSeries(recentSets) }
```

---

## UI/UX Considerations

### Dashboard View (Home Screen)

**Show**:
- Recently performed exercises (last 7 days)
- Quick stats: Total workouts this week, total volume this month
- Top 3-5 exercises by frequency

**Data Source**: ExercisePerformanceMetrics (instant)

### Exercise Detail View (Per Exercise)

**Show**:
- All-time stats (volume, 1RM, PRs)
- Last 5 performances (date, sets, top weight)
- Chart: Volume over last 3 months
- Chart: Estimated 1RM trend

**Data Source**:
- Header stats: ExercisePerformanceMetrics (instant)
- Charts: Raw LoggedSets (acceptable for 3-month window)

### Progress Charts

**Options**:
1. **Volume Over Time**: Line chart, weekly totals
2. **1RM Progression**: Line chart with trend line
3. **Weight × Reps Heatmap**: Calendar view showing intensity
4. **Frequency**: Bar chart, sessions per week

**Implementation**: Query raw sets, aggregate in frontend

### Comparison View (Alpha Progression Style)

**Show**: Side-by-side comparison of 2 exercises or 2 time periods

**Example**:
```
Bench Press: Jan 2026 vs Dec 2025
Volume: 45,000 lbs (+12%)
Avg 1RM: 225 lbs (+5%)
Sessions: 8 (+2)
```

---

## Performance Considerations

### Indexes Needed

```prisma
model LoggedSet {
  // ... existing fields

  @@index([exerciseId, createdAt])  // Time series per exercise
  @@index([userId, createdAt])      // User timeline
}

model ExercisePerformanceMetrics {
  // ... existing fields

  @@index([userId, lastPerformed])  // Recent activity queries
  @@index([exerciseDefinitionId, userId])  // Already has @@unique, acts as index
}
```

### When to Use Aggregates vs Raw Queries

**Use Aggregates (ExercisePerformanceMetrics) when**:
- Showing summary stats (dashboard, cards)
- All-time totals
- "At a glance" metrics
- Listing all exercises

**Use Raw Queries (LoggedSet) when**:
- Detailed charts (time series)
- Comparing specific workouts
- Auditing/debugging
- Time-bounded analysis (last 3 months)

### Optimization Strategy

1. **Start Simple**: Query raw sets, no aggregates
2. **Measure**: Profile queries, identify slow paths
3. **Add Aggregates**: Only for queries hitting performance issues
4. **Hybrid Approach**: Use aggregates for summaries, raw sets for details

---

## Migration Strategy

### Step 1: Add Schema (No Behavior Change)

```bash
# Add ExercisePerformanceMetrics table
npx prisma migrate dev --name add_exercise_performance_metrics
```

### Step 2: Backfill Existing Data

```typescript
// One-time script
async function backfillMetrics() {
  const users = await prisma.user.findMany() // Pseudocode

  for (const user of users) {
    const exercises = await prisma.exerciseDefinition.findMany()

    for (const exercise of exercises) {
      await rebuildExerciseMetrics(user.id, exercise.id)
    }
  }
}
```

### Step 3: Update Write Path

Add aggregate updates to set logging logic (see Phase 2 above)

### Step 4: Update Read Path

Switch dashboard/summary views to use aggregates

### Step 5: Monitor & Validate

- Compare aggregate totals vs raw queries (spot check)
- Monitor for drift
- Add alerts if aggregates fall out of sync

---

## Alternative: Local-First Architecture

### For Native App (Expo)

**Different Trade-offs**:
- Store everything in local SQLite
- Writes instant (0-5ms)
- No network latency
- Sync in background

**Schema Considerations**:
- Can afford more complex queries (local is fast)
- Still benefit from aggregates (instant dashboard)
- Sync strategy for aggregates (merge conflicts?)

**Recommendation**:
- Store raw sets locally
- Calculate aggregates on-device
- Sync both events + aggregates to server
- Use server aggregates as backup/validation

---

## References

### Research Sources

- [Alpha Progression Gym Tracker](https://alphaprogression.com/en)
- [Best Workout Tracker App for 2026](https://www.hevyapp.com/best-workout-tracker-app/)
- [JEFIT Workout Tracker](https://www.jefit.com)
- [Progressive Overload Guide](https://www.hevyapp.com/progressive-overload/)
- [How To Calculate 1 Rep Max](https://www.healthline.com/health/fitness/one-rep-max-how-to-calculate-and-use)
- [Volume Load and Muscular Adaptation (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4215195/)

### Architectural Patterns

- **Event Sourcing**: Store immutable events, derive current state
- **CQRS**: Separate write models from read models
- **Materialized Views**: Pre-computed aggregates for fast queries
- **Incremental Aggregation**: Update aggregates as events arrive

### Similar Applications

- **GitHub**: Commits (events) + repo stats (aggregates)
- **Stripe**: Charges (events) + customer metrics (aggregates)
- **Google Analytics**: Pageviews (events) + daily reports (aggregates)
- **Slack**: Messages (events) + unread counts (aggregates)

### Related Docs

- `/docs/ARCHITECTURE.md` - Overall system design
- `/docs/CSV_SPEC.md` - CSV import format
- `/prisma/schema.prisma` - Current database schema

---

## Next Steps

### Immediate (When Ready to Implement)

1. Add `ExercisePerformanceMetrics` table to schema
2. Create migration
3. Write backfill script for existing data
4. Update set logging to maintain aggregates
5. Create API endpoint: `GET /api/exercises/:id/metrics`

### Future Enhancements

1. **Time-Windowed Metrics**: Add weekly/monthly rollups
2. **Comparison Features**: Compare periods, exercises
3. **Goals & Targets**: Set volume/weight goals, track progress
4. **Advanced Charts**: Moving averages, trend lines
5. **Export**: CSV export of performance data

### Performance Optimization

1. Add composite indexes if queries slow
2. Consider denormalizing `exerciseDefinitionId` into `LoggedSet`
3. Add caching layer (Redis) for frequently accessed metrics
4. Monitor query performance with `pg_stat_statements`

---

**Last Updated**: 2026-01-15
**Status**: Reference Document - Not Yet Implemented
**Next Review**: When implementing exercise tracking features
