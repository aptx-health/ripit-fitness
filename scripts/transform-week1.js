// Transform Week 1 CSV to CSV_SPEC.md format

const week1Data = [
  {workout: "Full Body #1", exercise: "Kneeling Cable Lat Pulldown", warmupSets: "1", workingSets: "3", reps: "8-10", earlyRPE: "7-8", lastRPE: "8-9", rest: "2-3 min", technique: "Long-length Partials", notes: "Try to keep cable and wrist aligned. Feel deep lat stretch at top."},
  {workout: "Full Body #1", exercise: "Low Incline Smith Machine Press", warmupSets: "1", workingSets: "3", reps: "8-10", earlyRPE: "7-8", lastRPE: "8-9", rest: "2-3 min", technique: "Pec Static Stretch (30s hold)", notes: "Set bench at ~15° incline. 1 second pause on chest while maintaining pec tension."},
  {workout: "Full Body #1", exercise: "Machine Hip Adduction", warmupSets: "1", workingSets: "2", reps: "10-12", earlyRPE: "7-8", lastRPE: "8-9", rest: "1-2 min", technique: "None", notes: "Mind-muscle connection with inner thighs. REDUCED FROM 3 SETS"},
  {workout: "Full Body #1", exercise: "Leg Press", warmupSets: "1", workingSets: "2", reps: "8-10", earlyRPE: "7-8", lastRPE: "8-9", rest: "3-4 min", technique: "Quad Static Stretch (30s)", notes: "Feet lower for quad focus. Deep as possible without back rounding. Control negative, slight pause at bottom. REDUCED FROM 3 SETS"},
  {workout: "Full Body #1", exercise: "Lying Paused Rope Face Pull", warmupSets: "N/A", workingSets: "1", reps: "10-12", earlyRPE: "7-8", lastRPE: "8-9", rest: "1-2 min", technique: "None", notes: "Pause 1-2 seconds in squeeze. Contract rear delts hard."},
  {workout: "Full Body #1", exercise: "Cable Crunch", warmupSets: "N/A", workingSets: "1", reps: "10-12", earlyRPE: "7-8", lastRPE: "8-9", rest: "1-2 min", technique: "None", notes: "Round lower back as you crunch. Maintain mind-muscle connection with abs."},
  {workout: "Full Body #2", exercise: "Seated DB Shoulder Press", warmupSets: "1", workingSets: "3", reps: "8-10", earlyRPE: "7-8", lastRPE: "8-9", rest: "2-3 min", technique: "None", notes: "Slightly rotate dumbbells in on negative, flare elbows out as you push."},
  {workout: "Full Body #2", exercise: "Paused Barbell RDL", warmupSets: "N/A", workingSets: "2", reps: "8-10", earlyRPE: "~6", lastRPE: "6-7", rest: "3-4 min", technique: "None", notes: "RPE intentionally low - causes muscle damage. 1 second pause at bottom. Stop 75% up to keep tension on hamstrings. Get to full lockout (bottom 3/4 ROM)."},
  {workout: "Full Body #2", exercise: "Chest Supported Machine Row", warmupSets: "1", workingSets: "3", reps: "8-10", earlyRPE: "7-8", lastRPE: "8-9", rest: "2-3 min", technique: "Long-length Partials", notes: "Flare elbows at ~45°. Squeeze shoulder blades hard at top."},
  {workout: "Full Body #2", exercise: "Hammer Preacher Curl", warmupSets: "N/A", workingSets: "1", reps: "10-12", earlyRPE: "7-8", lastRPE: "8-9", rest: "1-2 min", technique: "None", notes: "Targets brachialis and forearms. Squeeze dumbbell hard, curl 3/4 way up (bottom 3/4 ROM)."},
  {workout: "Full Body #2", exercise: "Cable Lateral Y-Raise", warmupSets: "N/A", workingSets: "1", reps: "10-12", earlyRPE: "8-9", lastRPE: "9-10", rest: "1-2 min", technique: "None", notes: "Raise cables up and out in Y motion. Connect with middle delt fibers."},
  {workout: "Full Body #2", exercise: "Overhead Cable Triceps Extension (Bar)", warmupSets: "N/A", workingSets: "1", reps: "8-10", earlyRPE: "8-9", lastRPE: "9-10", rest: "2-3 min", technique: "None", notes: "Nasty stretch on triceps throughout negative. Pause for 1-2 seconds in stretched position."},
  {workout: "Full Body #3", exercise: "Assisted Pull-Up (Superset A1)", warmupSets: "1", workingSets: "2", reps: "8-10", earlyRPE: "7-8", lastRPE: "8-9", rest: "1 min", technique: "Long-length Partials", notes: "Slow 2-3 second negative. Feel lats pulling apart. Slight 0.5-1s pause at bottom, lift chest and drive elbows down. Don't be afraid to use assistance."},
  {workout: "Full Body #3", exercise: "Paused Assisted Dip (Superset A2)", warmupSets: "1", workingSets: "2", reps: "8-10", earlyRPE: "7-8", lastRPE: "8-9", rest: "1 min", technique: "None", notes: "Slow 2-3 second negative. 1-2 second pause at bottom. Explode with control. Go as deep as shoulders allow (at least 90° elbow)."},
  {workout: "Full Body #3", exercise: "Incline DB Press (NEW)", warmupSets: "1", workingSets: "2", reps: "10-12", earlyRPE: "7-8", lastRPE: "8-9", rest: "1-2 min", technique: "None", notes: "ADDED FOR UPPER CHEST WEAK POINT - replaces Seated Leg Curl. Set bench at 30-45°. Control negative, press with chest."},
  {workout: "Full Body #3", exercise: "Leg Extension (Superset B2)", warmupSets: "1", workingSets: "2", reps: "8-10", earlyRPE: "7-8", lastRPE: "8-9", rest: "0.5-1 min", technique: "Long-length Partials", notes: "Seat back as far as comfortable. Grab handles hard to pull butt into seat. 2-3 second negative. Feel quads pulling apart."},
  {workout: "Full Body #3", exercise: "Cable Paused Shrug-in", warmupSets: "1", workingSets: "2", reps: "10-12", earlyRPE: "7-8", lastRPE: "8-9", rest: "0.5-1 min", technique: "Long-length Partials", notes: "Shrug up and in toward ears. 1-2 second pause at top AND bottom of each rep."},
  {workout: "Full Body #3", exercise: "Roman Chair Leg Raise", warmupSets: "N/A", workingSets: "1", reps: "10-20", earlyRPE: "N/A", lastRPE: "9-10", rest: "1-2 min", technique: "None", notes: "Allow lower back to round. Go until RPE 9-10 with controlled form."},
  {workout: "Full Body #4", exercise: "Lying Leg Curl", warmupSets: "1", workingSets: "1", reps: "8-10", earlyRPE: "7-8", lastRPE: "N/A", rest: "1-2 min", technique: "None", notes: "REDUCED TO 1 SET - mainly to warm up knees before hack squats. Don't push hard today."},
  {workout: "Full Body #4", exercise: "Hack Squat", warmupSets: "2-4", workingSets: "3", reps: "4/6/8", earlyRPE: "8-9", lastRPE: "9-10", rest: "3-5 min", technique: "None", notes: "REVERSE PYRAMID: Set 1=4 reps (heaviest), Set 2=drop 10-15% do 6 reps, Set 3=drop another 10-15% do 8 reps."},
  {workout: "Full Body #4", exercise: "Bent-Over Cable Pec Flye", warmupSets: "1", workingSets: "2", reps: "10-12", earlyRPE: "7-8", lastRPE: "8-9", rest: "0.5-1 min", technique: "None", notes: "Lean forward until torso parallel with floor. Flye straight out and down. Stretch and squeeze pecs."},
  {workout: "Full Body #4", exercise: "Neutral-Grip Lat Pulldown", warmupSets: "1", workingSets: "2", reps: "12-15", earlyRPE: "7-8", lastRPE: "8-9", rest: "2-3 min", technique: "Long-length Partials", notes: "Handle more out in front (like pullover/pulldown cross). Focus on feeling lats over weight used."},
  {workout: "Full Body #4", exercise: "Leg Press Calf Press", warmupSets: "1", workingSets: "2", reps: "10-12", earlyRPE: "8-9", lastRPE: "9-10", rest: "1-2 min", technique: "Calf Static Stretch (30s)", notes: "1-2 second pause at bottom. Roll ankle back/forth on balls of feet (not just up on toes)."},
  {workout: "Full Body #4", exercise: "Cable Reverse Flye (Mechanical Dropset)", warmupSets: "1", workingSets: "2", reps: "5+4+3+", earlyRPE: "8-9", lastRPE: "9-10", rest: "1-2 min", technique: "Mechanical Dropset", notes: "Take 3 big steps back, do 5 reps. Without rest, step forward do 4 reps. Without rest, step forward again do 3+ reps to RPE 9-10."},
  {workout: "Full Body #5", exercise: "Weak Point Exercise 1", warmupSets: "1", workingSets: "3", reps: "8-12", earlyRPE: "8", lastRPE: "9", rest: "1-3 min", technique: "None", notes: "Choose from upper chest options: Cable Crossover, Incline DB Flyes, or Low Incline Press variation."},
  {workout: "Full Body #5", exercise: "Weak Point Exercise 2 (optional)", warmupSets: "1", workingSets: "2", reps: "8-12", earlyRPE: "8", lastRPE: "9", rest: "1-3 min", technique: "None", notes: "If recovered: choose bicep or forearm work. If sore/fatigued: skip this exercise."},
  {workout: "Full Body #5", exercise: "Incline DB Curl", warmupSets: "N/A", workingSets: "1", reps: "10-12", earlyRPE: "9-10", lastRPE: "10", rest: "1-2 min", technique: "None", notes: "If L/R imbalance: 1 arm at a time starting with weaker. Take weaker to RPE 9-10, match reps with other arm. If balanced: both arms together."},
  {workout: "Full Body #5", exercise: "Overhead Barbell Triceps Extension", warmupSets: "1", workingSets: "3", reps: "8", earlyRPE: "9-10", lastRPE: "10", rest: "1-2 min", technique: "Dropset", notes: "Fairly heavy with bar (not rope). Aim to add weight weekly. Keep form tight while overloading triceps."},
  {workout: "Full Body #5", exercise: "Bottom 2/3 Constant Tension Preacher Curl", warmupSets: "N/A", workingSets: "1", reps: "12-15", earlyRPE: "9-10", lastRPE: "10", rest: "1-2 min", technique: "None", notes: "Stay in bottom 2/3 of curl - don't squeeze to top. Triceps pinned to pad. No pausing - constant tension on biceps."},
  {workout: "Full Body #5", exercise: "Cable Triceps Kickback", warmupSets: "N/A", workingSets: "1", reps: "8-10", earlyRPE: "9-10", lastRPE: "10", rest: "1-2 min", technique: "None", notes: "Upright or bent over (your choice). In full squeeze, shoulder should be behind torso."},
  {workout: "Full Body #5", exercise: "Standing Calf Raise", warmupSets: "1", workingSets: "3", reps: "12-15", earlyRPE: "8-9", lastRPE: "9-10", rest: "1-2 min", technique: "Calf Static Stretch (30s)", notes: "1-2 second pause at bottom. Roll ankle back/forth on balls of feet."},
];

// Map workouts to day numbers
const workoutToDayMap = {
  "Full Body #1": 1,
  "Full Body #2": 2,
  "Full Body #3": 3,
  "Full Body #4": 4,
  "Full Body #5": 5,
};

// Extract exercise group from exercise name
function extractExerciseGroup(exerciseName) {
  const supersetMatch = exerciseName.match(/\(Superset ([AB])(\d+)\)/);
  if (supersetMatch) {
    return supersetMatch[1]; // Return just "A" or "B"
  }
  return null;
}

// Clean exercise name (remove annotations like "(NEW)", "(Superset A1)", etc.)
function cleanExerciseName(exerciseName) {
  return exerciseName
    .replace(/\(Superset [AB]\d+\)/, '')
    .replace(/\(NEW\)/, '')
    .replace(/\(optional\)/, '')
    .replace(/\(Mechanical Dropset\)/, '')
    .trim();
}

// Parse RPE value (extract upper bound from ranges like "7-8")
function parseRPE(rpeStr) {
  if (!rpeStr || rpeStr === 'N/A') return null;
  rpeStr = rpeStr.replace('~', '').trim();
  const match = rpeStr.match(/(\d+)(?:-(\d+))?/);
  if (!match) return null;
  // Return upper bound if range, otherwise the single value
  return match[2] ? parseInt(match[2], 10) : parseInt(match[1], 10);
}

// Build notes field
function buildNotes(rest, technique, notes) {
  const parts = [];
  if (rest && rest !== 'N/A') parts.push(`Rest: ${rest}`);
  if (technique && technique !== 'None') parts.push(`Technique: ${technique}`);
  if (notes) parts.push(notes);
  return parts.join('. ');
}

// Generate CSV rows
const csvRows = [];
csvRows.push('week,day,workout_name,exercise,exercise_group,set,reps,weight,rpe,notes');

for (const row of week1Data) {
  const week = 1;
  const day = workoutToDayMap[row.workout];
  const workoutName = row.workout;
  const exercise = cleanExerciseName(row.exercise);
  const exerciseGroup = extractExerciseGroup(row.exercise);
  const workingSets = parseInt(row.workingSets, 10);
  const earlyRPE = parseRPE(row.earlyRPE);
  const lastRPE = parseRPE(row.lastRPE);
  const notes = buildNotes(row.rest, row.technique, row.notes);

  // Handle special cases for reps
  let repsPerSet = null;
  let cleanReps = row.reps;

  // Hack Squat with different reps per set (4/6/8)
  if (row.reps.includes('/')) {
    repsPerSet = row.reps.split('/');
  }
  // Mechanical dropset notation (5+4+3+) - use first number, details in notes
  else if (row.reps.includes('+')) {
    cleanReps = row.reps.split('+')[0]; // Use first rep count
  }

  // Generate rows for each working set
  for (let setNum = 1; setNum <= workingSets; setNum++) {
    const isLastSet = setNum === workingSets;
    const rpe = isLastSet ? lastRPE : earlyRPE;
    const reps = repsPerSet ? repsPerSet[setNum - 1] : cleanReps;

    const csvRow = [
      week,
      day,
      `"${workoutName}"`,
      `"${exercise}"`,
      exerciseGroup ? `"${exerciseGroup}"` : '',
      setNum,
      `"${reps}"`,
      '', // weight blank
      rpe || '',
      `"${notes}"`,
    ];

    csvRows.push(csvRow.join(','));
  }
}

// Output CSV
console.log(csvRows.join('\n'));
