import type { PrismaClient } from '@prisma/client'

/**
 * Exercise definitions needed by curated workouts that don't exist
 * in the current seed. Names match the free exercise DB
 * (github.com/yuhonas/free-exercise-db) except Chest Supported Row (custom).
 */
const CURATED_EXERCISES = [
  // Machine Room
  { name: 'Chest Press', category: 'chest', aliases: ['leverage chest press', 'chest press machine', 'machine chest press'] },
  { name: 'Shoulder Press', category: 'shoulders', aliases: ['machine shoulder (military) press', 'leverage shoulder press', 'shoulder press machine', 'machine shoulder press'] },
  { name: 'Lat Pulldown', category: 'back', aliases: ['wide-grip lat pulldown', 'lat pull-down', 'wide grip pulldown'] },
  { name: 'Leg Extensions', category: 'legs', aliases: ['leg extension', 'quad extension'] },
  { name: 'Seated Leg Curl', category: 'legs', aliases: ['seated hamstring curl', 'machine leg curl'] },
  { name: 'Back Extension', category: 'back', aliases: ['hyperextensions (back extensions)', 'hyperextension', 'back extensions'] },
  { name: 'Chest Supported Row', category: 'back', aliases: ['chest supported row machine', 'machine row'] },
  { name: 'Dip Machine', category: 'chest', aliases: ['machine dip', 'assisted dip'] },
  { name: 'Thigh Adductor', category: 'legs', aliases: ['adductor', 'hip adductor', 'leg adductor'] },
  { name: 'Thigh Abductor', category: 'legs', aliases: ['abductor', 'hip abductor', 'leg abductor'] },
  { name: 'Ab Crunch Machine', category: 'core', aliases: ['ab curl machine', 'crunch machine'] },
  { name: 'Machine Preacher Curls', category: 'arms', aliases: ['preacher curl machine', 'machine preacher curl'] },

  // Cable
  { name: 'Standing Biceps Cable Curl', category: 'arms', aliases: ['cable bicep curl', 'cable curl'] },
  { name: 'Triceps Pushdown', category: 'arms', aliases: ['triceps pushdown - rope attachment', 'cable tricep pushdown', 'rope pushdown', 'tricep pushdown'] },
  { name: 'One-Arm Side Laterals', category: 'shoulders', aliases: ['cable lateral raise', 'single arm cable lateral'] },
  { name: 'Cable Crossover', category: 'chest', aliases: ['cable fly', 'cable chest fly'] },
  { name: 'Standing Cable Wood Chop', category: 'core', aliases: ['cable woodchop', 'wood chop'] },
  { name: 'Cable Chest Press', category: 'chest', aliases: ['cable press', 'standing cable press'] },
  { name: 'Pull Through', category: 'legs', aliases: ['cable pull-through', 'cable pull through'] },
  { name: 'Seated Cable Rows', category: 'back', aliases: ['cable row', 'seated row'] },

  // Freeweight
  { name: 'Goblet Squat', category: 'legs', aliases: ['dumbbell goblet squat', 'db goblet squat'] },
  { name: "Farmer's Walk", category: 'legs', aliases: ['farmers carry', 'farmer walk', 'db farmers carry'] },
  { name: 'Dumbbell Step Ups', category: 'legs', aliases: ['step-ups', 'step ups', 'db step ups'] },
  { name: 'Barbell Squat', category: 'legs', aliases: ['back squat', 'barbell back squat', 'squat'] },
  { name: 'Standing Dumbbell Press', category: 'shoulders', aliases: ['db overhead press', 'dumbbell overhead press'] },
  { name: 'Side Lateral Raise', category: 'shoulders', aliases: ['dumbbell lateral raise', 'lateral raise'] },
  { name: 'One-Arm Dumbbell Row', category: 'back', aliases: ['dumbbell row', 'db row', 'single arm row'] },
  { name: 'Bench Press', category: 'chest', aliases: ['barbell bench press - medium grip', 'barbell bench press', 'flat bench', 'bb bench press'] },
  { name: 'Bent Over Barbell Row', category: 'back', aliases: ['barbell row', 'bent over row', 'pendlay row'] },
  { name: 'Trap Bar Deadlift', category: 'legs', aliases: ['hex bar deadlift', 'trap bar dl'] },
  { name: 'Lying Triceps Press', category: 'arms', aliases: ['skull crushers', 'skull crusher', 'ez bar skull crusher'] },
  { name: 'Smith Machine Incline Bench Press', category: 'chest', aliases: ['smith incline press', 'smith machine incline'] },
  { name: 'Smith Machine Calf Raise', category: 'legs', aliases: ['smith calf raise', 'machine calf raise'] },

  // Additional cable
  { name: 'Lat Pull-Around', category: 'back', aliases: ['lat pull around', 'pull around', 'one arm lat pullaround'] },
  { name: 'Cable Crunch', category: 'core', aliases: ['cable ab crunch', 'kneeling cable crunch', 'rope crunch'] },

  // Additional legs
  { name: 'Dumbbell Bulgarian Split Squat', category: 'legs', aliases: ['db bulgarian split squat', 'bulgarian split squat', 'rear foot elevated split squat'] },
  { name: 'Standing Calf Raise', category: 'legs', aliases: ['calf raise standing', 'standing calf', 'dumbbell calf raise'] },

  // Freeweight - common compounds
  { name: 'Dumbbell Bench Press', category: 'chest', aliases: ['db bench press', 'dumbbell flat bench'] },
  { name: 'Dumbbell Shoulder Press', category: 'shoulders', aliases: ['db shoulder press', 'seated dumbbell press'] },
  { name: 'Incline Dumbbell Press', category: 'chest', aliases: ['incline db press', 'incline dumbbell bench press'] },
  { name: 'Face Pull', category: 'shoulders', aliases: ['cable face pull', 'face pulls', 'rear delt pull'] },
  { name: 'Romanian Deadlift', category: 'legs', aliases: ['rdl', 'romanian dl', 'stiff leg deadlift'] },
  { name: 'Barbell Curl', category: 'arms', aliases: ['barbell bicep curl', 'bb curl', 'standing barbell curl'] },
  { name: 'Leg Press', category: 'legs', aliases: ['machine leg press', 'seated leg press', '45 degree leg press'] },

  // Home / bodyweight
  { name: 'Plank', category: 'core', aliases: ['front plank', 'forearm plank'] },
  { name: 'Band Pull Apart', category: 'shoulders', aliases: ['resistance band pull apart', 'band pull-apart'] },
  { name: 'Pushups', category: 'chest', aliases: ['push-ups', 'push ups', 'pushup'] },
  { name: 'Bodyweight Squat', category: 'legs', aliases: ['bodyweight squats', 'air squat', 'bw squat'] },
  { name: 'Dumbbell Lunges', category: 'legs', aliases: ['lunges', 'db lunges', 'walking lunges'] },
  { name: 'Barbell Glute Bridge', category: 'legs', aliases: ['glute bridge', 'hip bridge', 'glute bridges'] },
  { name: 'Dumbbell Floor Press', category: 'chest', aliases: ['db floor press', 'floor press'] },
  { name: 'Pull-Ups', category: 'back', aliases: ['pull ups', 'pullups', 'pullup', 'chin up'] },
  { name: 'Pike Pushups', category: 'shoulders', aliases: ['pike push-ups', 'pike push ups', 'pike pushup'] },
  { name: 'Inverted Row', category: 'back', aliases: ['inverted rows', 'bodyweight row', 'australian pull-up'] },
  { name: 'Bodyweight Lunges', category: 'legs', aliases: ['bw lunges', 'walking lunges bodyweight', 'bodyweight lunge'] },
  { name: 'Glute Bridge', category: 'legs', aliases: ['bodyweight glute bridge', 'bw glute bridge', 'hip bridge bodyweight'] },
  { name: 'Bodyweight Step-Ups', category: 'legs', aliases: ['step ups', 'bw step ups', 'step-ups bodyweight'] },
  { name: 'Bodyweight Bulgarian Split Squat', category: 'legs', aliases: ['bw bulgarian split squat', 'bodyweight rear foot elevated split squat'] },

  // Glute-focused
  { name: 'Hip Thrust', category: 'legs', aliases: ['barbell hip thrust', 'hip thrusts', 'bb hip thrust'] },
  { name: 'Cable Kickback', category: 'legs', aliases: ['cable glute kickback', 'glute kickback', 'cable kickbacks'] },

  // Assisted movements
  { name: 'Assisted Pull-up', category: 'back', aliases: ['assisted pull-ups', 'machine assisted pull-up', 'gravitron pull-up'] },
  { name: 'Assisted Dip', category: 'chest', aliases: ['assisted dips', 'machine assisted dip', 'gravitron dip'] },

  // Additional machines
  { name: 'Leg Press Calf Press', category: 'legs', aliases: ['leg press calf raise', 'calf press on leg press', 'calf raise leg press'] },
  { name: 'Cable Lateral Raise', category: 'shoulders', aliases: ['cable lateral raises', 'single arm cable lateral raise'] },

  // Modern bodybuilding
  { name: 'Cable Upright Row', category: 'shoulders', aliases: ['cable upright rows', 'upright row cable'] },
  { name: 'Smith Machine Squat', category: 'legs', aliases: ['smith squat', 'smith machine squat feet forward'] },
  { name: 'Hammer Curl', category: 'arms', aliases: ['hammer curls', 'dumbbell hammer curl', 'db hammer curl'] },
  { name: 'Dumbbell Overhead Triceps Extension', category: 'arms', aliases: ['overhead tricep extension', 'db overhead triceps extension', 'seated overhead extension'] },
  { name: 'Roman Chair Leg Lift', category: 'core', aliases: ['roman chair leg raise', 'captains chair leg raise', 'hanging leg lift'] },
  { name: 'Dumbbell Reverse Wrist Curl', category: 'arms', aliases: ['reverse wrist curl', 'wrist extension', 'forearm extension'] },
]

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

export async function seedCuratedExerciseDefinitions(prisma: PrismaClient) {
  console.log('Seeding curated exercise definitions...')

  let created = 0
  let skipped = 0

  for (const ex of CURATED_EXERCISES) {
    const normalized = ex.name.toLowerCase()
    const existing = await prisma.exerciseDefinition.findFirst({
      where: { normalizedName: normalized },
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.exerciseDefinition.create({
      data: {
        name: ex.name,
        normalizedName: normalized,
        aliases: ex.aliases,
        category: ex.category,
        isSystem: true,
        createdBy: null,
        userId: SYSTEM_USER_ID,
      },
    })
    created++
  }

  console.log(`  Created ${created}, skipped ${skipped} (already exist)`)
}
