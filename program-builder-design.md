# Program Builder Design Specification

## Overview

Desktop-first, single-page program creation interface to replace CSV-only workflow. Focus on simplicity with incremental building and real-time feedback.

## Design Decisions Summary

### 1. Program Creation Approach
- **Format**: Single-page interface (not wizard) - better for desktop
- **Initial Form**: Name, Type (Strength only for V1), Notes
- **No predetermined week count** - users build incrementally
- **No templates** - blank slate approach
- **No prepopulation** - all built from scratch
- **Progressive validation** - show issues but don't block

### 2. Functional Aesthetic Units (FAUs)
Primary muscle groupings for volume visualization:

```typescript
const functionalAestheticUnits = {
  'chest': ['pectoralis-major', 'pectoralis-minor'],
  'mid-back': ['rhomboids', 'middle-trapezius', 'teres-major', 'teres-minor'],
  'lower-back': ['erector-spinae', 'multifidus'],
  'front-delts': ['anterior-deltoid'],
  'side-delts': ['medial-deltoid'],
  'rear-delts': ['posterior-deltoid'],
  'lats': ['latissimus-dorsi'],
  'traps': ['upper-trapezius', 'middle-trapezius', 'lower-trapezius'],
  'upper-arm-anterior': ['biceps-brachii', 'brachialis', 'brachioradialis'], // could be "biceps"
  'triceps': ['triceps-brachii'],
  'forearms': ['forearm-flexors', 'forearm-extensors'],
  'neck': ['sternocleidomastoid'],
  'quads': ['quadriceps-femoris'],
  'adductors': ['adductor-magnus', 'adductor-longus', 'adductor-brevis'],
  'hamstrings': ['biceps-femoris', 'semitendinosus', 'semimembranosus'],
  'glutes': ['gluteus-maximus', 'gluteus-medius', 'gluteus-minimus'],
  'calves': ['gastrocnemius', 'soleus'],
  'abs': ['rectus-abdominis'],
  'obliques': ['external-obliques', 'internal-obliques']
}
```

### 3. Volume Calculation
- **Method**: Sets only (no reps or weight weighting)
- **Real-time updates** as exercises are added/removed
- **Display**: FAU breakdown in sidebar during program building
- **No warnings** - just informational

### 4. User Interface Layout

```
/programs/new - Single Page Layout
┌─────────────────────────────────────┬─────────────────────┐
│ Program Form & Week Builder         │ FAU Volume Viz      │
│ ┌─────────────────────────────────┐ │ (Real-time)         │
│ │ Name: [____________]            │ │                     │
│ │ Type: Strength                  │ │ Current Week: [v]   │
│ │ Notes: [_____________]          │ │                     │
│ └─────────────────────────────────┘ │ ┌─────────────────┐ │
│                                     │ │ Chest:     ██░░ │ │
│ Week Management                     │ │ Mid-back:  ████ │ │
│ ┌─────────────────────────────────┐ │ │ Lats:      ███░ │ │
│ │ Week 1                          │ │ │ Quads:     ██░░ │ │
│ │   Day 1 [inline edit]           │ │ │ etc...          │ │
│ │   Day 2 [inline edit]           │ │ └─────────────────┘ │
│ │   + Add Workout                 │ │                     │
│ │                                 │ │                     │
│ │ + Add Week | Duplicate Week 1   │ │                     │
│ └─────────────────────────────────┘ │                     │
└─────────────────────────────────────┴─────────────────────┘
```

### 5. Exercise Selection Flow

**Trigger**: User clicks "Add Exercise" in workout
**Interface**: Modal overlay

```
Exercise Library Modal
┌──────────────────────────────────────────────────┐
│ Search: [hammer curl__________] 🔍               │
│                                                  │
│ Filter by FAU:                                   │
│ [Chest] [Mid-back] [Lats] [Upper-arm-anterior]   │
│ [Triceps] [Quads] [Hamstrings] [Glutes] ...      │
│                                                  │
│ Results:                                         │
│ ┌──────────────────────────────────────────────┐ │
│ │ Hammer Curl                           [Select]│ │
│ │ Primary: Upper-arm-anterior                   │ │
│ │ Secondary: Forearms                           │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ [Add Custom Exercise] (V2 feature)               │
└──────────────────────────────────────────────────┘
```

**Search Features**:
- Search through exercise names and aliases
- Filter by FAU tags
- Show primary/secondary muscle groups
- No exercise suggestions (V1)
- Custom exercise creation tabled for V2

### 6. Week & Workout Management

**Week Creation**:
- No predefined week count - add incrementally
- Can duplicate any week with ≥1 workout containing ≥1 exercise

**Workout Management**:
- Auto-name as "Day 1", "Day 2", etc. (user-editable)
- **Inline editing** - expand/collapse within the same page view
- Can duplicate individual workouts between weeks
- No templates initially

**Duplication Rules**:
- Duplicate everything (exercises + prescribed sets)
- Available immediately when source has content
- No special "copy and modify" workflows (V1)

### 7. Platform Focus

**Primary Target**: Desktop browser
**Mobile**: Not prioritized for program creation
- Focus on desktop program building experience
- Mobile might handle quick workout modifications later
- Desktop-first justifies single-page over wizard approach

### 8. Data Flow & Storage

**Program Creation**:
1. User creates program record (`isUserCreated = true`)
2. Incrementally add weeks/workouts/exercises
3. Auto-save as they build
4. Real-time FAU calculation and display

**Exercise Integration**:
- Exercise definitions with FAU metadata
- Search by name/alias + FAU filtering
- Prescribed sets attached to exercises in workouts

**No Completion States**:
- No "complete week" concept
- Progressive building with real-time feedback
- Users can duplicate/modify at any time

## Implementation Phases

### Phase 1A: Database Foundation
- [ ] Schema updates for FAU metadata on ExerciseDefinition
- [ ] Program tracking fields (programType, isUserCreated, timestamps)
- [ ] Exercise library seeding with FAU mappings

### Phase 1B: Basic Program Structure
- [ ] Program creation form (name, notes, type)
- [ ] Week CRUD operations
- [ ] Workout CRUD within weeks
- [ ] Basic duplication logic

### Phase 1C: Exercise Integration
- [ ] Exercise search modal with FAU filtering
- [ ] Add exercises to workouts
- [ ] Prescribed sets management
- [ ] Exercise library search functionality

### Phase 1D: Real-time Visualization
- [ ] FAU volume calculation logic
- [ ] Sidebar visualization component
- [ ] Real-time updates as exercises added/removed

## Technical Considerations

### Database Schema Updates
```sql
-- Add FAU metadata to ExerciseDefinition
ALTER TABLE ExerciseDefinition ADD COLUMN primaryFAUs TEXT[];
ALTER TABLE ExerciseDefinition ADD COLUMN secondaryFAUs TEXT[];

-- Add program management fields  
ALTER TABLE Program ADD COLUMN programType VARCHAR(50) DEFAULT 'strength';
ALTER TABLE Program ADD COLUMN isUserCreated BOOLEAN DEFAULT false;
ALTER TABLE Program ADD COLUMN createdAt TIMESTAMP DEFAULT NOW();
ALTER TABLE Program ADD COLUMN updatedAt TIMESTAMP DEFAULT NOW();
```

### API Endpoints Needed
- `POST /api/programs` - Create new program
- `POST /api/programs/[id]/weeks` - Add week to program  
- `POST /api/weeks/[id]/workouts` - Add workout to week
- `GET /api/exercises/search` - Search exercise library with FAU filters
- `POST /api/workouts/[id]/exercises` - Add exercise to workout
- `PUT /api/weeks/[id]/duplicate` - Duplicate week
- `PUT /api/workouts/[id]/duplicate` - Duplicate workout

### Component Structure
```
ProgramBuilder/
├── ProgramForm (name, type, notes)
├── WeekManager 
│   ├── WeekCard
│   ├── WorkoutCard (inline editing)
│   └── AddWeekButton
├── ExerciseLibraryModal
│   ├── SearchInput
│   ├── FAUFilters  
│   └── ExerciseResultsList
└── FAUVisualizationSidebar
    ├── WeekSelector
    └── FAUVolumeChart
```

## Success Criteria

**V1 Goals**:
- [ ] Create programs faster than CSV import for simple programs
- [ ] Real-time FAU visualization shows training balance
- [ ] Week/workout duplication reduces repetitive entry
- [ ] Exercise search with FAU filtering works smoothly
- [ ] Inline workout editing maintains single-page experience
- [ ] Desktop-optimized interface feels native and responsive

**Technical**:
- [ ] Exercise library search performs well with 1000+ exercises
- [ ] Real-time FAU calculations don't cause UI lag
- [ ] Duplication operations complete quickly
- [ ] Progressive validation provides helpful feedback
- [ ] FAU volume accuracy matches user expectations

## Future Enhancements (V2+)

- Custom exercise creation
- Program templates and workout suggestions
- Mobile program editing interface
- Advanced analytics and program comparisons
- Collaboration features
- Exercise instruction integration
- Program sharing and community features

## Notes

- Focus on simplicity and incremental building
- Desktop-first approach allows richer interactions
- FAU system enables meaningful volume tracking
- No predetermined structure - pure blank slate
- Real-time feedback keeps users oriented
- Duplication capabilities reduce repetitive work