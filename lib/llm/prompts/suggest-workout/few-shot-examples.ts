import type { SuggestWorkoutPayload, SuggestionResponse } from './schemas'

/**
 * Few-shot examples for the Suggest Workout prompt.
 *
 * Exactly ONE example is included per request (selected by archetype
 * match) — including several would blow the token budget and, worse,
 * teach cheap models to copy example exercise ids into real output.
 * All example ids use the `demo_` prefix so any bleed is obvious in
 * validation failures and logs.
 *
 * Every example's `output` must validate against
 * `buildSuggestionResponseSchema(example.candidateIds,
 * exerciseCountRange(example.timeBudgetMinutes))` — pinned by
 * `__tests__/lib/llm/suggest-workout-prompt.test.ts`. If you edit an
 * example, run that test.
 */

export interface FewShotExample {
  archetype: string
  /** Matched against goal sentences + today's free text when selecting. */
  keywords: string[]
  timeBudgetMinutes: number
  /** Every id the example output may reference. Used by tests. */
  candidateIds: string[]
  /** Abridged input, in the same rendered format the real prompt uses. */
  inputSnippet: string
  output: SuggestionResponse
}

export const CYCLIST_EXAMPLE: FewShotExample = {
  archetype: 'cyclist',
  keywords: [
    'bike', 'biking', 'cycling', 'ride', 'riding', 'run', 'running',
    'cardio', 'race', 'spare legs', 'fresh legs',
  ],
  timeBudgetMinutes: 45,
  candidateIds: [
    'demo_bench', 'demo_incline_db', 'demo_ohp', 'demo_row', 'demo_latpull',
    'demo_fly', 'demo_curl', 'demo_pushdown', 'demo_lateral', 'demo_facepull',
    'demo_rdl', 'demo_legpress', 'demo_pullup',
  ],
  inputSnippet: `USER PROFILE
Goals: Upper-body hypertrophy focus; Spare legs for weekend rides
Weekly intent: at least 1 heavy legs session per week
Equipment: barbell, dumbbells, cable, machines

TRAINING STATE (abridged)
muscle | last | heavy | 7d | 14d | target | actual | deficit(+=under) | status
chest | 3d | 3d | 12 | 21 | 10% | 12% | -2% | balanced
mid-back | 5d | never | 4 | 9 | 12% | 6% | +6% | neglected
quads | 9d | 9d | 0 | 6 | 8% | 4% | +4% | neglected
Weekly intent status: NOT satisfied: at least 1 heavy legs session per week (last satisfied 8d ago)
Confident preferences — likes: demo_row; dislikes: (none)

CANDIDATE EXERCISES (13 shown)
demo_bench | Barbell Bench Press | chest +triceps | barbell | horizontal_push | heavy | -
demo_row | Chest Supported Row | mid-back,lats | machines | horizontal_pull | moderate | 0.81
demo_rdl | Romanian Deadlift | hamstrings,glutes +lower-back | barbell | hinge | heavy | -
demo_legpress | Leg Press | quads,glutes | machines | squat | moderate | -
... (9 more)

TODAY'S REQUEST — user_preference must be built around this
Time: 45 minutes -> 4 to 6 exercises per option
Vibe: solid — normal working session
Prioritize: "biking tomorrow, keep legs out of it"`,
  output: {
    options: [
      {
        id: 'user_preference',
        name: 'User Preference',
        description: 'Upper-body only, exactly as asked — legs stay fresh for tomorrow\'s ride.',
        summary: '5 exercises, ~40 min. Push-pull upper session built around your favorites.',
        exercises: [
          { id: 'demo_bench', name: 'Barbell Bench Press', rationale: 'Chest is your stated focus and the pattern was last loaded 3 days ago — ready to press.' },
          { id: 'demo_row', name: 'Chest Supported Row', rationale: 'Mid-back is 6 points under target over 14 days, and this is your most-kept exercise.' },
          { id: 'demo_ohp', name: 'Seated Dumbbell Shoulder Press', rationale: 'Rounds out pressing without adding any leg load.' },
          { id: 'demo_latpull', name: 'Lat Pulldown', rationale: 'Second pull to keep chipping at the back deficit.' },
          { id: 'demo_curl', name: 'EZ-Bar Curl', rationale: 'Quick finisher that costs nothing from tomorrow\'s legs.' },
        ],
      },
      {
        id: 'data_driven',
        name: 'Data Driven',
        description: 'Your data disagrees with you: quads are 9 days stale and the weekly heavy-leg intent is unmet.',
        summary: '5 exercises, ~45 min. Legs first, back deficit second.',
        exercises: [
          { id: 'demo_rdl', name: 'Romanian Deadlift', rationale: 'No hinge work in 9 days and your heavy-leg-day rule is unsatisfied this week.' },
          { id: 'demo_legpress', name: 'Leg Press', rationale: 'Quads are 4 points under target with zero sets in 7 days.' },
          { id: 'demo_row', name: 'Chest Supported Row', rationale: 'Mid-back carries the largest upper-body deficit at +6.' },
          { id: 'demo_latpull', name: 'Lat Pulldown', rationale: 'Extra pull volume while chest sits at target already.' },
          { id: 'demo_facepull', name: 'Face Pull', rationale: 'Cheap rear-delt work that has been absent for two weeks.' },
        ],
      },
      {
        id: 'wild_card',
        name: 'Wild Card',
        description: 'Cable-and-bodyweight upper day — patterns you almost never touch, legs still spared.',
        summary: '5 exercises, ~40 min. Vertical pull and isolation variety.',
        exercises: [
          { id: 'demo_pullup', name: 'Pull-Up', rationale: 'You row weekly but never pull vertically — different lat stimulus, zero leg cost.' },
          { id: 'demo_incline_db', name: 'Incline Dumbbell Press', rationale: 'Upper-chest angle you have not logged recently.' },
          { id: 'demo_fly', name: 'Cable Fly', rationale: 'Constant-tension chest work as a change from pressing.' },
          { id: 'demo_lateral', name: 'Cable Lateral Raise', rationale: 'Side delts get no direct work in your recent logs.' },
          { id: 'demo_pushdown', name: 'Rope Pushdown', rationale: 'Arm finisher to replace the leg volume you skipped.' },
        ],
      },
    ],
    warnings: [
      'Your one-heavy-leg-day rule is unmet this week and you asked to skip legs again. If you pass on the Data Driven option, plan a leg session before Sunday.',
    ],
  },
}

export const BODYBUILDER_EXAMPLE: FewShotExample = {
  archetype: 'bodybuilder',
  keywords: [
    'hypertrophy', 'physique', 'aesthetic', 'pump', 'bigger', 'size',
    'muscle', 'chest day', 'arm day', 'bro split', 'lean',
  ],
  timeBudgetMinutes: 60,
  candidateIds: [
    'demo_bench', 'demo_incline_db', 'demo_fly', 'demo_dips', 'demo_ohp_bb',
    'demo_row_bb', 'demo_latpull', 'demo_pullover', 'demo_facepull',
    'demo_lateral', 'demo_curl', 'demo_pushdown', 'demo_pullup', 'demo_db_row',
  ],
  inputSnippet: `USER PROFILE
Goals: Build a bigger chest and arms; Hypertrophy focus
Intensity preference: hypertrophy
Equipment: barbell, dumbbells, cable, machines

TRAINING STATE (abridged)
muscle | last | heavy | 7d | 14d | target | actual | deficit(+=under) | status
chest | 2d | 2d | 16 | 30 | 12% | 16% | -4% | over
lats | 6d | never | 3 | 8 | 12% | 6% | +6% | neglected
mid-back | 6d | never | 3 | 7 | 11% | 5% | +6% | neglected
Movement calibration: horizontal_push ~185 (recent 175,180,180,185,185), 8-12 reps
Reaction to past suggestions (30d): often deletes: quads
Confident preferences — likes: demo_incline_db; dislikes: (none)

CANDIDATE EXERCISES (14 shown)
demo_bench | Barbell Bench Press | chest +triceps | barbell | horizontal_push | heavy | -
demo_row_bb | Barbell Row | mid-back,lats | barbell | horizontal_pull | heavy | -
demo_pullover | Cable Pullover | lats +chest | cable | isolation | light | -
... (11 more)

TODAY'S REQUEST — user_preference must be built around this
Time: 60 minutes -> 5 to 8 exercises per option
Vibe: heavy — feeling strong, open to top-end loads
Prioritize: "chest day"`,
  output: {
    options: [
      {
        id: 'user_preference',
        name: 'User Preference',
        description: 'The chest day you asked for, pressing heavy while you feel strong.',
        summary: '6 exercises, ~55 min. Heavy presses first, isolation pump last.',
        exercises: [
          { id: 'demo_bench', name: 'Barbell Bench Press', rationale: 'You feel strong — work at or above your recent 185 top sets.' },
          { id: 'demo_incline_db', name: 'Incline Dumbbell Press', rationale: 'Your most-liked press, hitting the upper chest next.' },
          { id: 'demo_dips', name: 'Weighted Dip', rationale: 'Third press angle to fill out a true chest day.' },
          { id: 'demo_fly', name: 'Cable Fly', rationale: 'Isolation volume once the heavy pressing is done.' },
          { id: 'demo_lateral', name: 'Cable Lateral Raise', rationale: 'Side delts round out the pressing look you are after.' },
          { id: 'demo_pushdown', name: 'Rope Pushdown', rationale: 'Triceps finisher after three pressing movements.' },
        ],
      },
      {
        id: 'data_driven',
        name: 'Data Driven',
        description: 'Chest is 4 points over target while lats and mid-back sit 6 under — this is a pull day.',
        summary: '5 exercises, ~55 min. Heavy rows first, rear delts and arms last.',
        exercises: [
          { id: 'demo_row_bb', name: 'Barbell Row', rationale: 'Biggest deficit is mid-back and it has had no heavy work in 14 days.' },
          { id: 'demo_latpull', name: 'Lat Pulldown', rationale: 'Lats are 6 points under target with 3 sets in 7 days.' },
          { id: 'demo_pullup', name: 'Pull-Up', rationale: 'Second vertical pull to close the lat gap faster.' },
          { id: 'demo_facepull', name: 'Face Pull', rationale: 'Rear delts balance two weeks of press-dominant training.' },
          { id: 'demo_curl', name: 'EZ-Bar Curl', rationale: 'Arms still get direct work, so the day serves your goal too.' },
        ],
      },
      {
        id: 'wild_card',
        name: 'Wild Card',
        description: 'Chest-back superset day — presses stay, but every press is paired with a pull.',
        summary: '5 exercises, ~55 min. Antagonist pairs keep the pump without deepening the imbalance.',
        exercises: [
          { id: 'demo_bench', name: 'Barbell Bench Press', rationale: 'Keep the heavy press, paired with a row between sets.' },
          { id: 'demo_db_row', name: 'One-Arm Dumbbell Row', rationale: 'A row you never log — supersets cleanly with pressing.' },
          { id: 'demo_incline_db', name: 'Incline Dumbbell Press', rationale: 'Second press of the pairing scheme.' },
          { id: 'demo_pullover', name: 'Cable Pullover', rationale: 'Novel lat isolation that still stretches the chest.' },
          { id: 'demo_facepull', name: 'Face Pull', rationale: 'Finisher for the rear delts both other options need.' },
        ],
      },
    ],
    warnings: [
      'Chest has run 4 points over target for two weeks while your back sits 6 under. Another pure chest day widens that gap.',
    ],
  },
}

export const POWERLIFTER_EXAMPLE: FewShotExample = {
  archetype: 'powerlifter',
  keywords: [
    'strength', 'stronger', 'bench', 'squat', 'deadlift', '1rm', 'pr',
    'powerlifting', 'total', 'heavy single', 'top set',
  ],
  timeBudgetMinutes: 60,
  candidateIds: [
    'demo_bench', 'demo_cgbench', 'demo_pause_bench', 'demo_squat',
    'demo_front_squat', 'demo_dl', 'demo_gm', 'demo_ohp_bb', 'demo_row_bb',
    'demo_pullup', 'demo_facepull', 'demo_pushdown', 'demo_legpress',
  ],
  inputSnippet: `USER PROFILE
Goals: Add 30 lbs to my bench this year; Keep squat and deadlift moving
Intensity preference: strength
Equipment: barbell, cable, machines

TRAINING STATE (abridged)
muscle | last | heavy | 7d | 14d | target | actual | deficit(+=under) | status
chest | 3d | 3d | 9 | 18 | 10% | 11% | -1% | balanced
quads | 8d | 8d | 2 | 7 | 10% | 5% | +5% | neglected
Movement calibration: horizontal_push ~232 (recent 225,225,230,235,235), 3-5 reps @ RPE 8
Movement calibration: squat ~315 (recent 305,315,315), 3-5 reps @ RPE 8, last 8d ago
Goal progress: Add 30 lbs to my bench: progressing, 6 weeks observed (top sets 225 -> 235)

CANDIDATE EXERCISES (13 shown)
demo_bench | Barbell Bench Press | chest +triceps | barbell | horizontal_push | heavy | -
demo_squat | Barbell Back Squat | quads,glutes +lower-back | barbell | squat | heavy | -
demo_pause_bench | Paused Bench Press | chest +triceps | barbell | horizontal_push | heavy | -
... (10 more)

TODAY'S REQUEST — user_preference must be built around this
Time: 60 minutes -> 5 to 8 exercises per option
Vibe: heavy — feeling strong, open to top-end loads
Prioritize: "bench is moving well, want to push it"`,
  output: {
    options: [
      {
        id: 'user_preference',
        name: 'User Preference',
        description: 'Push the bench while it is moving — heavy top sets, then pressing support work.',
        summary: '5 exercises, ~55 min. Bench-led strength day.',
        exercises: [
          { id: 'demo_bench', name: 'Barbell Bench Press', rationale: 'Six weeks of progress from 225 to 235 and you feel strong — earn a new top set.' },
          { id: 'demo_cgbench', name: 'Close-Grip Bench Press', rationale: 'Triceps-biased back-off pressing to support the goal lift.' },
          { id: 'demo_row_bb', name: 'Barbell Row', rationale: 'Heavy horizontal pull keeps your pressing base stable.' },
          { id: 'demo_facepull', name: 'Face Pull', rationale: 'Shoulder health work behind a heavy press day.' },
          { id: 'demo_pushdown', name: 'Rope Pushdown', rationale: 'Extra triceps volume where bench lockouts are won.' },
        ],
      },
      {
        id: 'data_driven',
        name: 'Data Driven',
        description: 'Squat pattern is 8 days stale and quads are 5 points under — the bench can wait two days.',
        summary: '5 exercises, ~55 min. Heavy squat day with pulling balance.',
        exercises: [
          { id: 'demo_squat', name: 'Barbell Back Squat', rationale: 'Last squatted 8 days ago at 315 — longest gap of any main lift.' },
          { id: 'demo_legpress', name: 'Leg Press', rationale: 'Quad volume without more spinal loading after squats.' },
          { id: 'demo_gm', name: 'Good Morning', rationale: 'Hinge work keeps deadlift moving on a leg-focused day.' },
          { id: 'demo_pullup', name: 'Pull-Up', rationale: 'Upper-body pull so the day is not legs alone.' },
          { id: 'demo_facepull', name: 'Face Pull', rationale: 'Low-cost rear-delt work to finish.' },
        ],
      },
      {
        id: 'wild_card',
        name: 'Wild Card',
        description: 'Variation day — paused bench and front squat attack the same lifts from angles you never train.',
        summary: '5 exercises, ~55 min. New stimulus for both goal lifts.',
        exercises: [
          { id: 'demo_pause_bench', name: 'Paused Bench Press', rationale: 'Builds strength off the chest, the slowest part of most benches.' },
          { id: 'demo_front_squat', name: 'Front Squat', rationale: 'Squat stimulus with lighter loads while the pattern is stale.' },
          { id: 'demo_ohp_bb', name: 'Overhead Press', rationale: 'Overhead work is absent from your recent logs and carries over to bench.' },
          { id: 'demo_pullup', name: 'Pull-Up', rationale: 'Vertical pull to balance two pressing movements.' },
          { id: 'demo_dl', name: 'Deadlift', rationale: 'One heavy pull keeps the third lift honest this week.' },
        ],
      },
    ],
    warnings: [
      'If you take the bench-focused option, squat within the next 2 days — the pattern is 8 days stale and quads are your largest deficit.',
    ],
  },
}

export const BEGINNER_EXAMPLE: FewShotExample = {
  archetype: 'beginner',
  keywords: ['new', 'beginner', 'started', 'starting', 'first', 'learn', 'gym anxiety'],
  timeBudgetMinutes: 30,
  candidateIds: [
    'demo_chest_press', 'demo_latpull', 'demo_legpress', 'demo_shoulder_press',
    'demo_row_m', 'demo_curl_db', 'demo_legcurl', 'demo_goblet', 'demo_plank',
    'demo_pushdown',
  ],
  inputSnippet: `USER PROFILE
Goals: Get comfortable in the gym; General fitness
Equipment: machines, dumbbells, cable

TRAINING STATE (abridged)
muscle | last | heavy | 7d | 14d | target | actual | deficit(+=under) | status
chest | 4d | never | 3 | 5 | 10% | 11% | -1% | balanced
quads | 4d | never | 3 | 5 | 10% | 10% | 0% | balanced
No movement calibration yet (fewer than 3 logged sessions per pattern). Pick common, easy-to-learn movements and keep loads conservative.
No suggestion history yet.
Confident preferences: none yet — not enough data.

CANDIDATE EXERCISES (10 shown)
demo_chest_press | Machine Chest Press | chest +triceps | machines | horizontal_push | moderate | -
demo_goblet | Goblet Squat | quads,glutes | dumbbells | squat | moderate | -
demo_row_m | Seated Cable Row | mid-back,lats | cable | horizontal_pull | moderate | -
... (7 more)

TODAY'S REQUEST — user_preference must be built around this
Time: 30 minutes -> 3 to 5 exercises per option
Vibe: easy — keep it light
Prioritize: (none)
Avoid/deprioritize: (none)`,
  output: {
    options: [
      {
        id: 'user_preference',
        name: 'User Preference',
        description: 'An easy machine-based session, matching the light day you asked for.',
        summary: '4 exercises, ~30 min. Simple full body, nothing to overthink.',
        exercises: [
          { id: 'demo_chest_press', name: 'Machine Chest Press', rationale: 'Fixed path makes this easy to do well while you build the habit.' },
          { id: 'demo_latpull', name: 'Lat Pulldown', rationale: 'Balances the press with a pull, same seat-and-go simplicity.' },
          { id: 'demo_legpress', name: 'Leg Press', rationale: 'Leg work without needing barbell technique yet.' },
          { id: 'demo_plank', name: 'Plank', rationale: 'Quick core finisher with zero setup.' },
        ],
      },
      {
        id: 'data_driven',
        name: 'Data Driven',
        description: 'Your logs are evenly balanced so far — this keeps every muscle group ticking.',
        summary: '4 exercises, ~30 min. Full body with one free-weight movement to learn.',
        exercises: [
          { id: 'demo_goblet', name: 'Goblet Squat', rationale: 'The friendliest way to learn squatting — start light.' },
          { id: 'demo_row_m', name: 'Seated Cable Row', rationale: 'Rowing keeps your back even with your pressing.' },
          { id: 'demo_shoulder_press', name: 'Machine Shoulder Press', rationale: 'Adds an overhead angle your first sessions have not covered.' },
          { id: 'demo_legcurl', name: 'Seated Leg Curl', rationale: 'Hamstrings get direct work the leg press does not give.' },
        ],
      },
      {
        id: 'wild_card',
        name: 'Wild Card',
        description: 'Dumbbell day — same effort, but you practice controlling free weights.',
        summary: '4 exercises, ~30 min. A first step beyond the machines.',
        exercises: [
          { id: 'demo_goblet', name: 'Goblet Squat', rationale: 'Doubles as leg work and free-weight practice.' },
          { id: 'demo_curl_db', name: 'Dumbbell Curl', rationale: 'Simple arm work most people enjoy early on.' },
          { id: 'demo_pushdown', name: 'Rope Pushdown', rationale: 'Pairs with curls for an easy arm finish.' },
          { id: 'demo_latpull', name: 'Lat Pulldown', rationale: 'One familiar machine so the day is not all new.' },
        ],
      },
    ],
    warnings: [],
  },
}

export const RETURNING_EXAMPLE: FewShotExample = {
  archetype: 'returning',
  keywords: ['back at it', 'been a while', 'layoff', 'break', 'vacation', 'sick', 'rust'],
  timeBudgetMinutes: 45,
  candidateIds: [
    'demo_legpress', 'demo_chest_press', 'demo_latpull', 'demo_row_m',
    'demo_rdl_db', 'demo_goblet', 'demo_ohp_db', 'demo_curl', 'demo_pushdown',
    'demo_plank', 'demo_bench', 'demo_squat',
  ],
  inputSnippet: `USER PROFILE
Goals: General strength; Stay consistent this time
Equipment: barbell, dumbbells, cable, machines

TRAINING STATE (abridged)
muscle | last | heavy | 7d | 14d | target | actual | deficit(+=under) | status
chest | 22d | 22d | 0 | 0 | 10% | 0% | +10% | neglected
mid-back | 22d | never | 0 | 0 | 11% | 0% | +11% | neglected
quads | 24d | 24d | 0 | 0 | 10% | 0% | +10% | neglected
(every muscle group: 0 sets in 14d)
Movement calibration: horizontal_push ~150 (recent 145,150,150), 8-12 reps, last 22d ago

CANDIDATE EXERCISES (12 shown)
demo_chest_press | Machine Chest Press | chest +triceps | machines | horizontal_push | moderate | -
demo_goblet | Goblet Squat | quads,glutes | dumbbells | squat | moderate | -
... (10 more)

TODAY'S REQUEST — user_preference must be built around this
Time: 45 minutes -> 4 to 6 exercises per option
Vibe: easy — keep it light
Prioritize: "first day back after three weeks off"`,
  output: {
    options: [
      {
        id: 'user_preference',
        name: 'User Preference',
        description: 'The easy re-entry you asked for — machines, moderate loads, full body.',
        summary: '4 exercises, ~35 min. Low-stakes first day back.',
        exercises: [
          { id: 'demo_chest_press', name: 'Machine Chest Press', rationale: 'Pressing again without chasing your old 150 top sets yet.' },
          { id: 'demo_row_m', name: 'Seated Cable Row', rationale: 'Every muscle group is at zero sets — a row covers the biggest gap.' },
          { id: 'demo_legpress', name: 'Leg Press', rationale: 'Leg volume with less soreness risk than free squats after 24 days off.' },
          { id: 'demo_plank', name: 'Plank', rationale: 'Gentle core work to close out the return session.' },
        ],
      },
      {
        id: 'data_driven',
        name: 'Data Driven',
        description: 'Three weeks of zeros everywhere — one balanced full-body session restarts every pattern at once.',
        summary: '5 exercises, ~45 min. Squat, hinge, push, pull in one day.',
        exercises: [
          { id: 'demo_goblet', name: 'Goblet Squat', rationale: 'Reopens the squat pattern at self-limiting loads.' },
          { id: 'demo_rdl_db', name: 'Dumbbell Romanian Deadlift', rationale: 'Light hinge so hamstrings are not wrecked by day one.' },
          { id: 'demo_row_m', name: 'Seated Cable Row', rationale: 'Mid-back holds your largest deficit at +11.' },
          { id: 'demo_ohp_db', name: 'Seated Dumbbell Shoulder Press', rationale: 'One press covers chest and shoulders for the restart week.' },
          { id: 'demo_latpull', name: 'Lat Pulldown', rationale: 'Second pull — a two-to-one pull bias eases you back safely.' },
        ],
      },
      {
        id: 'wild_card',
        name: 'Wild Card',
        description: 'A light pump day — arms and easy movements to make day one enjoyable, not punishing.',
        summary: '4 exercises, ~35 min. Fun first, fitness follows.',
        exercises: [
          { id: 'demo_bench', name: 'Barbell Bench Press', rationale: 'One familiar barbell lift at well under your old numbers, just to reconnect.' },
          { id: 'demo_curl', name: 'EZ-Bar Curl', rationale: 'Low-cost arm work that makes returning feel good.' },
          { id: 'demo_pushdown', name: 'Rope Pushdown', rationale: 'Pairs with curls for an easy finish.' },
          { id: 'demo_plank', name: 'Plank', rationale: 'Core re-entry without loading a cold spine.' },
        ],
      },
    ],
    warnings: [
      'First session in over three weeks — every option trims volume, and your working weights will be below your last logged numbers. That is expected.',
    ],
  },
}

export const SHORT_SESSION_EXAMPLE: FewShotExample = {
  archetype: 'short-session',
  keywords: ['quick', 'short', 'lunch', 'squeeze', 'busy', 'only have'],
  timeBudgetMinutes: 20,
  candidateIds: [
    'demo_curl', 'demo_hammer', 'demo_pushdown', 'demo_cgbench', 'demo_dips',
    'demo_facepull', 'demo_lateral', 'demo_row_m', 'demo_farmer', 'demo_pullup',
  ],
  inputSnippet: `USER PROFILE
Goals: Bigger arms; Train 4x per week around work
Equipment: barbell, dumbbells, cable, machines

TRAINING STATE (abridged)
muscle | last | heavy | 7d | 14d | target | actual | deficit(+=under) | status
biceps | 4d | never | 4 | 8 | 7% | 6% | +1% | balanced
rear-delts | 12d | never | 0 | 2 | 6% | 2% | +4% | neglected
mid-back | 6d | never | 5 | 9 | 11% | 7% | +4% | neglected

CANDIDATE EXERCISES (10 shown)
demo_curl | EZ-Bar Curl | biceps | barbell | isolation | light | -
demo_row_m | Seated Cable Row | mid-back,lats | cable | horizontal_pull | moderate | -
demo_farmer | Farmer Carry | forearms,traps +abs | dumbbells | carry | moderate | -
... (7 more)

TODAY'S REQUEST — user_preference must be built around this
Time: 20 minutes -> 2 to 3 exercises per option
Vibe: solid — normal working session
Prioritize: "arms, in and out fast"`,
  output: {
    options: [
      {
        id: 'user_preference',
        name: 'User Preference',
        description: 'Pure arms, superset to fit the clock.',
        summary: '3 exercises, ~20 min. Curl and pushdown back to back, hammer to finish.',
        exercises: [
          { id: 'demo_curl', name: 'EZ-Bar Curl', rationale: 'The arm focus you asked for — superset with pushdowns to save time.' },
          { id: 'demo_pushdown', name: 'Rope Pushdown', rationale: 'Triceps half of the superset; no rest wasted.' },
          { id: 'demo_hammer', name: 'Hammer Curl', rationale: 'Second biceps angle plus forearm work in one move.' },
        ],
      },
      {
        id: 'data_driven',
        name: 'Data Driven',
        description: 'Rear delts and mid-back are your real gaps — 20 minutes of pulling pays more than more curls.',
        summary: '3 exercises, ~20 min. Dense pull circuit.',
        exercises: [
          { id: 'demo_row_m', name: 'Seated Cable Row', rationale: 'Mid-back is 4 points under target — biggest gap you can close today.' },
          { id: 'demo_pullup', name: 'Pull-Up', rationale: 'Vertical pull doubles the back coverage and still hits biceps.' },
          { id: 'demo_facepull', name: 'Face Pull', rationale: 'Rear delts have 2 sets in 14 days — this is the fix.' },
        ],
      },
      {
        id: 'wild_card',
        name: 'Wild Card',
        description: 'Arms by another route — dips and carries load the arms without a single curl.',
        summary: '3 exercises, ~20 min. Heavy, simple, different.',
        exercises: [
          { id: 'demo_dips', name: 'Weighted Dip', rationale: 'More triceps growth per minute than any isolation move here.' },
          { id: 'demo_farmer', name: 'Farmer Carry', rationale: 'Forearms and grip — arm size you cannot get from curls.' },
          { id: 'demo_curl', name: 'EZ-Bar Curl', rationale: 'One direct biceps movement so the arm request is still honored.' },
        ],
      },
    ],
    warnings: [],
  },
}

export const FEW_SHOT_EXAMPLES: readonly FewShotExample[] = [
  CYCLIST_EXAMPLE,
  BODYBUILDER_EXAMPLE,
  POWERLIFTER_EXAMPLE,
  BEGINNER_EXAMPLE,
  RETURNING_EXAMPLE,
  SHORT_SESSION_EXAMPLE,
]

/**
 * Pick the single example that best matches this payload.
 *
 * Structural signals (data sparsity, layoff, very short session) beat
 * keyword matches — they change what a correct answer LOOKS like, while
 * keywords only change the topic. Falls back to the bodybuilder example
 * (hypertrophy is the modal user).
 */
export function selectFewShotExample(
  payload: SuggestWorkoutPayload,
): FewShotExample {
  const { training_state, ephemeral_context, durable_profile } = payload

  if (training_state.per_movement_calibration.length === 0) {
    return BEGINNER_EXAMPLE
  }

  const sessionGaps = training_state.per_fau
    .map((f) => f.last_session_days_ago)
    .filter((d): d is number => d !== null)
  const freshest = sessionGaps.length > 0 ? Math.min(...sessionGaps) : null
  if (freshest !== null && freshest >= 14) {
    return RETURNING_EXAMPLE
  }

  if (ephemeral_context.time_budget_minutes <= 25) {
    return SHORT_SESSION_EXAMPLE
  }

  const haystack = [
    ...durable_profile.goal_sentences,
    ephemeral_context.prioritize_freetext ?? '',
    ephemeral_context.deprioritize_freetext ?? '',
    durable_profile.default_intensity_preference ?? '',
  ]
    .join(' ')
    .toLowerCase()

  let best: FewShotExample = BODYBUILDER_EXAMPLE
  let bestScore = 0
  for (const example of FEW_SHOT_EXAMPLES) {
    const score = example.keywords.filter((k) => haystack.includes(k)).length
    if (score > bestScore) {
      best = example
      bestScore = score
    }
  }
  return best
}

/**
 * Render an example for inclusion at the top of the user message. The
 * output JSON is compact (no whitespace) — cheap models imitate the
 * format they see, and compact output halves output-token cost.
 */
export function renderFewShotExample(example: FewShotExample): string {
  return [
    `EXAMPLE (${example.archetype}) — format reference only. The exercises below are NOT in today's candidate list; never reuse their ids.`,
    'Input (abridged):',
    example.inputSnippet,
    'Output:',
    JSON.stringify(example.output),
    'END EXAMPLE',
  ].join('\n')
}
