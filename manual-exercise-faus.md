# Manual FAU Assignment for 19 Exercises

Fill in the FAU and equipment data for each exercise below. After completing, I'll convert this to SQL UPDATE statements.

## Reference Lists

### Valid FAUs (19 total):
- **Upper Body**: chest, mid-back, lower-back, traps, front-delts, mid-delts, rear-delts, lats
- **Arms**: biceps, triceps, forearms, neck
- **Lower Body**: quads, adductors, hamstrings, glutes, calves
- **Core**: abs, obliques

### Common Equipment:
- barbell, dumbbell, kettlebell, ez-bar, trap-bar
- cable, machine, smith-machine
- bodyweight, resistance-band
- bench, rack, pull-up-bar, parallel-bars, roman-chair, ab-wheel

---

## Exercise 1: Overhead Cable Triceps Extension (Bar)
- **normalizedName**: `overhead cable triceps extension (bar)`
- **primaryFAUs**: triceps
- **secondaryFAUs**:
- **equipment**: cable
- **instructions** (optional):

---

## Exercise 2: Biceps Pushdown (Bar)   !!! I think this was created erroneously. Biceps pushdown should be TRICEPS pushdown which may already exist
- **normalizedName**: `biceps pushdown (bar)`
- **primaryFAUs**:
- **secondaryFAUs**:
- **equipment**:
- **instructions** (optional):

---

## Exercise 3: Cable Reverse Fly  !!! I think this may be redundant with another exercise we created.. YES, `reverse cable fly`
- **normalizedName**: `cable reverse fly`
- **primaryFAUs**:
- **secondaryFAUs**:
- **equipment**:
- **instructions** (optional):

---

## Exercise 4: Cable Lateral Y-Raise  !! This one is unique
- **normalizedName**: `cable lateral y-raise`
- **primaryFAUs**: mid-delts
- **secondaryFAUs**:
- **equipment**: cable
- **instructions** (optional):

---

## Exercise 5: Low Incline Smith Machine Press  !!! This is just a variant on Incline Smith Machine Press!! Need to combine somehow.
- **normalizedName**: `low incline smith machine press`
- **primaryFAUs**:
- **secondaryFAUs**:
- **equipment**:
- **instructions** (optional):

---

## Exercise 6: Incline DB Curl
- **normalizedName**: `incline db curl`
- **primaryFAUs**: biceps
- **secondaryFAUs**:
- **equipment**: dumbbell
- **instructions** (optional):

---

## Exercise 7: Overhead Barbell Triceps Extension
- **normalizedName**: `overhead barbell triceps extension`
- **primaryFAUs**: triceps
- **secondaryFAUs**:
- **equipment**: barbell
- **instructions** (optional):

---

## Exercise 8: Cross-Body Lat Pullaround (Kneeling)  !! Variant of our lat pull-around!! 
- **normalizedName**: `cross-body lat pullaround (kneeling)`
- **primaryFAUs**: 
- **secondaryFAUs**:
- **equipment**:
- **instructions** (optional):

---

## Exercise 9: Cable Paused Shrug-In  !! Variant of cable shrug we created!!
- **normalizedName**: `cable paused shrug-in`
- **primaryFAUs**:
- **secondaryFAUs**:
- **equipment**:
- **instructions** (optional):

---

## Exercise 10: Lying Paused Rope Face Pull  !! Variant of face pull we created!! 
- **normalizedName**: `lying paused rope face pull`
- **primaryFAUs**:
- **secondaryFAUs**:
- **equipment**:
- **instructions** (optional):

---

## Exercise 11: Neutral-Grip Lat Pulldown
- **normalizedName**: `neutral-grip lat pulldown`
- **primaryFAUs**:
- **secondaryFAUs**:
- **equipment**:
- **instructions** (optional):

---

## Exercise 12: Seated DB Shoulder Press
- **normalizedName**: `seated db shoulder press`
- **primaryFAUs**:
- **secondaryFAUs**:
- **equipment**:
- **instructions** (optional):

---

## Exercise 13: Hammer Preacher Curl
- **normalizedName**: `hammer preacher curl`
- **primaryFAUs**:
- **secondaryFAUs**:
- **equipment**:
- **instructions** (optional):

---

## Exercise 14: Cable Reverse Flye
- **normalizedName**: `cable reverse flye`
- **primaryFAUs**:
- **secondaryFAUs**:
- **equipment**:
- **instructions** (optional):

---

## Exercise 15: Machine Hip Adduction
- **normalizedName**: `machine hip adduction`
- **primaryFAUs**:
- **secondaryFAUs**:
- **equipment**:
- **instructions** (optional):

---

## Exercise 16: Paused Assisted Dip
- **normalizedName**: `paused assisted dip`
- **primaryFAUs**:
- **secondaryFAUs**:
- **equipment**:
- **instructions** (optional):

---

## Exercise 17: Bent-Over Cable Pec Flye
- **normalizedName**: `bent-over cable pec flye`
- **primaryFAUs**:
- **secondaryFAUs**:
- **equipment**:
- **instructions** (optional):

---

## Exercise 18: Chest Press Machine
- **normalizedName**: `chest press machine`
- **primaryFAUs**:
- **secondaryFAUs**:
- **equipment**:
- **instructions** (optional):

---

## Exercise 19: Bottom 2/3 Constant Tension Preacher Curl
- **normalizedName**: `bottom 2/3 constant tension preacher curl`
- **primaryFAUs**:
- **secondaryFAUs**:
- **equipment**:
- **instructions** (optional):

---

## Formatting Notes:

- **primaryFAUs**: Comma-separated list (e.g., `chest` or `quads, glutes`)
- **secondaryFAUs**: Comma-separated list or leave blank
- **equipment**: Comma-separated list
- **instructions**: Optional - brief setup/execution notes

## Examples:

```
primaryFAUs: chest
secondaryFAUs: triceps, front-delts
equipment: barbell, bench
instructions: Lie flat on bench. Lower bar to mid-chest, press up.
```

---

When done, save this file and let me know - I'll generate the SQL UPDATE statements!
