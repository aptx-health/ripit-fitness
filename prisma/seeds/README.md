# Exercise Database Seed Files

This directory contains SQL seed files for the complete exercise library.

## Overview

These files provide **~257 total exercises** including legacy exercises and comprehensive expansion to support varied training styles and equipment access.

## Files

| File | Exercises | Description |
|------|-----------|-------------|
| `00_legacy_exercises.sql` | 27 | **CRITICAL: Original CUID-based exercises used in existing programs** |
| `01_bodyweight_exercises.sql` | 42 | Push-ups, pull-ups, squats, lunges, planks, core work |
| `02_dumbbell_exercises.sql` | 50 | Comprehensive dumbbell movements for all muscle groups |
| `03_resistance_band_exercises.sql` | 32 | Band variations for limited equipment training |
| `04_kettlebell_exercises.sql` | 27 | Kettlebell swings, cleans, snatches, carries |
| `05_climbing_exercises.sql` | 21 | Hangboard, campus board, climbing-specific training |
| `06_cable_machine_exercises.sql` | 34 | Cable and machine exercises for gym training |
| `07_core_mobility_exercises.sql` | 24 | Advanced core work, stretching, foam rolling |

**Total: 257 exercises (27 legacy + 230 new)**

## How to Apply

**CRITICAL:** Legacy exercises MUST be seeded FIRST to preserve their CUID IDs for existing programs.

### Option 1: All at Once (Recommended)

Run all files sequentially in Supabase SQL Editor:

```sql
-- IMPORTANT: Run in this exact order!
-- 0. 00_legacy_exercises.sql  ← MUST BE FIRST
-- 1. 01_bodyweight_exercises.sql
-- 2. 02_dumbbell_exercises.sql
-- 3. 03_resistance_band_exercises.sql
-- 4. 04_kettlebell_exercises.sql
-- 5. 05_climbing_exercises.sql
-- 6. 06_cable_machine_exercises.sql
-- 7. 07_core_mobility_exercises.sql
```

### Option 2: Category by Category

Apply only the categories you need, but ALWAYS include legacy exercises first:

```sql
-- REQUIRED: Always run first
-- 00_legacy_exercises.sql

-- Then run only the categories you need:
-- 01_bodyweight_exercises.sql
-- 02_dumbbell_exercises.sql
```

### Why Order Matters

The schema enforces unique `normalizedName` values. Legacy exercises (00_legacy_exercises.sql) have CUID IDs (e.g., `cmiz7vl76000avr0m27zo6aos`) that are referenced by existing programs and community programs. If you seed numbered files first, they will claim normalized names like "pull-up", and the legacy exercises will be silently rejected via `ON CONFLICT DO NOTHING`. This breaks existing programs that reference the legacy CUID IDs.

## Schema Fields

Each exercise includes:

- **name**: Display name (e.g., "Dumbbell Bench Press")
- **normalizedName**: Lowercase unique identifier
- **aliases**: Array of alternative names for CSV matching
- **category**: General category (chest, legs, back, etc.)
- **equipment**: Array of required equipment
- **primaryFAUs**: Primary muscle groups (Functional Anatomical Units)
- **secondaryFAUs**: Secondary muscle groups
- **isSystem**: `true` (these are system exercises)
- **userId**: `00000000-0000-0000-0000-000000000000` (system user)

## Conflict Handling

All files use `ON CONFLICT ("normalizedName") DO NOTHING` to prevent duplicates. If an exercise with the same normalized name already exists, it will be skipped.

## Verification

After applying the seeds, verify the count:

```sql
SELECT COUNT(*) FROM "ExerciseDefinition" WHERE "isSystem" = true;
```

Expected result: **257 exercises** (27 legacy + 230 new)

To verify legacy exercises are present:

```sql
-- Check for legacy CUID IDs (should return 27)
SELECT COUNT(*)
FROM "ExerciseDefinition"
WHERE "isSystem" = true
  AND id NOT LIKE 'ex_%'
  AND id NOT LIKE 'exdef_%';

-- View all legacy exercises
SELECT id, name, category
FROM "ExerciseDefinition"
WHERE "isSystem" = true
  AND id NOT LIKE 'ex_%'
  AND id NOT LIKE 'exdef_%'
ORDER BY category, name;
```

## Categories Breakdown

### Legacy Exercises (27 exercises - CRITICAL)

These are the original exercises created early in the project with CUID IDs. They are used in existing programs and MUST be preserved:

**Arms (3):** Barbell Curl, Hammer Curl, Tricep Pushdown
**Back (5):** Barbell Row, Cable Row, Conventional Deadlift, Dumbbell Row, Pull-Up
**Chest (4):** Barbell Bench Press, Dips, Dumbbell Bench Press, Incline Barbell Bench Press
**Core (1):** Plank
**Legs (9):** Barbell Back Squat, Calf Raise, Front Squat, Leg Curl, Leg Extension, Leg Press, Lunges, Romanian Deadlift, Sumo Deadlift
**Shoulders (3):** Face Pull, Lateral Raise, Overhead Press

### Bodyweight (42 exercises)
- Push-up variations: Standard, Wide, Diamond, Decline, Incline, Pike, Archer
- Pull-up/Chin-up variations: Chin-up, Wide Grip, Neutral Grip, L-Sit, Muscle-up
- Squat variations: Bodyweight, Jump, Pistol, Bulgarian Split, Sissy
- Lunge variations: Forward, Reverse, Walking, Jumping
- Core: Sit-ups, Crunches, Leg Raises, Planks, Hollow Holds
- Calisthenics: Burpees, Handstand Push-ups, Inverted Rows

### Dumbbell (50 exercises)
- Chest: Presses, Flys, Pullovers
- Shoulders: Presses, Raises (Front, Lateral, Rear), Arnold Press
- Back: Rows, Shrugs, Deadlifts
- Arms: Curls (various), Extensions, Kickbacks
- Legs: Squats, Lunges, Step-ups, RDLs
- Full body: Thrusters, Snatches, Cleans, Man Makers

### Resistance Band (32 exercises)
- Upper body: Chest press, Rows, Shoulder work
- Lower body: Squats, Glute bridges, Hip abduction
- Arms: Curls, Extensions
- Core: Pallof press, Woodchops

### Kettlebell (27 exercises)
- Ballistic: Swings, Snatches, Cleans, High Pulls
- Pressing: Press, Push Press, Floor Press, Thruster
- Squatting: Goblet, Front Squat, Pistol
- Pulling: Rows, Renegade Rows
- Core: Turkish Get-ups, Windmills, Halos
- Carries: Farmer, Rack, Overhead

### Climbing (21 exercises)
- Hangboard: Max hangs, Repeaters, Various grips, Weighted
- Campus board: Ladders, Dynos, Touch and Go
- Pull-up variations: Frenchies, Typewriters, Lock-offs
- Core/Antagonist: Wrist extensors, Front lever, Scapular pulls

### Cable/Machine (34 exercises)
- Chest: Flys, Crossovers, Presses
- Back: Pulldowns, Rows, Straight arm work
- Shoulders: Raises, Face pulls, Reverse flys
- Arms: Curls, Extensions, Pushdowns
- Legs: Pull-throughs, Kickbacks, Abduction/Adduction
- Core: Crunches, Woodchops, Pallof Press
- Machines: Smith machine, Pec deck, Hack squat

### Core/Mobility (24 exercises)
- Advanced core: Ab wheel, Dead bugs, Dragon flags, L-sits
- Stretching: Hip flexor, Pigeon, Child's pose, Cobra
- Dynamic mobility: Leg swings, Arm circles, World's Greatest Stretch
- Recovery: Foam rolling variations

## Community Programs

After seeding exercises, you can optionally seed community programs for testing:

```bash
cd programs/
# See programs/README.md for detailed instructions
```

The `programs/` subdirectory contains:
- Minimal test programs (strength + cardio)
- Large performance test programs
- Full reference dataset (25 programs)

See `programs/README.md` for complete documentation.

## Next Steps

After applying these seeds:

1. Test CSV import with varied exercises
2. Verify exercise matching works with aliases
3. Optionally seed community programs for testing (see `programs/` directory)
4. Test program cloning functionality

## Notes

- All exercises use system user ID: `00000000-0000-0000-0000-000000000000`
- **Legacy exercises** use CUID IDs: `cmiz7v...` (e.g., `cmiz7vjju0000vr0m4b1o6bec`)
- **New exercises** use semantic IDs: `ex_bw_*`, `ex_db_*`, `ex_rb_*`, `ex_kb_*`, `ex_cl_*`, `ex_cm_*`, `ex_mo_*`
- Aliases are comprehensive for CSV matching flexibility
- Equipment arrays support multi-equipment exercises (e.g., "dumbbell lunge" needs dumbbells + space)
- Legacy exercises have minimal aliases/equipment data - this is intentional to preserve exact production state
