# FAU Mapping: free-exercise-db → Ripit FAU Taxonomy

Maps the free-exercise-db's 17 coarse muscle group names to our 27 granular FAU (Functional Anatomical Unit) taxonomy.

## Mapping Strategy

### Direct 1:1 Mappings (15 muscle groups)

Defined in `default-mappings.json`. These translate directly:

| Their Name | Our FAU |
|---|---|
| biceps | biceps |
| triceps | triceps |
| chest | chest |
| lats | lats |
| traps | traps |
| forearms | forearms |
| glutes | glutes |
| hamstrings | hamstrings |
| quadriceps | quads |
| calves | calves |
| adductors | adductors |
| abductors | abductors |
| lower back | lower-back |
| middle back | mid-back |
| neck | neck |

### Per-Exercise Overrides (2 muscle groups)

These required exercise-level judgment because our taxonomy is more granular:

#### Shoulders → front-delts / side-delts / rear-delts / rotator-cuffs

`shoulders-classified.json` — 127 exercises classified by movement pattern:

| Movement Pattern | FAU | Count |
|---|---|---|
| Overhead pressing, front raises, Olympic lifts | front-delts | 91 |
| Lateral raises, upright rows | side-delts | 33 |
| Reverse flyes, face pulls, bent-over laterals | rear-delts | 18 |
| Internal/external rotation isolation | rotator-cuffs | 6 |

Classification logic: plane of movement determines the primary delt head. Sagittal (front/back) = front-delts or rear-delts, frontal (side) = side-delts. Complex movements (Arnold press, behind-the-neck press) get multiple delt heads as co-primary.

#### Abdominals → abs / obliques

`abs-classified.json` — 93 exercises classified by contraction type:

| Contraction Pattern | FAU | Count |
|---|---|---|
| Spinal flexion (crunches, sit-ups, leg raises, rollouts) | abs | 53 |
| Rotation or lateral flexion (twists, side bends, windmills) | obliques | 27 |
| Combined flexion + rotation (bicycle crunches, cross-body) | abs + obliques | 13 |

## Output Format

Each classified file is a JSON array:

```json
[
  {
    "name": "Exercise Name",
    "primaryFAUs": ["front-delts"],
    "secondaryFAUs": ["triceps"]
  }
]
```

Secondary FAUs in the classified files have also been remapped from the free-exercise-db's naming (e.g., `"middle back"` → `"mid-back"`, `"shoulders"` in secondary position → `"front-delts"`).

## Consuming This Data

See issue #245 for the downstream seed generation script. Usage:

1. Look up the exercise's `primaryMuscles` from the free-exercise-db
2. If `"shoulders"` or `"abdominals"`, find the exercise by name in the classified JSON
3. For all other muscles, use `default-mappings.json` to translate
