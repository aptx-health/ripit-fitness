# CSV Import Specification

## Overview

FitCSV imports strength training programs from standard CSV files. The format is designed to work seamlessly with Excel, Google Sheets, and any text editor.

## Basic Format

```csv
week,day,workout_name,exercise,set,reps,weight,rir,notes
1,1,Upper Power,Bench Press,1,5,135lbs,2,
1,1,Upper Power,Bench Press,2,5,135lbs,2,
1,1,Upper Power,Bench Press,3,5,135lbs,3,
1,1,Upper Power,Barbell Row,1,8,95lbs,2,Pause at chest
1,2,Lower Power,Squat,1,5,225lbs,2,
2,1,Upper Power,Bench Press,1,5,140lbs,2,
```

## Required Columns

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `week` | Integer | Week number in program | `1`, `2`, `3` |
| `day` | Integer | Day number within week | `1`, `2`, `3` |
| `workout_name` | String | Name of the workout | `Upper Power`, `Monday`, `Push Day` |
| `exercise` | String | Exercise name | `Bench Press`, `Squat`, `Deadlift` |
| `set` | Integer | Set number | `1`, `2`, `3` |
| `reps` | Integer | Target reps | `5`, `10`, `12` |
| `weight` | String | Target weight (flexible) | `135lbs`, `65%`, `RPE 8` |

## Optional Columns

These columns are auto-detected if present:

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `rir` | Integer | Reps in Reserve (0-5) | `2`, `1`, `0` |
| `rpe` | Integer | Rate of Perceived Exertion (1-10) | `7`, `8`, `9` |
| `notes` | String | Exercise-specific notes | `Pause at bottom`, `Explode up` |

**Note**: Use either `rir` OR `rpe`, not both.

## Weight Format Options

The `weight` column accepts multiple formats:

| Format | Example | Description |
|--------|---------|-------------|
| Absolute (lbs) | `135lbs` | Explicit weight in pounds |
| Absolute (kg) | `60kg` | Explicit weight in kilograms |
| Percentage | `65%` | Percentage of 1RM (calculated in app) |
| RPE-based | `RPE 8` | Based on exertion level |
| Bodyweight | `BW` | User's bodyweight |
| Variable | `AMRAP`, `max` | As many reps as possible, max effort |

## Metadata

Program-level metadata is inferred automatically:

- **Program name**: Derived from filename
  - `my-program.csv` → "My Program"
  - `nsuns-531.csv` → "Nsuns 531"
- **Program type**: Defaults to `strength`
- **Optional columns**: Auto-detected from headers

## Example Programs

### Simple Linear Progression

```csv
week,day,workout_name,exercise,set,reps,weight
1,1,Day A,Squat,1,5,135lbs
1,1,Day A,Squat,2,5,135lbs
1,1,Day A,Squat,3,5,135lbs
1,1,Day A,Bench Press,1,5,95lbs
1,1,Day A,Bench Press,2,5,95lbs
1,1,Day A,Bench Press,3,5,95lbs
1,2,Day B,Deadlift,1,5,185lbs
1,2,Day B,Deadlift,2,5,185lbs
1,2,Day B,Deadlift,3,5,185lbs
```

### With RIR Tracking

```csv
week,day,workout_name,exercise,set,reps,weight,rir
1,1,Upper Power,Bench Press,1,5,135lbs,3
1,1,Upper Power,Bench Press,2,5,135lbs,2
1,1,Upper Power,Bench Press,3,5,135lbs,1
1,1,Upper Power,Rows,1,8,95lbs,2
1,1,Upper Power,Rows,2,8,95lbs,2
1,1,Upper Power,Rows,3,8,95lbs,1
```

### With Notes

```csv
week,day,workout_name,exercise,set,reps,weight,notes
1,1,Push,Bench Press,1,5,135lbs,Pause 2 seconds at bottom
1,1,Push,Bench Press,2,5,135lbs,
1,1,Push,Overhead Press,1,8,65lbs,Strict form
```

### Percentage-Based (5/3/1 Style)

```csv
week,day,workout_name,exercise,set,reps,weight
1,1,Press,Overhead Press,1,5,65%
1,1,Press,Overhead Press,2,5,75%
1,1,Press,Overhead Press,3,5,85%
2,1,Press,Overhead Press,1,3,70%
2,1,Press,Overhead Press,2,3,80%
2,1,Press,Overhead Press,3,3,90%
```

## Validation Rules

### Required Field Validation

- `week`: Must be positive integer (≥ 1)
- `day`: Must be positive integer (≥ 1)
- `workout_name`: Cannot be empty
- `exercise`: Cannot be empty
- `set`: Must be positive integer (≥ 1)
- `reps`: Must be positive integer (≥ 1)
- `weight`: Cannot be empty

### Optional Field Validation

- `rir`: If present, must be integer 0-5
- `rpe`: If present, must be integer 1-10
- `notes`: Any string (optional)

### Structural Validation

- CSV must have header row
- Must include all required columns
- Week numbers should be sequential (1, 2, 3...)
- Day numbers should be sequential within each week
- Set numbers should be sequential within each exercise

### Error Handling

If validation fails:
1. Show specific error message
2. Highlight problematic row/column
3. Do not import partial data
4. Allow user to fix and re-upload

## Future Enhancements

- Support for supersets (e.g., `exercise_group` column)
- Rest time specifications
- Tempo notation (e.g., `3-1-1-0`)
- Exercise substitutions/variations
- Deload week indicators
- Cardio program support
