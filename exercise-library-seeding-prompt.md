# Exercise Library Seeding Task

## Context
This is a fitness tracking application (FitCSV) that's implementing a program builder feature. We need to seed the exercise library with comprehensive FAU (Functional Aesthetic Unit) metadata to enable muscle group filtering and volume visualization.

## Your Task
Create a comprehensive exercise library seeding script that maps exercises to Functional Aesthetic Units (FAUs). You should:

1. **Examine existing data**: Look at current exercise definitions in the database/seeding files
2. **Create comprehensive list**: Build a seed file with 100-200 common exercises
3. **Map to FAUs**: Assign primary and secondary FAUs to each exercise
4. **Create seeding script**: Output as a migration or script file

## Functional Aesthetic Units (FAUs)
These are the 16 muscle groupings we use for volume tracking:

```
- chest
- mid-back  
- lower-back
- rear-delts
- lats
- upper-arm-anterior (biceps)
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
```

## Database Schema
The ExerciseDefinition model has these FAU fields:
```prisma
model ExerciseDefinition {
  id             String   @id @default(cuid())
  name           String   // "Barbell Bench Press"
  normalizedName String   @unique // "barbellbenchpress"
  aliases        String[] // ["bench press", "bench", "bb bench"]
  primaryFAUs    String[] // ["chest", "triceps"]
  secondaryFAUs  String[] // ["rear-delts"]
  equipment      String[] // ["barbell", "bench"]
  instructions   String?  // Setup notes
  isSystem       Boolean  @default(false)
  createdBy      String?  
  // ... other fields
}
```

## FAU Assignment Guidelines

### Examples from our design discussions:
- **Hammer Curl**: Primary: ["upper-arm-anterior"], Secondary: ["forearms"]
- **Cable Rear Delt Fly**: Primary: ["mid-back", "rear-delts"], Secondary: []
- **Barbell Bench Press**: Primary: ["chest"], Secondary: ["triceps", "rear-delts"]

### Assignment Rules:
1. **Primary FAUs**: Main muscle groups that do the majority of work
2. **Secondary FAUs**: Assisting muscle groups with significant involvement
3. **Multiple primaries OK**: Some exercises hit multiple areas equally (like rear delt flies)
4. **Be specific**: Use "rear-delts" not just "shoulders", "upper-arm-anterior" not "arms"

## Equipment Categories
Common equipment types to include:
- barbell, dumbbell, kettlebell
- cable, machine, bodyweight
- bench, rack, pull-up-bar
- resistance-band, suspension-trainer

## Exercise Categories to Cover
Ensure good coverage across:
- **Chest**: bench variations, flyes, dips
- **Back**: rows, pull-ups, deadlift variations  
- **Shoulders**: presses, raises, rear delt work
- **Arms**: bicep curls, tricep work, forearm exercises
- **Legs**: squats, lunges, deadlifts, isolation work
- **Core**: various ab and oblique exercises

## Output Requirements
Create a single file that can seed the exercise library. This should be either:
- A Prisma seed script (`lib/exercise-library-seed.ts`)
- A migration file with INSERT statements
- A JSON data file with the exercise definitions

The file should include:
- 100-200 comprehensive exercises
- Proper FAU mappings for each
- Equipment classifications
- Aliases for searchability
- Clear, consistent naming

## Constraints
- **DO NOT** modify existing application files
- **DO NOT** change the database schema
- **ONLY** create the seeding data file
- Ensure all FAU names match exactly the 16 defined above
- Use consistent exercise naming (proper case, clear descriptions)

## Starting Point
Check the existing codebase for any current exercise definitions or seeding files. Use these as a foundation and expand significantly.

## Validation
When complete, the seeding file should enable:
- Comprehensive exercise search by name/alias
- Filtering exercises by FAU (muscle group)
- Accurate volume calculations per FAU
- Good coverage of common gym exercises

## Success Criteria
- 100-200 exercises covering all major movement patterns
- Every exercise has at least one primary FAU
- Secondary FAUs used appropriately for assisting muscles
- Equipment and aliases support good searchability
- Ready to import/run without additional setup

Please collaborate with me on the exercise selection and FAU mappings to ensure accuracy and completeness.