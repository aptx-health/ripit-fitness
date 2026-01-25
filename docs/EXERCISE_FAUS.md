# Exercise FAUs (Functional Anatomical Units)

This document defines the standardized muscle groups used for exercise definitions in Ripit Fitness.

## Standardized FAU List

When creating or updating exercise definitions, `primaryFAUs` and `secondaryFAUs` must ONLY use values from this list:

**Format**: lowercase with hyphens (kebab-case)

### Upper Body
- `chest`
- `mid-back`
- `lower-back`
- `front-delts`
- `side-delts`
- `rear-delts`
- `lats`
- `traps`
- `biceps`
- `triceps`
- `forearms`
- `neck`

### Lower Body
- `quads`
- `adductors`
- `abductors`
- `hamstrings`
- `glutes`
- `calves`

### Core
- `abs`
- `obliques`

### Rehab & Specialized
- `rotator-cuffs`
- `hip-flexors`
- `serratus-anterior`
- `tibialis-anterior`
- `peroneals`

## Usage in SQL Seeds

When creating exercise seed files, use these exact values (lowercase kebab-case):

```sql
INSERT INTO "ExerciseDefinition" (
  ...
  "primaryFAUs",
  "secondaryFAUs",
  ...
) VALUES
(
  ...
  ARRAY['chest', 'triceps'],           -- Primary
  ARRAY['front-delts'],                -- Secondary
  ...
);
```

## Common Mappings

Here are common exercise patterns mapped to standardized FAUs:

| Exercise Type | Primary FAUs | Secondary FAUs |
|---------------|--------------|----------------|
| Bench Press | chest, triceps | front-delts |
| Squat | quads, glutes | hamstrings |
| Deadlift | hamstrings, glutes, lower-back | traps, forearms |
| Pull-Up | lats, biceps | mid-back, forearms |
| Overhead Press | front-delts, triceps | chest |
| Barbell Row | lats, mid-back | biceps, rear-delts |
| Romanian Deadlift | hamstrings, glutes | lower-back |

## Invalid FAU Names

Do NOT use these (they should be mapped to standardized names):

| ❌ Invalid | ✅ Use Instead |
|-----------|---------------|
| Chest | chest |
| quadriceps | quads |
| shoulders | front-delts / side-delts / rear-delts |
| back | mid-back / lower-back / lats |
| upper back | mid-back |
| Upper Back | mid-back |
| Lower Back | lower-back |
| core | abs / obliques |
| hip flexors | hip-flexors |
| rotator cuff | rotator-cuffs |
| serratus | serratus-anterior |
| brachialis | biceps |

## Notes

- FAUs are case-sensitive and use lowercase kebab-case (e.g., "front-delts" not "Front Delts")
- If an exercise works muscles not in this list, choose the closest match or omit
- Primary FAUs should list the main movers (2-3 maximum)
- Secondary FAUs should list synergists and stabilizers (1-3 maximum)
- When in doubt about shoulder exercises:
  - Overhead pressing = front-delts primary
  - Lateral raises = side-delts primary
  - Rear delt flies, face pulls = rear-delts primary
