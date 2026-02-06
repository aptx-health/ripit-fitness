import { PrismaClient } from '@prisma/client';
import { FAU_DISPLAY_NAMES } from '@/lib/fau-volume';
import { EQUIPMENT_LABELS } from '@/lib/constants/program-metadata';

export interface CreateExerciseDefinitionInput {
  name: string;
  equipment: string[];
  primaryFAUs: string[];
  secondaryFAUs?: string[];
  category?: string;
  aliases?: string[];
  instructions?: string;
  notes?: string;
}

export interface UpdateExerciseDefinitionInput {
  name?: string;
  equipment?: string[];
  primaryFAUs?: string[];
  secondaryFAUs?: string[];
  category?: string;
  aliases?: string[];
  instructions?: string;
  notes?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

const VALID_FAUS = Object.keys(FAU_DISPLAY_NAMES);
const VALID_EQUIPMENT = Object.keys(EQUIPMENT_LABELS);

const MAX_NAME_LENGTH = 100;
const MAX_ALIAS_LENGTH = 50;
const MAX_ALIASES = 10;
const MAX_INSTRUCTIONS_LENGTH = 400;
const MAX_NOTES_LENGTH = 400;

export function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ');
}

export function validateExerciseDefinition(
  input: CreateExerciseDefinitionInput | UpdateExerciseDefinitionInput,
  isUpdate = false
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Name validation (required for create)
  if (!isUpdate || input.name !== undefined) {
    const name = input.name;
    if (!name || name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name is required' });
    } else if (name.trim().length > MAX_NAME_LENGTH) {
      errors.push({
        field: 'name',
        message: `Name must be ${MAX_NAME_LENGTH} characters or less`,
      });
    }
  }

  // Equipment validation (required for create)
  if (!isUpdate || input.equipment !== undefined) {
    const equipment = input.equipment;
    if (!equipment || equipment.length === 0) {
      errors.push({
        field: 'equipment',
        message: 'At least one equipment type is required',
      });
    } else {
      const invalidEquipment = equipment.filter(
        (eq) => !VALID_EQUIPMENT.includes(eq)
      );
      if (invalidEquipment.length > 0) {
        errors.push({
          field: 'equipment',
          message: `Invalid equipment types: ${invalidEquipment.join(', ')}`,
        });
      }
    }
  }

  // Primary FAUs validation (required for create)
  if (!isUpdate || input.primaryFAUs !== undefined) {
    const primaryFAUs = input.primaryFAUs;
    if (!primaryFAUs || primaryFAUs.length === 0) {
      errors.push({
        field: 'primaryFAUs',
        message: 'At least one primary muscle group is required',
      });
    } else {
      const invalidFAUs = primaryFAUs.filter((fau) => !VALID_FAUS.includes(fau));
      if (invalidFAUs.length > 0) {
        errors.push({
          field: 'primaryFAUs',
          message: `Invalid muscle groups: ${invalidFAUs.join(', ')}`,
        });
      }
    }
  }

  // Secondary FAUs validation (optional)
  if (input.secondaryFAUs && input.secondaryFAUs.length > 0) {
    const invalidFAUs = input.secondaryFAUs.filter(
      (fau) => !VALID_FAUS.includes(fau)
    );
    if (invalidFAUs.length > 0) {
      errors.push({
        field: 'secondaryFAUs',
        message: `Invalid muscle groups: ${invalidFAUs.join(', ')}`,
      });
    }
  }

  // Aliases validation (optional)
  if (input.aliases) {
    if (input.aliases.length > MAX_ALIASES) {
      errors.push({
        field: 'aliases',
        message: `Maximum ${MAX_ALIASES} aliases allowed`,
      });
    }
    const tooLongAliases = input.aliases.filter(
      (alias) => alias.length > MAX_ALIAS_LENGTH
    );
    if (tooLongAliases.length > 0) {
      errors.push({
        field: 'aliases',
        message: `Aliases must be ${MAX_ALIAS_LENGTH} characters or less`,
      });
    }
  }

  // Instructions validation (optional)
  if (input.instructions && input.instructions.length > MAX_INSTRUCTIONS_LENGTH) {
    errors.push({
      field: 'instructions',
      message: `Instructions must be ${MAX_INSTRUCTIONS_LENGTH} characters or less`,
    });
  }

  // Notes validation (optional)
  if (input.notes && input.notes.length > MAX_NOTES_LENGTH) {
    errors.push({
      field: 'notes',
      message: `Notes must be ${MAX_NOTES_LENGTH} characters or less`,
    });
  }

  return errors;
}

export async function checkDuplicateExercise(
  prisma: PrismaClient,
  name: string,
  userId: string,
  excludeId?: string
): Promise<{ exists: boolean; exerciseId?: string }> {
  const normalizedName = normalizeExerciseName(name);

  const existing = await prisma.exerciseDefinition.findFirst({
    where: {
      normalizedName,
      OR: [{ isSystem: true }, { userId }],
      ...(excludeId && { NOT: { id: excludeId } }),
    },
    select: { id: true },
  });

  if (existing) {
    return { exists: true, exerciseId: existing.id };
  }

  return { exists: false };
}
