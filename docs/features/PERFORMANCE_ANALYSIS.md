# Performance Analysis & Optimization Recommendations

## Executive Summary

Analysis of database queries reveals several opportunities for optimization through strategic indexing and query optimization.

## Current Issues

### 1. Workout Detail Page (Strength Training)
**Current LCP**: ~3.15s

**Query Analysis**:
- Main workout query: Fetches workout + exercises + prescribedSets + completions + loggedSets
- Exercise history query: Previously N+1 queries (FIXED in latest commit)
- Missing indexes for common query patterns

**Data Fetched**:
```
Workout
├── Week (weekNumber only)
│   └── Program (userId only for auth)
├── Exercises (6 exercises avg)
│   ├── PrescribedSets (3-5 sets each = 18-30 total)
│   └── ExerciseDefinitionId (for history lookup)
└── Completions (1 most recent)
    └── LoggedSets (all sets for this completion)
```

### 2. Cardio Program Detail Page
**Query**: Fetches entire program tree with ALL weeks, sessions, and logged sessions

**Data Fetched**:
```
CardioProgram
└── Weeks (all weeks, e.g., 12)
    └── Sessions (4-6 per week = 48-72 total)
        └── LoggedSessions (1 most recent per session)
```

**Issue**: Over-fetching for display that only shows current/next week

### 3. Exercise History Query (getBatchExercisePerformance)
**Query Pattern**:
```sql
SELECT * FROM WorkoutCompletion
WHERE userId = ?
  AND status = 'completed'
  AND loggedSets contains any exerciseDefinitionId IN (...)
ORDER BY completedAt DESC
LIMIT 50
```

**Missing Index**: No compound index on `(userId, status, completedAt)` with join optimization

## Recommended Indexes

### Added to Schema (Awaiting Application)

1. **LoggedSet** - Composite index for completion+exercise filtering:
   ```prisma
   @@index([completionId, exerciseId])
   ```
   - **Use Case**: When fetching logged sets for a specific workout completion
   - **Query**: `WHERE completionId = ? AND exerciseId = ?`

2. **Exercise** - Composite index for exercise history queries:
   ```prisma
   @@index([exerciseDefinitionId, userId])
   ```
   - **Use Case**: Finding exercises by definition for history lookup
   - **Query**: `WHERE exerciseDefinitionId IN (...) AND userId = ?`

3. **LoggedCardioSession** - Composite index for nested session queries:
   ```prisma
   @@index([prescribedSessionId, userId, completedAt])
   ```
   - **Use Case**: Finding most recent logged session for each prescribed session
   - **Query**: `WHERE prescribedSessionId = ? AND userId = ? ORDER BY completedAt DESC`

## Optimizations Already Implemented

### 1. Eliminated N+1 Query Pattern (✅ Completed)
- **Before**: 7 queries for 6-exercise workout (1 main + 6 individual history)
- **After**: 2 queries (1 main + 1 batch history)
- **File**: `lib/queries/exercise-history.ts:29` - `getBatchExercisePerformance()`

### 2. Explicit Field Selection (✅ Completed)
- **Before**: Using `include` which fetches all fields
- **After**: Using `select` for only required fields
- **File**: `app/(app)/programs/[id]/workouts/[workoutId]/page.tsx:24-99`
- **Reduction**: ~30% less data transferred

### 3. Limited History Fetch (✅ Completed)
- **Added**: `take: 50` limit on workout completion history
- **File**: `lib/queries/exercise-history.ts:54`
- **Impact**: Prevents scanning entire user history

### 4. Loading Skeleton (✅ Completed)
- **Added**: `loading.tsx` for workout detail page
- **Impact**: Instant visual feedback, better perceived performance

### 5. Programs Page Cardio Query (✅ Completed)
- **Before**: Fetched ALL weeks + ALL sessions (48-72 records for 12-week program)
- **After**: Only fetch week count + session count via `_count`
- **File**: `app/(app)/programs/page.tsx:30-47`

## Remaining Optimizations

### High Priority

1. **Apply Database Indexes**
   - **Blocker**: Supabase pooler permissions
   - **Options**:
     - Use DIRECT_URL temporarily for `db push`
     - Apply indexes manually via Supabase dashboard
     - Use Supabase CLI migration tools

2. **Cardio Program Detail Query Optimization**
   - **File**: `app/(app)/cardio/programs/[id]/page.tsx:24-46`
   - **Current**: Fetches ALL weeks + sessions
   - **Recommendation**: Only fetch current week + summary counts
   - **Expected Impact**: 80-90% reduction in data for 12-week programs

3. **Add Loading Skeletons for Cardio Pages**
   - Add `loading.tsx` for cardio program detail page
   - Add `loading.tsx` for cardio logging pages

### Medium Priority

4. **Add Route Segment Config**
   - Consider `export const revalidate = 30` for cardio detail pages
   - Already added for main navigation pages

5. **Optimize Workout Completions Query**
   - Consider pagination for workout history
   - Currently fetches last 5, but could implement "load more"

### Low Priority

6. **Database Connection Pooling**
   - Evaluate if Supabase pooler settings are optimal
   - Consider adjusting pool size for performance vs cost

7. **Consider Denormalization**
   - Add `sessionCount` to `CardioWeek` to avoid counting on every query
   - Add `weekCount` to `CardioProgram` to avoid counting on every query
   - Trade-off: Faster reads, slightly more complex writes

## Query Patterns to Monitor

### Most Frequent Queries (Based on User Flow)

1. **Load Training Page**: Active program + current week + recent history
2. **Load Workout Detail**: Specific workout + exercise history
3. **Log Sets**: Insert logged sets + update completion
4. **Load Programs Page**: All active programs + archived counts
5. **Load Cardio Program**: Full program tree (currently over-fetching)

### Queries That Need Indexes

| Query | Current Index | Needed Index | Impact |
|-------|--------------|--------------|--------|
| Exercise history by definition | `exerciseDefinitionId` | `(exerciseDefinitionId, userId)` | High |
| Logged sets by completion | `completionId` | `(completionId, exerciseId)` | Medium |
| Logged cardio by prescription | `prescribedSessionId` | `(prescribedSessionId, userId, completedAt)` | High |
| Workout completions for history | `(userId, status, completedAt)` | ✅ Already exists | - |

## Network Latency Considerations

**Known Issue**: Supabase network latency (~200-300ms per query)

**Mitigation Strategies**:
1. ✅ Reduce number of queries (batch operations)
2. ✅ Reduce payload size (explicit field selection)
3. ✅ Add loading states (better perceived performance)
4. ⏳ Apply indexes (faster query execution)
5. 🔄 Consider edge caching for static program data
6. 🔄 Evaluate Supabase region (currently us-west-2)

## Testing Recommendations

1. **Measure Query Performance**:
   ```bash
   # Enable Prisma query logging
   DEBUG="prisma:query" doppler run -- npm run dev
   ```

2. **Test with Production Data Volume**:
   - User with 50+ completed workouts
   - Programs with 12+ weeks
   - Exercise history spanning multiple programs

3. **Monitor After Index Application**:
   - Track LCP improvements
   - Monitor database CPU usage
   - Check for any query plan regressions

## Next Steps

1. ✅ Document performance issues and recommendations (this file)
2. ⏳ Apply database indexes (requires permissions resolution)
3. ⏳ Optimize cardio program detail query
4. ⏳ Add loading skeletons for cardio pages
5. ⏳ Test and measure improvements
6. ⏳ Consider denormalization if query times still high

## References

- Exercise history optimization: `lib/queries/exercise-history.ts`
- Workout detail optimization: `app/(app)/programs/[id]/workouts/[workoutId]/page.tsx`
- Programs page optimization: `app/(app)/programs/page.tsx`
- Schema with new indexes: `prisma/schema.prisma`
