#!/usr/bin/env node
/**
 * Weight Loss Strength v1 - Full 12-Week Generator
 *
 * This script generates the complete 12-week Upper/Lower split program
 * designed for fat loss while preserving muscle mass.
 *
 * Run with: node generate_weight_loss_strength.js > weight_loss_strength_v1_full.sql
 *
 * Program Structure:
 * - Weeks 1-4: Foundation Phase (moderate volume, building intensity)
 * - Weeks 5-8: Intensification Phase (reduced volume, higher intensity)
 * - Weeks 9-12: Peak Phase (lowest volume, highest intensity)
 * - Weeks 4, 8, 12: Deload weeks
 */

const EXERCISES = {
  // Upper exercises
  inclineDBPress: { id: 'ex_db_001', name: 'Incline Dumbbell Bench Press' },
  dbShoulderPress: { id: 'ex_db_006', name: 'Dumbbell Shoulder Press' },
  latPulldown: { id: 'ex_cm_005', name: 'Lat Pulldown' },
  cableLateralRaise: { id: 'ex_cm_011', name: 'Cable Lateral Raise' },
  cablePushdown: { id: 'ex_cm_018', name: 'Cable Tricep Pushdown' },
  cableCurl: { id: 'ex_cm_016', name: 'Cable Bicep Curl' },
  seatedCableRow: { id: 'ex_cm_009', name: 'Seated Cable Row' },
  bbBenchPress: { id: 'cmiz7vjju0000vr0m4b1o6bec', name: 'Barbell Bench Press' },
  facePull: { id: 'ex_cm_014', name: 'Cable Face Pull' },
  cableChestFly: { id: 'ex_cm_001', name: 'Cable Chest Fly' },
  inclineDBCurl: { id: 'ex_db_018', name: 'Incline Dumbbell Curl' },
  dbOverheadTri: { id: 'ex_db_023', name: 'Dumbbell Overhead Tricep Extension' },
  arnoldPress: { id: 'ex_db_007', name: 'Arnold Press' },
  pullUp: { id: 'cmiz7vkvr0008vr0m7rv3dapc', name: 'Pull-Up' },
  dbRow: { id: 'cmiz7vmgd000hvr0mkidkt6uu', name: 'Dumbbell Row' },
  cableReverseFly: { id: 'ex_cm_013', name: 'Cable Reverse Fly' },
  preacherCurl: { id: 'ex_db_020', name: 'Preacher Curl' },
  skullCrusher: { id: 'ex_db_027', name: 'Dumbbell Skull Crusher' },
  hammerCurl: { id: 'cmiz7vnpc000ovr0mcuhs0bum', name: 'Hammer Curl' },

  // Lower exercises
  legPress: { id: 'cmiz7vldb000bvr0mw4qzzagc', name: 'Leg Press' },
  rdl: { id: 'cmiz7vkdh0005vr0mr5dm18ls', name: 'Romanian Deadlift' },
  legExtension: { id: 'cmiz7vlqf000dvr0mm39bhj97', name: 'Leg Extension' },
  legCurl: { id: 'cmiz7vljh000cvr0mlk0r5kco', name: 'Leg Curl' },
  calfRaise: { id: 'cmiz7vnam000mvr0mano9z27r', name: 'Calf Raise' },
  cableCrunch: { id: 'ex_cm_025', name: 'Cable Crunch' },
  bbSquat: { id: 'cmiz7vjpo0001vr0msv9of7ib', name: 'Barbell Back Squat' },
  dbRDL: { id: 'ex_db_014', name: 'Dumbbell Romanian Deadlift' },
  bulgarianSplit: { id: 'ex_db_031', name: 'Dumbbell Bulgarian Split Squat' },
  hangingLegRaise: { id: 'ex_bw_027', name: 'Hanging Leg Raise' },
  hackSquat: { id: 'ex_cm_034', name: 'Hack Squat' },
  dbLunge: { id: 'ex_db_032', name: 'Dumbbell Lunge' },
};

function generateWeek(weekNum, phase) {
  const isDeload = weekNum === 4 || weekNum === 8 || weekNum === 12;
  const prefix = `wl-w${weekNum}`;

  // Adjust RPE and sets based on phase
  let baseRPE, setsMultiplier;
  if (isDeload) {
    baseRPE = 5;
    setsMultiplier = 0.6;
  } else if (phase === 'foundation') {
    baseRPE = 7;
    setsMultiplier = 1.0;
  } else if (phase === 'intensification') {
    baseRPE = 8;
    setsMultiplier = 0.9;
  } else {
    baseRPE = 9;
    setsMultiplier = 0.8;
  }

  const workouts = [];

  // Upper A - Push Focus
  workouts.push({
    id: `${prefix}-upper1`,
    name: isDeload ? 'Upper A - Deload' : 'Upper A - Push Focus',
    dayNumber: 1,
    exercises: generateUpperAPush(prefix, baseRPE, isDeload, phase)
  });

  // Lower A - Quad Focus
  workouts.push({
    id: `${prefix}-lower1`,
    name: isDeload ? 'Lower A - Deload' : 'Lower A - Quad Focus',
    dayNumber: 2,
    exercises: generateLowerAQuad(prefix, baseRPE, isDeload, phase)
  });

  // Upper B - Pull Focus
  workouts.push({
    id: `${prefix}-upper2`,
    name: isDeload ? 'Upper B - Deload' : 'Upper B - Pull Focus',
    dayNumber: 4,
    exercises: generateUpperBPull(prefix, baseRPE, isDeload, phase)
  });

  // Lower B - Posterior Focus
  workouts.push({
    id: `${prefix}-lower2`,
    name: isDeload ? 'Lower B - Deload' : 'Lower B - Posterior Focus',
    dayNumber: 5,
    exercises: generateLowerBPosterior(prefix, baseRPE, isDeload, phase)
  });

  return {
    id: `wl-week-${weekNum}`,
    weekNumber: weekNum,
    workouts
  };
}

function generateUpperAPush(prefix, baseRPE, isDeload, phase) {
  const exercises = [];
  let order = 1;

  // Primary press
  const pressExercise = phase === 'peak' ? EXERCISES.bbBenchPress : EXERCISES.inclineDBPress;
  exercises.push({
    id: `${prefix}-u1-ex${order}`,
    name: pressExercise.name,
    exerciseDefinitionId: pressExercise.id,
    order: order++,
    exerciseGroup: null,
    notes: isDeload ? 'Light weight, focus on form' : 'Control the negative. 2 sec down, explosive up.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '10', weight: null, rpe: baseRPE, rir: null, notes: 'Light' }]
      : [
          { setNumber: 1, reps: '8', weight: null, rpe: baseRPE, rir: null, notes: 'Warm-up' },
          { setNumber: 2, reps: '6', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
          { setNumber: 3, reps: '6', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
        ]
  });

  // Shoulder press
  exercises.push({
    id: `${prefix}-u1-ex${order}`,
    name: EXERCISES.dbShoulderPress.name,
    exerciseDefinitionId: EXERCISES.dbShoulderPress.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Slight rotation on negative, flare elbows on push.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '10', weight: null, rpe: baseRPE, rir: null, notes: 'Light' }]
      : [
          { setNumber: 1, reps: '8', weight: null, rpe: baseRPE, rir: null, notes: null },
          { setNumber: 2, reps: '8', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
          { setNumber: 3, reps: '8', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
        ]
  });

  // Pulldown (antagonist)
  exercises.push({
    id: `${prefix}-u1-ex${order}`,
    name: EXERCISES.latPulldown.name,
    exerciseDefinitionId: EXERCISES.latPulldown.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Full stretch at top, squeeze lats at bottom.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '12', weight: null, rpe: baseRPE, rir: null, notes: null }]
      : [
          { setNumber: 1, reps: '10', weight: null, rpe: baseRPE, rir: null, notes: null },
          { setNumber: 2, reps: '10', weight: null, rpe: baseRPE + 1, rir: null, notes: null }
        ]
  });

  // Lateral raise
  exercises.push({
    id: `${prefix}-u1-ex${order}`,
    name: EXERCISES.cableLateralRaise.name,
    exerciseDefinitionId: EXERCISES.cableLateralRaise.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Cross body, Y motion. Focus on side delt contraction.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '15', weight: null, rpe: baseRPE, rir: null, notes: null }]
      : [
          { setNumber: 1, reps: '12', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
          { setNumber: 2, reps: '12', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
        ]
  });

  // Arms - Triceps
  exercises.push({
    id: `${prefix}-u1-ex${order}`,
    name: EXERCISES.cablePushdown.name,
    exerciseDefinitionId: EXERCISES.cablePushdown.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Lock elbows at sides. Full extension.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '15', weight: null, rpe: baseRPE, rir: null, notes: null }]
      : [
          { setNumber: 1, reps: '12', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
          { setNumber: 2, reps: '12', weight: null, rpe: baseRPE + 2, rir: null, notes: null },
          { setNumber: 3, reps: '12', weight: null, rpe: 10, rir: null, notes: 'To failure' }
        ]
  });

  // Arms - Biceps
  exercises.push({
    id: `${prefix}-u1-ex${order}`,
    name: EXERCISES.cableCurl.name,
    exerciseDefinitionId: EXERCISES.cableCurl.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Full stretch at bottom. Squeeze at top.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '15', weight: null, rpe: baseRPE, rir: null, notes: null }]
      : [
          { setNumber: 1, reps: '12', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
          { setNumber: 2, reps: '12', weight: null, rpe: baseRPE + 2, rir: null, notes: null },
          { setNumber: 3, reps: '12', weight: null, rpe: 10, rir: null, notes: 'To failure' }
        ]
  });

  return exercises;
}

function generateLowerAQuad(prefix, baseRPE, isDeload, phase) {
  const exercises = [];
  let order = 1;

  // Primary quad movement
  const quadExercise = phase === 'peak' ? EXERCISES.hackSquat : EXERCISES.legPress;
  exercises.push({
    id: `${prefix}-l1-ex${order}`,
    name: quadExercise.name,
    exerciseDefinitionId: quadExercise.id,
    order: order++,
    exerciseGroup: null,
    notes: isDeload ? 'Light, focus on form' : 'Feet lower for quad emphasis. Full depth.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '12', weight: null, rpe: baseRPE, rir: null, notes: 'Light' }]
      : [
          { setNumber: 1, reps: '12', weight: null, rpe: 6, rir: null, notes: 'Warm-up' },
          { setNumber: 2, reps: '10', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
          { setNumber: 3, reps: '10', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
        ]
  });

  // RDL
  exercises.push({
    id: `${prefix}-l1-ex${order}`,
    name: EXERCISES.rdl.name,
    exerciseDefinitionId: EXERCISES.rdl.id,
    order: order++,
    exerciseGroup: null,
    notes: '1 sec pause at bottom. Stop 75% to lockout to keep tension.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '10', weight: null, rpe: baseRPE, rir: null, notes: null }]
      : [
          { setNumber: 1, reps: '8', weight: null, rpe: baseRPE, rir: null, notes: null },
          { setNumber: 2, reps: '8', weight: null, rpe: baseRPE + 1, rir: null, notes: null }
        ]
  });

  // Leg extension
  exercises.push({
    id: `${prefix}-l1-ex${order}`,
    name: EXERCISES.legExtension.name,
    exerciseDefinitionId: EXERCISES.legExtension.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Long-length partials. Seat back, 2-3 sec negative.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '15', weight: null, rpe: baseRPE, rir: null, notes: null }]
      : [
          { setNumber: 1, reps: '12', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
          { setNumber: 2, reps: '12', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
        ]
  });

  // Leg curl
  exercises.push({
    id: `${prefix}-l1-ex${order}`,
    name: EXERCISES.legCurl.name,
    exerciseDefinitionId: EXERCISES.legCurl.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Long-length partials. Lean forward for max stretch.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '15', weight: null, rpe: baseRPE, rir: null, notes: null }]
      : [
          { setNumber: 1, reps: '12', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
          { setNumber: 2, reps: '12', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
        ]
  });

  // Calves
  exercises.push({
    id: `${prefix}-l1-ex${order}`,
    name: EXERCISES.calfRaise.name,
    exerciseDefinitionId: EXERCISES.calfRaise.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Full stretch at bottom, pause at top.',
    prescribedSets: [
      { setNumber: 1, reps: '15', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
      { setNumber: 2, reps: '15', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
    ]
  });

  // Core
  exercises.push({
    id: `${prefix}-l1-ex${order}`,
    name: EXERCISES.cableCrunch.name,
    exerciseDefinitionId: EXERCISES.cableCrunch.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Mind-muscle connection. Curl spine, dont pull with arms.',
    prescribedSets: [
      { setNumber: 1, reps: '15', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
      { setNumber: 2, reps: '15', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
    ]
  });

  return exercises;
}

function generateUpperBPull(prefix, baseRPE, isDeload, phase) {
  const exercises = [];
  let order = 1;

  // Primary row
  const rowExercise = phase === 'peak' ? EXERCISES.dbRow : EXERCISES.seatedCableRow;
  exercises.push({
    id: `${prefix}-u2-ex${order}`,
    name: rowExercise.name,
    exerciseDefinitionId: rowExercise.id,
    order: order++,
    exerciseGroup: null,
    notes: isDeload ? 'Light, focus on contraction' : '45 degree elbow flare. Squeeze shoulder blades hard.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '12', weight: null, rpe: baseRPE, rir: null, notes: 'Light' }]
      : [
          { setNumber: 1, reps: '10', weight: null, rpe: baseRPE, rir: null, notes: null },
          { setNumber: 2, reps: '10', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
          { setNumber: 3, reps: '10', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
        ]
  });

  // Bench press
  exercises.push({
    id: `${prefix}-u2-ex${order}`,
    name: EXERCISES.bbBenchPress.name,
    exerciseDefinitionId: EXERCISES.bbBenchPress.id,
    order: order++,
    exerciseGroup: null,
    notes: '1 sec pause at chest. Drive through.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '8', weight: null, rpe: baseRPE, rir: null, notes: null }]
      : [
          { setNumber: 1, reps: '6', weight: null, rpe: baseRPE, rir: null, notes: null },
          { setNumber: 2, reps: '6', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
          { setNumber: 3, reps: '6', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
        ]
  });

  // Face pull
  exercises.push({
    id: `${prefix}-u2-ex${order}`,
    name: EXERCISES.facePull.name,
    exerciseDefinitionId: EXERCISES.facePull.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Pause at squeeze. Contract rear delts hard.',
    prescribedSets: [
      { setNumber: 1, reps: '15', weight: null, rpe: baseRPE, rir: null, notes: null },
      { setNumber: 2, reps: '15', weight: null, rpe: baseRPE + 1, rir: null, notes: null }
    ]
  });

  // Chest fly
  exercises.push({
    id: `${prefix}-u2-ex${order}`,
    name: EXERCISES.cableChestFly.name,
    exerciseDefinitionId: EXERCISES.cableChestFly.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Lean forward. Stretch and squeeze the pecs.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '15', weight: null, rpe: baseRPE, rir: null, notes: null }]
      : [
          { setNumber: 1, reps: '12', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
          { setNumber: 2, reps: '12', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
        ]
  });

  // Biceps - incline curl
  const curlExercise = phase === 'peak' ? EXERCISES.preacherCurl : EXERCISES.inclineDBCurl;
  exercises.push({
    id: `${prefix}-u2-ex${order}`,
    name: curlExercise.name,
    exerciseDefinitionId: curlExercise.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Start with weak arm. Full stretch at bottom.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '12', weight: null, rpe: baseRPE, rir: null, notes: null }]
      : [
          { setNumber: 1, reps: '10', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
          { setNumber: 2, reps: '10', weight: null, rpe: baseRPE + 2, rir: null, notes: null },
          { setNumber: 3, reps: '10', weight: null, rpe: 10, rir: null, notes: 'To failure' }
        ]
  });

  // Triceps - overhead
  const triExercise = phase === 'peak' ? EXERCISES.skullCrusher : EXERCISES.dbOverheadTri;
  exercises.push({
    id: `${prefix}-u2-ex${order}`,
    name: triExercise.name,
    exerciseDefinitionId: triExercise.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Full stretch at bottom. Elbows stay tucked.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '12', weight: null, rpe: baseRPE, rir: null, notes: null }]
      : [
          { setNumber: 1, reps: '10', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
          { setNumber: 2, reps: '10', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
        ]
  });

  return exercises;
}

function generateLowerBPosterior(prefix, baseRPE, isDeload, phase) {
  const exercises = [];
  let order = 1;

  // Primary squat
  exercises.push({
    id: `${prefix}-l2-ex${order}`,
    name: EXERCISES.bbSquat.name,
    exerciseDefinitionId: EXERCISES.bbSquat.id,
    order: order++,
    exerciseGroup: null,
    notes: isDeload ? 'Light, work on depth' : 'Full depth. Brace hard.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '10', weight: null, rpe: baseRPE, rir: null, notes: 'Light' }]
      : [
          { setNumber: 1, reps: '8', weight: null, rpe: 6, rir: null, notes: 'Warm-up' },
          { setNumber: 2, reps: '6', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
          { setNumber: 3, reps: '6', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
        ]
  });

  // DB RDL
  exercises.push({
    id: `${prefix}-l2-ex${order}`,
    name: EXERCISES.dbRDL.name,
    exerciseDefinitionId: EXERCISES.dbRDL.id,
    order: order++,
    exerciseGroup: null,
    notes: '1 sec pause at stretch. Protect lower back.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '12', weight: null, rpe: baseRPE, rir: null, notes: null }]
      : [
          { setNumber: 1, reps: '10', weight: null, rpe: baseRPE, rir: null, notes: null },
          { setNumber: 2, reps: '10', weight: null, rpe: baseRPE + 1, rir: null, notes: null }
        ]
  });

  // Single leg work
  const singleLegExercise = phase === 'peak' ? EXERCISES.dbLunge : EXERCISES.bulgarianSplit;
  exercises.push({
    id: `${prefix}-l2-ex${order}`,
    name: singleLegExercise.name,
    exerciseDefinitionId: singleLegExercise.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Lean slightly forward for glute emphasis.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '10', weight: null, rpe: baseRPE, rir: null, notes: 'Each leg' }]
      : [
          { setNumber: 1, reps: '10', weight: null, rpe: baseRPE + 1, rir: null, notes: 'Each leg' },
          { setNumber: 2, reps: '10', weight: null, rpe: baseRPE + 2, rir: null, notes: 'Each leg' }
        ]
  });

  // Leg curl
  exercises.push({
    id: `${prefix}-l2-ex${order}`,
    name: EXERCISES.legCurl.name,
    exerciseDefinitionId: EXERCISES.legCurl.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Long-length partials.',
    prescribedSets: isDeload
      ? [{ setNumber: 1, reps: '15', weight: null, rpe: baseRPE, rir: null, notes: null }]
      : [
          { setNumber: 1, reps: '12', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
          { setNumber: 2, reps: '12', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
        ]
  });

  // Calves
  exercises.push({
    id: `${prefix}-l2-ex${order}`,
    name: EXERCISES.calfRaise.name,
    exerciseDefinitionId: EXERCISES.calfRaise.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Slow negative. Pause at stretch.',
    prescribedSets: [
      { setNumber: 1, reps: '15', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
      { setNumber: 2, reps: '15', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
    ]
  });

  // Core
  exercises.push({
    id: `${prefix}-l2-ex${order}`,
    name: EXERCISES.hangingLegRaise.name,
    exerciseDefinitionId: EXERCISES.hangingLegRaise.id,
    order: order++,
    exerciseGroup: null,
    notes: 'Control the movement. No swinging.',
    prescribedSets: [
      { setNumber: 1, reps: '12', weight: null, rpe: baseRPE + 1, rir: null, notes: null },
      { setNumber: 2, reps: '12', weight: null, rpe: baseRPE + 2, rir: null, notes: null }
    ]
  });

  return exercises;
}

function generateProgram() {
  const weeks = [];

  for (let w = 1; w <= 12; w++) {
    let phase;
    if (w <= 4) phase = 'foundation';
    else if (w <= 8) phase = 'intensification';
    else phase = 'peak';

    weeks.push(generateWeek(w, phase));
  }

  return {
    id: 'orig-weight-loss-strength-v1',
    name: 'Weight Loss Strength v1',
    description: '12-week cutting program - Upper/Lower split with arms emphasis',
    programType: 'strength',
    weeks
  };
}

// Count exercises
function countExercises(program) {
  let count = 0;
  for (const week of program.weeks) {
    for (const workout of week.workouts) {
      count += workout.exercises.length;
    }
  }
  return count;
}

function countWorkouts(program) {
  let count = 0;
  for (const week of program.weeks) {
    count += week.workouts.length;
  }
  return count;
}

// Generate SQL
const program = generateProgram();
const programJSON = JSON.stringify(program, null, 2).replace(/'/g, "''");

console.log(`-- Weight Loss Strength v1 - Full 12 Week Program (Generated)
-- Run with: doppler run --config dev_personal -- bash -c 'psql $DATABASE_URL -f prisma/seeds/programs/weight_loss_strength_v1_full.sql'

INSERT INTO "CommunityProgram" (
  id,
  name,
  description,
  "programType",
  "authorUserId",
  "displayName",
  "publishedAt",
  "originalProgramId",
  "programData",
  "weekCount",
  "workoutCount",
  "exerciseCount"
) VALUES
(
  'weight-loss-strength-v1',
  'Weight Loss Strength v1',
  'A 12-week upper/lower split designed for fat loss while preserving muscle mass. Features reduced volume with maintained intensity, arms emphasis, and strategic deload weeks (4, 8, 12). Based on current research showing that maintaining training intensity while moderately reducing volume (80-90%) is optimal for muscle retention during a caloric deficit.',
  'strength',
  'cb8e9963-4f9b-4490-9983-e914646b23b',
  'Ripit Fitness',
  NOW(),
  'orig-weight-loss-strength-v1',
  '${programJSON}',
  ${program.weeks.length},
  ${countWorkouts(program)},
  ${countExercises(program)}
)
ON CONFLICT (id) DO UPDATE SET
  "programData" = EXCLUDED."programData",
  "weekCount" = EXCLUDED."weekCount",
  "workoutCount" = EXCLUDED."workoutCount",
  "exerciseCount" = EXCLUDED."exerciseCount";
`);
