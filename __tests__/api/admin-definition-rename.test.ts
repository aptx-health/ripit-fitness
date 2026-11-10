/**
 * Work 157: renaming a definition from the admin editor renames every
 * Exercise row (any user) still carrying the old name, in the same
 * transaction. Rows renamed on purpose keep their name.
 */

import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { updateExerciseDefinition } from '@/lib/exercises/update-definition'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition } from '@/lib/test/factories'
import { normalizeExerciseName } from '@/lib/validators/exercise-definition'

let prisma: PrismaClient

beforeEach(async () => {
  const testDb = await getTestDatabase()
  prisma = testDb.getPrismaClient()
  await testDb.reset()
})

async function exerciseRow(userId: string, exerciseDefinitionId: string, name: string, workoutCompletionId?: string) {
  return prisma.exercise.create({
    data: { userId, exerciseDefinitionId, name, order: 1, workoutCompletionId },
    select: { id: true },
  })
}

const nameOf = async (id: string) => (await prisma.exercise.findUniqueOrThrow({ where: { id } })).name

async function setup() {
  const def = await createTestExerciseDefinition(prisma, { name: 'Barbell Squat', isSystem: true })
  const other = await createTestExerciseDefinition(prisma, { name: 'Front Squat', isSystem: true })
  return { def, other }
}

const rename = (id: string, oldName: string, name: string) =>
  updateExerciseDefinition(prisma, { id, oldName, data: { name, normalizedName: normalizeExerciseName(name) } })

describe('updateExerciseDefinition', () => {
  it('renames every exercise row, for every user, that still has the old name', async () => {
    const { def } = await setup()
    const a = await exerciseRow('user-a', def.id, 'Barbell Squat')
    const b = await exerciseRow('user-b', def.id, 'Barbell Squat')

    const { updated, renamedExercises } = await rename(def.id, 'Barbell Squat', 'Back Squat')

    expect(updated.name).toBe('Back Squat')
    expect(renamedExercises).toBe(2)
    expect(await nameOf(a.id)).toBe('Back Squat')
    expect(await nameOf(b.id)).toBe('Back Squat')
  })

  it('leaves rows renamed on purpose, and rows of other definitions, alone', async () => {
    const { def, other } = await setup()
    const custom = await exerciseRow('user-a', def.id, 'My Squat')
    const otherDef = await exerciseRow('user-a', other.id, 'Barbell Squat')

    const { renamedExercises } = await rename(def.id, 'Barbell Squat', 'Back Squat')

    expect(renamedExercises).toBe(0)
    expect(await nameOf(custom.id)).toBe('My Squat')
    expect(await nameOf(otherDef.id)).toBe('Barbell Squat')
  })

  it('renames nothing when the name is unchanged', async () => {
    const { def } = await setup()
    const row = await exerciseRow('user-a', def.id, 'Barbell Squat')
    const before = await prisma.exercise.findUniqueOrThrow({ where: { id: row.id } })

    const { updated, renamedExercises } = await updateExerciseDefinition(prisma, {
      id: def.id,
      oldName: 'Barbell Squat',
      data: { name: 'Barbell Squat', instructions: 'Sit back.' },
    })

    expect(updated.instructions).toBe('Sit back.')
    expect(renamedExercises).toBe(0)
    expect(await prisma.exercise.findUniqueOrThrow({ where: { id: row.id } })).toEqual(before)
  })

  it('renames nothing when the update has no name', async () => {
    const { def } = await setup()
    const row = await exerciseRow('user-a', def.id, 'Barbell Squat')

    const { renamedExercises } = await updateExerciseDefinition(prisma, {
      id: def.id,
      oldName: 'Barbell Squat',
      data: { notes: 'Brace.' },
    })

    expect(renamedExercises).toBe(0)
    expect(await nameOf(row.id)).toBe('Barbell Squat')
  })

  it('a reloaded workout shows the new name', async () => {
    const { def } = await setup()
    const completion = await prisma.workoutCompletion.create({
      data: { userId: 'user-a', status: 'draft', isAdHoc: true, completedAt: new Date() },
      select: { id: true },
    })
    await exerciseRow('user-a', def.id, 'Barbell Squat', completion.id)

    await rename(def.id, 'Barbell Squat', 'Back Squat')

    // The same read the freestyle logger page does on load.
    const reloaded = await prisma.workoutCompletion.findUniqueOrThrow({
      where: { id: completion.id },
      select: { exercises: { select: { name: true } } },
    })
    expect(reloaded.exercises.map((e) => e.name)).toEqual(['Back Squat'])
  })
})
