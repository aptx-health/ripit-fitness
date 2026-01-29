# Creating Community Program Seeds

**⚠️ CRITICAL: All exercise IDs in program seeds MUST reference actual ExerciseDefinition records in your database.**

## Quick Start

### 1. Find Valid Exercise IDs

```bash
# List all available exercises
doppler run --config dev_personal -- bash -c 'psql $DATABASE_URL -c "SELECT id, name, category FROM \"ExerciseDefinition\" ORDER BY category, name LIMIT 50;"'

# Search for specific exercise
doppler run --config dev_personal -- bash -c 'psql $DATABASE_URL -c "SELECT id, name FROM \"ExerciseDefinition\" WHERE name ILIKE '\''%squat%'\'';"'

# Count exercises by category
doppler run --config dev_personal -- bash -c 'psql $DATABASE_URL -c "SELECT category, COUNT(*) FROM \"ExerciseDefinition\" GROUP BY category ORDER BY COUNT(*) DESC;"'
```

### 2. Use Real Exercise IDs

**❌ NEVER use placeholder IDs:**
```json
"exerciseDefinitionId": "00000000-0000-0000-0000-000000000000"  // BAD!
```

**✅ ALWAYS use actual IDs from your database:**
```json
"exerciseDefinitionId": "ex_db_007"  // Arnold Press - GOOD!
```

### 3. Verify Before Applying

```bash
# Test that all exercise IDs exist
doppler run --config dev_personal -- bash -c 'psql $DATABASE_URL -c "
SELECT e.id, e.name
FROM \"ExerciseDefinition\" e
WHERE e.id IN (
  '\''ex_db_007'\'',
  '\''ex_bw_023'\'',
  '\''cmiz7vmmg000ivr0mojncaj84'\''
);"'
```

## Program Structure

### Strength Program

```json
{
  "id": "orig-program-001",
  "name": "Program Name",
  "programType": "strength",
  "weeks": [
    {
      "weekNumber": 1,
      "workouts": [
        {
          "name": "Workout A",
          "dayNumber": 1,
          "exercises": [
            {
              "name": "Arnold Press",
              "exerciseDefinitionId": "ex_db_007",  // ← Must be valid!
              "order": 1,
              "notes": "Optional notes",
              "prescribedSets": [
                {
                  "setNumber": 1,
                  "reps": "10",
                  "weight": "30lbs",
                  "rpe": 7,
                  "rir": null
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Cardio Program

```json
{
  "id": "orig-cardio-001",
  "name": "Running Program",
  "programType": "cardio",
  "weeks": [
    {
      "weekNumber": 1,
      "sessions": [
        {
          "dayNumber": 1,
          "name": "Easy Run",
          "targetDuration": 30,
          "intensityZone": "Zone 2",
          "targetHRRange": "120-140 bpm",
          "notes": "Keep it conversational"
        }
      ]
    }
  ]
}
```

## Common Mistakes

### 1. Foreign Key Violations

**Error:** `insert or update on table "Exercise" violates foreign key constraint "Exercise_exerciseDefinitionId_fkey"`

**Cause:** Using exercise IDs that don't exist in ExerciseDefinition table

**Fix:** Query the database for valid IDs before creating program seeds

### 2. Wrong Exercise ID Format

**Error:** Exercise not found

**Cause:** Using legacy IDs like `exdef_shoulders_004` that no longer exist

**Fix:** Use current IDs from the seeded exercises (e.g., `ex_db_007`, `ex_bw_023`)

### 3. Case Sensitivity

Exercise names are case-insensitive in searches, but IDs are exact match.

## Available Exercise Categories (Post-Seed)

After running `reseed_local.sh`, you have ~255 exercises across:

- **legs** (55 exercises) - squats, deadlifts, lunges
- **back** (33 exercises) - rows, pulldowns, pull-ups
- **core** (32 exercises) - planks, crunches, carries
- **arms** (30 exercises) - curls, extensions, presses
- **chest** (27 exercises) - presses, flyes
- **shoulders** (25 exercises) - presses, raises
- **full body** (19 exercises) - compound movements
- **mobility** (17 exercises) - stretches, mobility drills
- **climbing** (17 exercises) - campus board, hangboard

## Generating Large Programs

For stress testing, use a script to generate repetitive programs:

```javascript
// See simple_community_programs.sql for small examples
// See large_strength_program.sql for large example (250 exercises)
```

## Applying Seeds

```bash
# Apply a seed file
doppler run --config dev_personal -- bash -c 'psql $DATABASE_URL -f prisma/seeds/programs/your_program.sql'

# Verify it worked
doppler run --config dev_personal -- bash -c 'psql $DATABASE_URL -c "SELECT id, name, \"weekCount\", \"exerciseCount\" FROM \"CommunityProgram\";"'
```

## Files in This Directory

- `simple_community_programs.sql` - 2 small programs for quick testing
- `large_strength_program.sql` - 1 large program (10 weeks, 250 exercises) for performance testing
- `get_exercise_ids.sql` - Utility query to fetch exercise IDs

## Need Help?

1. Check what exercises exist: `get_exercise_ids.sql`
2. Look at existing examples: `simple_community_programs.sql`
3. Verify exercise IDs before committing program seeds
