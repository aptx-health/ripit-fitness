# RIPIT Schema Performance Analysis

## Executive Summary

Your performance issues on Supabase Free tier likely stem from a combination of factors, with **RLS policy design** and **deep nested query structure** being the most probable culprits. The fact that it works fine locally (without RLS) strongly supports this hypothesis.

---

## 🔴 Critical Issues

### 1. RLS Policies on Tables Without Direct `userId` (HIGH IMPACT)

This is likely your **biggest problem**. Looking at your schema:

**Tables with direct `userId`:**
- `Program` ✅
- `WorkoutCompletion` ✅
- `LoggedCardioSession` ✅
- `CardioProgram` ✅
- `UserCardioMetricPreferences` ✅

**Tables WITHOUT direct `userId` (problematic for RLS):**
- `Week` ❌
- `Workout` ❌
- `Exercise` ❌
- `PrescribedSet` ❌
- `LoggedSet` ❌
- `CardioWeek` ❌
- `PrescribedCardioSession` ❌

For tables without `userId`, your RLS policies must traverse the relationship chain to verify ownership. For example, to check if a user can access a `PrescribedSet`:

```sql
-- This is SLOW - runs for every row
PrescribedSet → Exercise → Workout → Week → Program → userId = auth.uid()
```

**Why this destroys performance:**
- Each RLS check requires 4 JOIN operations
- Without proper optimization, `auth.uid()` is called per-row (not cached)
- On Supabase Free tier's limited compute, this compounds quickly

**Evidence from Supabase docs:**
> "Improvement seen over 100x on large tables" when properly indexing and wrapping `auth.uid()` in a subquery.

---

### 2. Deep Nested Hierarchy + Prisma's Query Strategy

Your hierarchy depth: `Program → Week → Workout → Exercise → PrescribedSet`

**The Problem:**
By default, Prisma uses the `query` strategy which sends **multiple sequential queries**:
1. Query 1: Get Program
2. Query 2: Get Weeks for Program
3. Query 3: Get Workouts for Weeks
4. Query 4: Get Exercises for Workouts
5. Query 5: Get PrescribedSets for Exercises

Each query:
- Has network latency to Supabase (~50-200ms on free tier)
- Triggers RLS evaluation
- Must wait for the previous query to complete

**Total latency = (queries × network_latency) + (queries × RLS_overhead)**

With 5 levels and ~100ms latency each, you're looking at 500ms+ just in network time, before any actual query execution.

---

### 3. Missing Composite Index for RLS Traversal

Your current indexes are good for direct queries but not optimized for RLS policy traversal:

```prisma
// Current - good for direct lookups
@@index([programId])      // Week
@@index([weekId])         // Workout  
@@index([workoutId])      // Exercise
@@index([exerciseId])     // PrescribedSet
```

But RLS policies need to traverse UP the chain efficiently. Consider adding:
- Composite indexes that include the foreign key AND any filter columns
- Potentially denormalized `userId` on child tables

---

## 🟡 Moderate Issues

### 4. CUID Primary Keys

You're using `@default(cuid())` for all IDs. CUIDs are:
- 25 characters (larger than UUIDs)
- Not monotonically increasing (poor for B-tree index performance)
- Can cause page splits and index fragmentation

**Impact:** Moderate - affects insert performance and index size

### 5. Index Redundancy

```prisma
// On Program model
@@index([userId, isActive])
@@index([userId])                    // ← Redundant (covered by above)
@@index([userId, isUserCreated])
@@index([userId, isArchived])
```

The standalone `@@index([userId])` is redundant because `[userId, isActive]` can service queries filtering only on `userId`.

### 6. No Index on `ExerciseDefinition.createdBy`

While you have `@@index([createdBy])`, if your RLS policies check ownership of exercise definitions, you need to ensure this is properly used.

---

## 🟢 Your Schema Does Right

- Foreign key indexes on all relationship columns ✅
- Cascade deletes properly configured ✅
- Sensible composite unique constraints ✅
- Appropriate use of nullable fields ✅

---

## Recommended Fixes (Priority Order)

### Fix 1: Optimize RLS Policies (CRITICAL)

**Before:**
```sql
CREATE POLICY "Users can view their exercises"
ON "Exercise"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Workout" w
    JOIN "Week" wk ON w."weekId" = wk.id
    JOIN "Program" p ON wk."programId" = p.id
    WHERE w.id = "Exercise"."workoutId"
    AND p."userId" = auth.uid()
  )
);
```

**After (optimized):**
```sql
CREATE POLICY "Users can view their exercises"
ON "Exercise"
FOR SELECT
TO authenticated
USING (
  "workoutId" IN (
    SELECT w.id FROM "Workout" w
    WHERE w."weekId" IN (
      SELECT wk.id FROM "Week" wk
      WHERE wk."programId" IN (
        SELECT p.id FROM "Program" p
        WHERE p."userId" = (SELECT auth.uid())
      )
    )
  )
);
```

Key optimizations:
1. Wrap `auth.uid()` in `(SELECT auth.uid())` - caches the value
2. Use `IN` with subqueries instead of `EXISTS` with JOINs
3. Add `TO authenticated` to skip evaluation for anon users

### Fix 2: Consider Denormalizing `userId`

Add `userId` to frequently-accessed child tables:

```prisma
model Week {
  id         String  @id @default(cuid())
  weekNumber Int
  programId  String
  userId     String  // ← Add this
  program    Program @relation(...)
  
  @@index([userId])  // ← Add index
}

model Workout {
  id        String @id @default(cuid())
  name      String
  dayNumber Int
  weekId    String
  userId    String  // ← Add this
  week      Week   @relation(...)
  
  @@index([userId])  // ← Add index
}
```

**Trade-off:** Slight data duplication vs. massive RLS performance gain

### Fix 3: Enable Prisma's JOIN Strategy

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["relationJoins"]  // ← Add this
}
```

Then in your queries:
```typescript
const program = await prisma.program.findFirst({
  relationLoadStrategy: 'join',  // Single query with JOINs
  where: { userId, isActive: true },
  include: {
    weeks: {
      include: {
        workouts: {
          include: {
            exercises: {
              include: {
                prescribedSets: true
              }
            }
          }
        }
      }
    }
  }
});
```

### Fix 4: Use Security Definer Functions

Create a function that bypasses RLS on intermediate tables:

```sql
CREATE OR REPLACE FUNCTION get_user_program_ids()
RETURNS SETOF TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM "Program" WHERE "userId" = auth.uid()
$$;
```

Then use in RLS:
```sql
CREATE POLICY "..." ON "Week"
USING ("programId" IN (SELECT get_user_program_ids()));
```

### Fix 5: Remove Redundant Index

```prisma
model Program {
  // Remove this line:
  // @@index([userId])  // Redundant
  
  // Keep these:
  @@index([userId, isActive])
  @@index([userId, isUserCreated])
  @@index([userId, isArchived])
}
```

### Fix 6: Consider Switching to UUIDs or NanoID

```prisma
model Program {
  id String @id @default(uuid())  // or use dbgenerated("gen_random_uuid()")
}
```

UUIDs are:
- Native to Postgres (better optimization)
- Fixed size (more predictable performance)
- Can use `uuid_generate_v7()` for time-ordered UUIDs (best insert performance)

---

## Debugging Steps

### 1. Enable Query Logging in Prisma

```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### 2. Use Supabase's EXPLAIN ANALYZE

```sql
-- Enable in Supabase
ALTER ROLE authenticator SET pgrst.db_plan_enabled TO true;
NOTIFY pgrst, 'reload config';
```

Then use `.explain()` in your queries to see execution plans.

### 3. Check RLS Impact

Run the same query with and without RLS to isolate the problem:
```sql
-- Temporarily disable RLS (dev only!)
ALTER TABLE "Exercise" DISABLE ROW LEVEL SECURITY;
-- Run your query
-- Re-enable
ALTER TABLE "Exercise" ENABLE ROW LEVEL SECURITY;
```

### 4. Monitor Connection Usage

On Free tier, you have limited connections. Check if you're hitting limits:
- Dashboard → Observability → Database Connections

---

## Supabase Free Tier Limitations

| Resource | Free Tier | Impact |
|----------|-----------|--------|
| CPU | Shared (Nano) | Slow RLS evaluation |
| RAM | 500MB | Limited query cache |
| Connections | 60 direct | Pooling issues with Prisma |
| IOPS | Baseline only | Slow disk operations |

**Recommendation:** If optimizations don't help enough, the Micro tier ($25/month) provides dedicated resources and typically 2-3x better performance for complex queries.

---

## Quick Wins (Do These First)

1. **Wrap `auth.uid()` in SELECT** in all RLS policies
2. **Add `TO authenticated`** to all RLS policies  
3. **Enable `relationJoins`** preview feature in Prisma
4. **Add `.eq('userId', userId)`** filter in your Prisma/Supabase queries (even though RLS handles it, this helps the query planner)

---

## Schema Migration Example

If you decide to denormalize `userId`:

```sql
-- Migration to add userId to child tables
ALTER TABLE "Week" ADD COLUMN "userId" TEXT;
UPDATE "Week" SET "userId" = (
  SELECT "userId" FROM "Program" WHERE "Program".id = "Week"."programId"
);
ALTER TABLE "Week" ALTER COLUMN "userId" SET NOT NULL;
CREATE INDEX "Week_userId_idx" ON "Week"("userId");

-- Repeat for Workout, Exercise, PrescribedSet as needed
```

Then update your Prisma schema and create new optimized RLS policies.
