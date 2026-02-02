export const PROGRAM_GOALS = {
  STRENGTH: 'strength',
  POWERLIFTING: 'powerlifting',
  MUSCLE_GAIN: 'muscle_gain',
  FAT_LOSS: 'fat_loss',
  ENDURANCE: 'endurance',
  ATHLETIC_PERFORMANCE: 'athletic_performance',
  GENERAL_FITNESS: 'general_fitness',
  INJURY_RECOVERY: 'injury_recovery',
} as const;

export const GOAL_LABELS: Record<string, string> = {
  strength: 'Strength',
  powerlifting: 'Powerlifting',
  muscle_gain: 'Muscle Gain',
  fat_loss: 'Fat Loss',
  endurance: 'Endurance',
  athletic_performance: 'Athletic Performance',
  general_fitness: 'General Fitness',
  injury_recovery: 'Injury Recovery',
};

export const FITNESS_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const LEVEL_DESCRIPTIONS: Record<string, string> = {
  beginner: 'Little to no training experience',
  intermediate: '1-3 years of consistent training',
  advanced: '3+ years of consistent training',
};

export const FOCUS_AREAS = {
  UPPER_BODY: 'upper_body',
  LOWER_BODY: 'lower_body',
  FULL_BODY: 'full_body',
  PUSH: 'push',
  PULL: 'pull',
  LEGS: 'legs',
  CORE: 'core',
  CARDIO: 'cardio',
} as const;

export const FOCUS_AREA_LABELS: Record<string, string> = {
  upper_body: 'Upper Body',
  lower_body: 'Lower Body',
  full_body: 'Full Body',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  core: 'Core',
  cardio: 'Cardio',
};

export const COMMON_EQUIPMENT = {
  BARBELL: 'barbell',
  DUMBBELL: 'dumbbell',
  KETTLEBELL: 'kettlebell',
  CABLE: 'cable',
  MACHINE: 'machine',
  BODYWEIGHT: 'bodyweight',
  BENCH: 'bench',
  PULL_UP_BAR: 'pull_up_bar',
  SMITH_MACHINE: 'smith_machine',
} as const;

export const SPECIALIZED_EQUIPMENT = {
  RESISTANCE_BAND: 'resistance_band',
  EZ_BAR: 'ez_bar',
  DIP_BARS: 'dip_bars',
  INCLINE_BENCH: 'incline_bench',
  DECLINE_BENCH: 'decline_bench',
  PREACHER_BENCH: 'preacher_bench',
  AB_WHEEL: 'ab_wheel',
  FOAM_ROLLER: 'foam_roller',
  WEIGHT_BELT: 'weight_belt',
  PARALLEL_BARS: 'parallel_bars',
  ROMAN_CHAIR: 'roman_chair',
  HANGBOARD: 'hangboard',
  CAMPUS_BOARD: 'campus_board',
  SYSTEM_BOARD: 'system_board',
  CLIMBING_WALL: 'climbing_wall',
} as const;

export const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell',
  cable: 'Cable',
  machine: 'Machine',
  bodyweight: 'Bodyweight',
  bench: 'Bench',
  pull_up_bar: 'Pull-Up Bar',
  smith_machine: 'Smith Machine',
  resistance_band: 'Resistance Band',
  ez_bar: 'EZ Bar',
  dip_bars: 'Dip Bars',
  incline_bench: 'Incline Bench',
  decline_bench: 'Decline Bench',
  preacher_bench: 'Preacher Bench',
  ab_wheel: 'Ab Wheel',
  foam_roller: 'Foam Roller',
  weight_belt: 'Weight Belt',
  parallel_bars: 'Parallel Bars',
  roman_chair: 'Roman Chair',
  hangboard: 'Hangboard',
  campus_board: 'Campus Board',
  system_board: 'System Board',
  climbing_wall: 'Climbing Wall',
};

export type ProgramGoal = (typeof PROGRAM_GOALS)[keyof typeof PROGRAM_GOALS];
export type FitnessLevel = (typeof FITNESS_LEVELS)[keyof typeof FITNESS_LEVELS];
export type FocusArea = (typeof FOCUS_AREAS)[keyof typeof FOCUS_AREAS];
export type CommonEquipment =
  (typeof COMMON_EQUIPMENT)[keyof typeof COMMON_EQUIPMENT];
export type SpecializedEquipment =
  (typeof SPECIALIZED_EQUIPMENT)[keyof typeof SPECIALIZED_EQUIPMENT];
export type Equipment = CommonEquipment | SpecializedEquipment;

export interface ProgramMetadata {
  goals: string[];
  level: string | null;
  durationWeeks: number | null;
  durationDisplay: string | null;
  targetDaysPerWeek: number | null;
  equipmentNeeded: string[];
}
