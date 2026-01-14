# RLS Optimization Guide

## Overview

This guide walks through applying optimized Row Level Security (RLS) policies to fix performance issues on Supabase Free tier.

## Problem Summary

Your current RLS policies are causing severe performance degradation on Supabase Free tier due to:

1. **Uncached auth.uid() calls** - Evaluated per-row instead of once per query
2. **No authenticated user filter** - Policies evaluate even for anonymous users
3. **Multiple JOINs** - PrescribedSet policy has 4 JOINs, Exercise has 3 JOINs

**Impact**: 50-200ms delays per query, especially on nested queries like loading a program with all weeks/workouts/exercises.

## Solution

Three optimized policy files have been created:

1. **`prisma/rls-policies-optimized.sql`** - Strength training policies (7 policies)
2. **`prisma/rls-policies-cardio-optimized.sql`** - Cardio training policies (5 policies)

### Key Optimizations Made

#### 1. Cached auth.uid()

**Before:**
```sql
WHERE "userId" = auth.uid()::text
```

**After:**
```sql
WHERE "userId" = (SELECT auth.uid())::text
```

**Impact**: `auth.uid()` is evaluated once per policy check instead of once per row.

#### 2. TO authenticated Clause

**Before:**
```sql
CREATE POLICY "users_own_programs" ON "Program"
  FOR ALL
  USING (...)
```

**After:**
```sql
CREATE POLICY "users_own_programs" ON "Program"
  FOR ALL
  TO authenticated
  USING (...)
```

**Impact**: Policy is skipped entirely for anonymous users (your app doesn't allow anon access anyway).

#### 3. Nested IN Subqueries Instead of JOINs

**Before (PrescribedSet - WORST OFFENDER):**
```sql
USING (
  "exerciseId" IN (
    SELECT e.id FROM "Exercise" e
    JOIN "Workout" wo ON wo.id = e."workoutId"
    JOIN "Week" w ON w.id = wo."weekId"
    JOIN "Program" p ON p.id = w."programId"
    WHERE p."userId" = auth.uid()::text
  )
)
```

**After (PrescribedSet - OPTIMIZED):**
```sql
USING (
  "exerciseId" IN (
    SELECT id FROM "Exercise"
    WHERE "workoutId" IN (
      SELECT id FROM "Workout"
      WHERE "weekId" IN (
        SELECT id FROM "Week"
        WHERE "programId" IN (
          SELECT id FROM "Program"
          WHERE "userId" = (SELECT auth.uid())::text
        )
      )
    )
  )
)
```

**Impact**: Query planner can optimize nested subqueries better than JOINs, especially with proper indexes.

## How to Apply

### Step 1: Backup Current Policies (Optional)

If you want to be able to rollback, save your current policies:

```sql
-- Run in Supabase SQL Editor
SELECT * FROM pg_policies WHERE tablename IN (
  'Program', 'Week', 'Workout', 'Exercise', 'PrescribedSet',
  'WorkoutCompletion', 'LoggedSet', 'CardioProgram', 'CardioWeek',
  'PrescribedCardioSession', 'LoggedCardioSession', 'UserCardioMetricPreferences'
);
```

### Step 2: Apply Strength Training Policies

1. Open Supabase Dashboard → SQL Editor
2. Open `/Users/dustin/repos/fitcsv/prisma/rls-policies-optimized.sql`
3. Copy entire file
4. Paste into SQL Editor
5. Click "Run"

**Expected output**: Success messages for all 7 policies.

### Step 3: Apply Cardio Policies

1. Open `/Users/dustin/repos/fitcsv/prisma/rls-policies-cardio-optimized.sql`
2. Copy entire file
3. Paste into SQL Editor
4. Click "Run"

**Expected output**: Success messages for all 5 policies.

### Step 4: Verify Policies Are Active

Run this query to confirm policies are enabled:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN (
  'Program', 'Week', 'Workout', 'Exercise', 'PrescribedSet',
  'WorkoutCompletion', 'LoggedSet', 'CardioProgram', 'CardioWeek',
  'PrescribedCardioSession', 'LoggedCardioSession', 'UserCardioMetricPreferences'
)
ORDER BY tablename, policyname;
```

You should see 12 policies total (7 strength + 5 cardio).

## Expected Performance Improvement

### Before Optimization (Current State)
- Loading `/training` page: **2-5 seconds** (or timeout)
- Loading workout detail: **1-3 seconds**
- Loading program with all weeks: **3-10 seconds** (or timeout)

### After Optimization (Expected)
- Loading `/training` page: **300-800ms**
- Loading workout detail: **200-500ms**
- Loading program with all weeks: **500-1500ms**

**Improvement: 5-10x faster on Supabase Free tier**

According to Supabase documentation, properly optimized RLS policies can see **10-100x improvement** on complex queries.

## Testing After Application

### 1. Test Training Dashboard

```bash
# Navigate to your app
open http://localhost:3000/training
```

**What to check:**
- Page loads in under 1 second
- "This Week" section displays correctly
- Stats cards show correct values
- Workout history loads and expands properly

### 2. Test Workout Detail

```bash
# Navigate to a workout
open http://localhost:3000/programs/{program-id}/workouts/{workout-id}
```

**What to check:**
- Workout loads in under 500ms
- All exercises and prescribed sets display
- Logging sets works correctly

### 3. Test Cardio Dashboard

```bash
open http://localhost:3000/cardio
```

**What to check:**
- Page loads in under 1 second
- Current week displays (if you have active cardio program)
- Stats and history load correctly

### 4. Check Supabase Logs

1. Open Supabase Dashboard → Logs → Postgres Logs
2. Look for slow queries (> 100ms)
3. Should see significantly fewer slow queries after optimization

## Rollback (If Needed)

If you need to rollback to the old policies:

1. Open `/Users/dustin/repos/fitcsv/prisma/rls-policies.sql` (old strength policies)
2. Run in SQL Editor

3. Open `/Users/dustin/repos/fitcsv/prisma/migrations/manual_cardio_tables.sql` (scroll to RLS section)
4. Run the RLS section (lines 117-145) in SQL Editor

## Next Steps

If RLS optimization alone doesn't fully solve the performance issues, the next steps would be:

### Option 1: Enable Prisma relationJoins (Application-Level)

Add to `prisma/schema.prisma`:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["relationJoins"]
}
```

Then use in queries:

```typescript
const program = await prisma.program.findFirst({
  relationLoadStrategy: 'join',  // Single query with JOINs
  where: { userId, isActive: true },
  include: { weeks: { include: { workouts: true } } }
})
```

### Option 2: Denormalize userId to Child Tables (Schema-Level)

Add `userId` directly to `Week`, `Workout`, `Exercise` tables:

```prisma
model Week {
  id         String  @id @default(cuid())
  weekNumber Int
  programId  String
  userId     String  // Add this
  program    Program @relation(fields: [programId], references: [id])

  @@index([userId])  // Add index
}
```

Then update RLS policies to use direct `userId` check (much faster).

### Option 3: Use Security Definer Functions (Database-Level)

Create a Postgres function that bypasses RLS on intermediate tables:

```sql
CREATE OR REPLACE FUNCTION get_user_program_ids()
RETURNS SETOF TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM "Program" WHERE "userId" = auth.uid()::text
$$;
```

Then use in policies:

```sql
CREATE POLICY "..." ON "Week"
USING ("programId" IN (SELECT get_user_program_ids()));
```

## References

- Supabase RLS Performance Guide: https://supabase.com/docs/guides/database/postgres/row-level-security#improve-performance
- Postgres Query Optimization: https://www.postgresql.org/docs/current/sql-explain.html
- Performance Analysis Document: `/Users/dustin/repos/fitcsv/performance-analysis.md`
- Original RLS Policies: `/Users/dustin/repos/fitcsv/prisma/rls-policies.sql`

## Summary

**Action Required:**
1. Copy and run `prisma/rls-policies-optimized.sql` in Supabase SQL Editor
2. Copy and run `prisma/rls-policies-cardio-optimized.sql` in Supabase SQL Editor
3. Test your app - should see 5-10x performance improvement

**Expected Result:**
- Queries complete in 200-1000ms instead of 2-10 seconds
- No more timeouts on training dashboard
- Smooth user experience on Supabase Free tier

**If issues persist:**
- Consider enabling Prisma `relationJoins` (next optimization layer)
- Monitor Supabase logs to identify remaining bottlenecks
- May need to denormalize `userId` to child tables for maximum performance
