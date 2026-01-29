# Community Program Seed Files

This directory contains SQL seed files for community programs (both strength and cardio).

## Overview

These files provide test and reference data for the community programs feature, including programs for cloning, testing, and development.

## Files

| File | Type | Count | Description |
|------|------|-------|-------------|
| `minimal_community_test.sql` | Strength | 2 | Minimal test programs for basic cloning functionality |
| `minimal_cardio_community_test.sql` | Cardio | 2 | Minimal cardio programs for testing cardio cloning |
| `large_cardio_test.sql` | Cardio | 1 | Large 10-week cardio program for performance testing |
| `community_programs_seed.sql` | Both | 25 | Full reference dataset (15 strength + 10 cardio) |
| `get_exercise_ids.sql` | Utility | - | Query helper to fetch exercise IDs for testing |

## Prerequisites

**CRITICAL:** Community programs reference exercise definitions. You MUST seed exercises FIRST before seeding programs.

### Required Seeding Order

1. **Exercises** (from parent directory):
   - `00_legacy_exercises.sql` (27 legacy exercises - MUST BE FIRST)
   - `01-07_*.sql` (numbered exercise files)

2. **Programs** (this directory):
   - Any of the program seed files below

## How to Apply

### Option 1: Minimal Test Data (Recommended for Development)

```bash
# From prisma/seeds directory
cd /Users/dustin/repos/fitcsv/prisma/seeds

# 1. Seed exercises first (if not already done)
psql -d fitcsv_local -f 00_legacy_exercises.sql
psql -d fitcsv_local -f 01_bodyweight_exercises.sql
# ... (seed all numbered exercise files)

# 2. Seed minimal test programs
psql -d fitcsv_local -f programs/minimal_community_test.sql
psql -d fitcsv_local -f programs/minimal_cardio_community_test.sql
```

### Option 2: Full Reference Dataset

```bash
# After seeding all exercises
psql -d fitcsv_local -f programs/community_programs_seed.sql
```

### Option 3: Performance Testing

```bash
# Large cardio program for clone-worker performance testing
psql -d fitcsv_local -f programs/large_cardio_test.sql
```

## File Details

### minimal_community_test.sql

**2 strength programs** for basic cloning functionality testing:
- Test Push Program (2 weeks, 2 workouts/week)
- Test Core Program (2 weeks, 3 workouts/week)

Features:
- Uses legacy exercise IDs: `exdef_shoulders_004` (Arnold Press), `ex_bw_023` (Crunch)
- Includes exercise notes for testing note cloning
- Progressive loading across weeks

### minimal_cardio_community_test.sql

**2 cardio programs** for cardio cloning testing:
- Running (2 weeks, 5 sessions/week)
- Cycling (2 weeks, 4 sessions/week)

Features:
- Detailed session structure with zones, HR ranges, power ranges
- Interval structure examples
- No exercise hierarchy (cardio-specific)

### large_cardio_test.sql

**1 large cardio program** (10 weeks, 50 sessions total):
- Marathon Training Plan
- 5 sessions/week with varying intensities
- Realistic variety: easy runs, tempo, intervals, long runs, recovery
- Progressive cycles: build → deload → peak

Purpose: Performance benchmarking for clone-worker (tests transaction batching, progressive loading)

### community_programs_seed.sql

**25 complete programs** (15 strength + 10 cardio):

**Strength Programs:**
- Full body variations (3-4 day splits)
- Upper/Lower splits
- Push/Pull/Legs
- Specialized: Powerlifting, Olympic lifting
- Various equipment: Barbell, dumbbell, bodyweight, bands

**Cardio Programs:**
- Running (5K, 10K, Half Marathon, Marathon)
- Cycling, Rowing, Swimming
- Various durations: 4-16 weeks

**Note:** Uses placeholder exercise IDs `00000000-0000-0000-0000-000000000000`. To use this file, you must manually substitute actual exercise definition IDs from your database.

### get_exercise_ids.sql

**Utility query** to fetch exercise IDs for manual testing:

```sql
SELECT id, name, "normalizedName", "isSystem"
FROM "ExerciseDefinition"
WHERE "isSystem" = true
LIMIT 10;
```

Run this to get exercise IDs when manually creating or updating program data.

## Verification

After seeding programs, verify counts:

```sql
-- Check community programs
SELECT COUNT(*) as total_community_programs
FROM "CommunityProgram";

-- Breakdown by type
SELECT "programType", COUNT(*) as count
FROM "CommunityProgram"
GROUP BY "programType";
```

## Exercise References

These program files reference exercises from the parent directory:

| File | Referenced Exercise IDs |
|------|-------------------------|
| `minimal_community_test.sql` | `exdef_shoulders_004`, `ex_bw_023` |
| `minimal_cardio_community_test.sql` | None (cardio programs have no exercises) |
| `large_cardio_test.sql` | None (cardio programs have no exercises) |
| `community_programs_seed.sql` | Uses placeholder `00000000-0000-0000-0000-000000000000` |

## Notes

- All programs use author user ID: `00000000-0000-0000-0000-000000000000`
- Programs use `ON CONFLICT DO NOTHING` for safe re-running
- Cardio programs have no exercise hierarchy (sessions only)
- Strength programs reference ExerciseDefinitions via programData JSON
- Clone-worker tests use minimal programs for speed, large programs for stress testing

## Next Steps

After seeding programs:

1. Test cloning functionality via `/api/programs/clone/[id]`
2. Test clone-worker progressive loading with large programs
3. Verify programData JSON structure in cloned programs
4. Test UI displays for community programs
