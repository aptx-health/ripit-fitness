import type { ExerciseDefinition, Prisma, PrismaClient } from '@prisma/client'
import {
  type CreateExerciseDefinitionInput,
  checkDuplicateExercise,
  normalizeExerciseName,
  type UpdateExerciseDefinitionInput,
  validateExerciseDefinition,
} from '@/lib/validators/exercise-definition'

/** Fields an agent may set on an exercise definition. */
export const EDITABLE_FIELDS = [
  'name',
  'equipment',
  'primaryFAUs',
  'secondaryFAUs',
  'category',
  'aliases',
  'instructions',
  'notes',
  'imageUrls',
] as const

export type EditableField = (typeof EDITABLE_FIELDS)[number]

export type CheckResult =
  | { ok: true }
  | { ok: false; code: 'invalid' | 'not_found'; error: string; field?: string; existingId?: string }

/** Definitions a user can see: system ones and their own. */
export function visibleTo(userId: string): Prisma.ExerciseDefinitionWhereInput {
  return { OR: [{ isSystem: true }, { userId }] }
}

export function pickEditable(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of EDITABLE_FIELDS) {
    if (input[key] !== undefined) out[key] = input[key]
  }
  return out
}

/** Validator rules plus the duplicate check, shared by propose and approve. */
export async function checkCreate(
  prisma: PrismaClient | Prisma.TransactionClient,
  input: CreateExerciseDefinitionInput,
  userId: string
): Promise<CheckResult> {
  const errors = validateExerciseDefinition(input, false)
  if (errors.length > 0) {
    return { ok: false, code: 'invalid', error: errors[0].message, field: errors[0].field }
  }
  const dup = await checkDuplicateExercise(prisma as PrismaClient, input.name, userId)
  if (dup.exists) {
    return {
      ok: false,
      code: 'invalid',
      error: `an exercise named "${input.name}" already exists`,
      field: 'name',
      existingId: dup.exerciseId,
    }
  }
  return { ok: true }
}

export async function checkUpdate(
  prisma: PrismaClient | Prisma.TransactionClient,
  id: string,
  changes: UpdateExerciseDefinitionInput,
  userId: string
): Promise<CheckResult> {
  if (Object.keys(changes).length === 0) {
    return { ok: false, code: 'invalid', error: 'no changes proposed', field: 'changes' }
  }
  const errors = validateExerciseDefinition(changes, true)
  if (errors.length > 0) {
    return { ok: false, code: 'invalid', error: errors[0].message, field: errors[0].field }
  }
  if (changes.name !== undefined) {
    const dup = await checkDuplicateExercise(prisma as PrismaClient, changes.name, userId, id)
    if (dup.exists) {
      return {
        ok: false,
        code: 'invalid',
        error: `an exercise named "${changes.name}" already exists`,
        field: 'name',
        existingId: dup.exerciseId,
      }
    }
  }
  return { ok: true }
}

export function createData(input: CreateExerciseDefinitionInput, userId: string) {
  return {
    name: input.name,
    normalizedName: normalizeExerciseName(input.name),
    equipment: input.equipment,
    primaryFAUs: input.primaryFAUs,
    secondaryFAUs: input.secondaryFAUs ?? [],
    category: input.category,
    aliases: input.aliases ?? [],
    instructions: input.instructions,
    notes: input.notes,
    imageUrls: input.imageUrls ?? [],
    isBodyweight: input.equipment.includes('bodyweight'),
    isSystem: false,
    createdBy: userId,
    userId,
  }
}

/** Prisma update data for a set of changes (keeps normalizedName in sync). */
export function updateData(changes: Record<string, unknown>): Record<string, unknown> {
  const data = pickEditable(changes)
  if (typeof data.name === 'string') data.normalizedName = normalizeExerciseName(data.name)
  return data
}

/** JSON-safe snapshot of a definition (dates as ISO strings). */
export function snapshot(def: ExerciseDefinition): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(def)) as Prisma.InputJsonObject
}
