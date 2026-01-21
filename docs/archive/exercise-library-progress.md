# Exercise Library Seeding Progress

## FAU Categories (19 total)
- chest
- mid-back
- lower-back
- traps
- front-delts
- mid-delts
- rear-delts
- lats
- biceps
- triceps
- forearms
- neck
- quads
- adductors
- hamstrings
- glutes
- calves
- abs
- obliques

## User-Requested Exercises

### Chest ✅ COMPLETE (8 exercises)
- [x] Incline Smith Machine Press
- [x] Cable pec fly
- [x] Pec dec
- [x] Assisted Dip
- [x] Barbell Bench Press (added)
- [x] Dumbbell Bench Press (added)
- [x] Incline Dumbbell Press (added)
- [x] Chest Dips (added)

### Back (Mid-back, Lats, Lower-back) ✅ COMPLETE (10 exercises)
- [x] Lat Pull-Around
- [x] Chest-Supported Machine Row
- [x] Reverse cable fly (mid back and rear deltoid)
- [x] Lat Pulldown
- [x] Reverse fly machine
- [x] Pull-ups (added)
- [x] Assisted Pull-up (added)
- [x] Barbell Row (added)
- [x] Seated Cable Row (added)
- [x] Single-Arm Dumbbell Row (added)

### Traps ✅ COMPLETE (3 exercises)
- [x] Cable shrug (traps)
- [x] Barbell Shrug (added)
- [x] Dumbbell Shrug (added)

### Shoulders (Front/Mid/Rear Delts) ✅ COMPLETE (9 exercises)
- [x] Face pull
- [x] Behind-the-Back lateral raise
- [x] DB Shoulder Press
- [x] Barbell Overhead Press (added)
- [x] Machine Shoulder Press (added)
- [x] Arnold Press (added)
- [x] Dumbbell Lateral Raise (added)
- [x] Cable Lateral Raise (added)
- [x] Dumbbell Front Raise (added)

### Arms (Biceps, Triceps, Forearms) ✅ COMPLETE (14 exercises)

**Biceps (6 exercises):**
- [x] Bayesian cable curl
- [x] Preacher curl
- [x] Barbell Curl (added)
- [x] Dumbbell Curl (added)
- [x] Hammer Curl (added)
- [x] Cable Curl (added)

**Triceps (6 exercises):**
- [x] Overhead cable triceps extension
- [x] Triceps pressdown
- [x] Cable triceps kickback
- [x] Dumbbell Overhead Triceps Extension (added)
- [x] Close-Grip Bench Press (added)
- [x] Triceps Dips (added)

**Forearms (2 exercises):**
- [x] Dumbbell Wrist Curl (added)
- [x] Dumbbell Reverse Wrist Curl (forearm extension) (added)

### Legs ✅ COMPLETE (19 exercises)

**Quads (8 exercises):**
- [x] Leg press
- [x] Leg extension (machine)
- [x] Front squat (quad focused)
- [x] Smith machine feet forward squat (more quad focus)
- [x] Barbell Back Squat (added)
- [x] Goblet Squat (added)
- [x] Bulgarian Split Squat (added)
- [x] Walking Lunges (added)

**Hamstrings (4 exercises):**
- [x] RDL Barbell
- [x] RDL Dumbbell
- [x] Seated Leg curl
- [x] Lying Leg Curl (added)

**Glutes (2 exercises):**
- [x] Hip Thrust (added)
- [x] Glute Bridge (added)

**Adductors/Abductors (2 exercises):**
- [x] Hip Adduction (machine)
- [x] Hip Abduction (machine)

**Calves (3 exercises):**
- [x] Leg press calf press
- [x] Calf extension machine (Seated Calf Raise)
- [x] Standing calf raise

### Core (Abs & Obliques) ✅ COMPLETE (12 exercises)

**Abs (9 exercises):**
- [x] Cable crunch
- [x] Roman Chair Leg Lift
- [x] Reverse crunch
- [x] Plank (added)
- [x] Hanging Leg Raise (added)
- [x] Hanging Knee Raise (added)
- [x] Ab Wheel Rollout (added)
- [x] Dead Bug (added)
- [x] Bicycle Crunches (added)

**Obliques (3 exercises):**
- [x] Side Plank (added)
- [x] Russian Twists (added)
- [x] Oblique Crunches (added)

### Compound/Multi-muscle ✅ COMPLETE
- [x] Assisted Pull-up (already added in Back section)
- [x] Assisted Dip (already added in Chest section)

## Organization Strategy

We'll build exercises in batches of 5-10, organized by FAU to ensure good coverage:

### Batch 1: Chest (NEXT)
Starting with chest exercises to establish the pattern

### Batch 2: Back (Mid-back, Lats, Traps)
Back exercises including pulling movements

### Batch 3: Shoulders & Rear Delts
Deltoid-focused movements

### Batch 4: Arms (Biceps, Triceps, Forearms)
Isolation arm work

### Batch 5: Legs - Quads & Glutes
Quad-dominant movements

### Batch 6: Legs - Hamstrings & Calves
Posterior chain and calf work

### Batch 7: Core (Abs & Obliques)
Abdominal and core stability

### Batch 8: Additional Compounds
Fill gaps and add variety

## Notes

- Each exercise needs: name, normalizedName, aliases[], primaryFAUs[], secondaryFAUs[], equipment[], isSystem=true
- RDL comes in two variants: barbell and dumbbell (create both)
- Normalize names by removing spaces and converting to lowercase
- Add common aliases for searchability
