import { PrismaClient } from '@prisma/client';
import {
  COMMON_EQUIPMENT,
  SPECIALIZED_EQUIPMENT,
} from '@/lib/constants/program-metadata';

const EQUIPMENT_NORMALIZATION_MAP: Record<string, string> = {
  dumbbells: 'dumbbell',
  'pull-up-bar': 'pull_up_bar',
  'pull-up bar': 'pull_up_bar',
  'dip-bars': 'dip_bars',
  'dip bars': 'dip_bars',
  'resistance-band': 'resistance_band',
  'resistance band': 'resistance_band',
  'smith-machine': 'smith_machine',
  'smith machine': 'smith_machine',
  'ez-bar': 'ez_bar',
  'ez bar': 'ez_bar',
  'ab-wheel': 'ab_wheel',
  'ab wheel': 'ab_wheel',
  'preacher-bench': 'preacher_bench',
  'preacher bench': 'preacher_bench',
  'parallel-bars': 'parallel_bars',
  'parallel bars': 'parallel_bars',
  'roman-chair': 'roman_chair',
  'roman chair': 'roman_chair',
  'campus-board': 'campus_board',
  'campus board': 'campus_board',
  'system-board': 'system_board',
  'system board': 'system_board',
};

function normalizeEquipment(equipment: string): string {
  const lower = equipment.toLowerCase().trim();
  return EQUIPMENT_NORMALIZATION_MAP[lower] || lower.replace(/[\s-]/g, '_');
}

export async function detectEquipmentNeeded(
  prisma: PrismaClient,
  programId: string,
  programType: 'strength' | 'cardio'
): Promise<string[]> {
  const equipmentSet = new Set<string>();

  if (programType === 'strength') {
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        weeks: {
          include: {
            workouts: {
              include: {
                exercises: {
                  include: {
                    exerciseDefinition: {
                      select: { equipment: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    program?.weeks.forEach((week) => {
      week.workouts.forEach((workout) => {
        workout.exercises.forEach((exercise) => {
          exercise.exerciseDefinition.equipment.forEach((eq) => {
            const normalized = normalizeEquipment(eq);
            const allEquipment = [
              ...Object.values(COMMON_EQUIPMENT),
              ...Object.values(SPECIALIZED_EQUIPMENT),
            ];
            if (allEquipment.includes(normalized)) {
              equipmentSet.add(normalized);
            }
          });
        });
      });
    });
  } else if (programType === 'cardio') {
    const cardioProgram = await prisma.cardioProgram.findUnique({
      where: { id: programId },
      include: {
        weeks: {
          include: {
            sessions: {
              select: { equipment: true },
            },
          },
        },
      },
    });

    cardioProgram?.weeks.forEach((week) => {
      week.sessions.forEach((session) => {
        if (session.equipment) {
          const normalized = normalizeEquipment(session.equipment);
          const allEquipment = [
            ...Object.values(COMMON_EQUIPMENT),
            ...Object.values(SPECIALIZED_EQUIPMENT),
          ];
          if (allEquipment.includes(normalized)) {
            equipmentSet.add(normalized);
          }
        }
      });
    });
  }

  return Array.from(equipmentSet).sort();
}
