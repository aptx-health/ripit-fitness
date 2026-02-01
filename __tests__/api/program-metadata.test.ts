import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser, createTestProgram } from '@/lib/test/factories'
import { validateProgramMetadata } from '@/lib/community/validation'
import { detectEquipmentNeeded } from '@/lib/community/equipment-detection'
import { publishProgramToCommunity } from '@/lib/community/publishing'

describe('Program Metadata', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  describe('Metadata Validation', () => {
    it('should require level and goals for publishing', async () => {
      const program = await createTestProgram(prisma, userId)

      // Fetch program to get full data
      const fullProgram = await prisma.program.findUnique({
        where: { id: program.id },
      })

      // Program without metadata
      const result = validateProgramMetadata(fullProgram)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        'Program must have a fitness level (Beginner, Intermediate, or Advanced)'
      )
      expect(result.errors).toContain('Program must have at least one training goal')
    })

    it('should accept valid metadata', async () => {
      const program = await createTestProgram(prisma, userId)

      // Update with valid metadata
      const updatedProgram = await prisma.program.update({
        where: { id: program.id },
        data: {
          level: 'intermediate',
          goals: ['strength', 'muscle_gain'],
        },
      })

      const result = validateProgramMetadata(updatedProgram)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate target days per week range', async () => {
      const program = await createTestProgram(prisma, userId)

      // Update with invalid targetDaysPerWeek
      const invalidProgram = await prisma.program.update({
        where: { id: program.id },
        data: {
          level: 'intermediate',
          goals: ['strength'],
          targetDaysPerWeek: 10,
        },
      })

      const result = validateProgramMetadata(invalidProgram)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Target days per week must be between 1 and 7')
    })
  })

  describe('Equipment Detection', () => {
    it('should detect equipment from exercise definitions', async () => {
      // Create exercise definitions with equipment
      const benchPressEx = await prisma.exerciseDefinition.create({
        data: {
          name: 'Bench Press',
          normalizedName: 'benchpress',
          aliases: ['bench'],
          category: 'chest',
          equipment: ['barbell', 'bench'],
          isSystem: true,
          userId: '00000000-0000-0000-0000-000000000000',
        },
      })

      const dumbbellCurlEx = await prisma.exerciseDefinition.create({
        data: {
          name: 'Dumbbell Curls',
          normalizedName: 'dumbbellcurls',
          aliases: ['curls'],
          category: 'arms',
          equipment: ['dumbbell'],
          isSystem: true,
          userId: '00000000-0000-0000-0000-000000000000',
        },
      })

      // Create program with these exercises
      const program = await prisma.program.create({
        data: {
          userId,
          name: 'Test Program',
          description: 'Test',
          weeks: {
            create: [
              {
                userId,
                weekNumber: 1,
                workouts: {
                  create: [
                    {
                      userId,
                      name: 'Day 1',
                      dayNumber: 1,
                      exercises: {
                        create: [
                          {
                            userId,
                            name: 'Bench Press',
                            exerciseDefinitionId: benchPressEx.id,
                            order: 1,
                          },
                          {
                            userId,
                            name: 'Dumbbell Curls',
                            exerciseDefinitionId: dumbbellCurlEx.id,
                            order: 2,
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      })

      const equipment = await detectEquipmentNeeded(prisma, program.id, 'strength')

      expect(equipment).toContain('barbell')
      expect(equipment).toContain('bench')
      expect(equipment).toContain('dumbbell')
      expect(equipment).toHaveLength(3)
      expect(equipment).toEqual(['barbell', 'bench', 'dumbbell']) // Should be sorted
    })

    it('should normalize equipment names', async () => {
      // Create exercise with non-normalized equipment
      const pullUpEx = await prisma.exerciseDefinition.create({
        data: {
          name: 'Pull-ups',
          normalizedName: 'pullups',
          aliases: ['pullup'],
          category: 'back',
          equipment: ['pull-up bar'], // Should normalize to pull_up_bar
          isSystem: true,
          userId: '00000000-0000-0000-0000-000000000000',
        },
      })

      const program = await prisma.program.create({
        data: {
          userId,
          name: 'Test Program',
          description: 'Test',
          weeks: {
            create: [
              {
                userId,
                weekNumber: 1,
                workouts: {
                  create: [
                    {
                      userId,
                      name: 'Day 1',
                      dayNumber: 1,
                      exercises: {
                        create: [
                          {
                            userId,
                            name: 'Pull-ups',
                            exerciseDefinitionId: pullUpEx.id,
                            order: 1,
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      })

      const equipment = await detectEquipmentNeeded(prisma, program.id, 'strength')

      expect(equipment).toContain('pull_up_bar')
    })

    it('should filter out unknown equipment', async () => {
      // Create exercise with mix of known and unknown equipment
      const mixedEx = await prisma.exerciseDefinition.create({
        data: {
          name: 'Mixed Exercise',
          normalizedName: 'mixedexercise',
          aliases: ['mixed'],
          category: 'other',
          equipment: ['barbell', 'magic_wand', 'dumbbell'],
          isSystem: true,
          userId: '00000000-0000-0000-0000-000000000000',
        },
      })

      const program = await prisma.program.create({
        data: {
          userId,
          name: 'Test Program',
          description: 'Test',
          weeks: {
            create: [
              {
                userId,
                weekNumber: 1,
                workouts: {
                  create: [
                    {
                      userId,
                      name: 'Day 1',
                      dayNumber: 1,
                      exercises: {
                        create: [
                          {
                            userId,
                            name: 'Mixed Exercise',
                            exerciseDefinitionId: mixedEx.id,
                            order: 1,
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      })

      const equipment = await detectEquipmentNeeded(prisma, program.id, 'strength')

      expect(equipment).toContain('barbell')
      expect(equipment).toContain('dumbbell')
      expect(equipment).not.toContain('magic_wand')
    })

    it('should handle bodyweight-only programs', async () => {
      const pushUpEx = await prisma.exerciseDefinition.create({
        data: {
          name: 'Push-ups',
          normalizedName: 'pushups',
          aliases: ['pushup'],
          category: 'chest',
          equipment: ['bodyweight'],
          isSystem: true,
          userId: '00000000-0000-0000-0000-000000000000',
        },
      })

      const program = await prisma.program.create({
        data: {
          userId,
          name: 'Test Program',
          description: 'Test',
          weeks: {
            create: [
              {
                userId,
                weekNumber: 1,
                workouts: {
                  create: [
                    {
                      userId,
                      name: 'Day 1',
                      dayNumber: 1,
                      exercises: {
                        create: [
                          {
                            userId,
                            name: 'Push-ups',
                            exerciseDefinitionId: pushUpEx.id,
                            order: 1,
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      })

      const equipment = await detectEquipmentNeeded(prisma, program.id, 'strength')

      expect(equipment).toContain('bodyweight')
      expect(equipment).toHaveLength(1)
    })
  })

  describe('Metadata API', () => {
    it('should save metadata to program', async () => {
      const program = await createTestProgram(prisma, userId, {
        name: 'Test Program',
      })

      // Simulate PATCH /api/programs/[programId]/metadata
      const updatedProgram = await prisma.program.update({
        where: { id: program.id, userId: userId },
        data: {
          goals: ['strength', 'muscle_gain'],
          level: 'intermediate',
          targetDaysPerWeek: 4,
          durationDisplay: '8 weeks',
          equipmentNeeded: ['barbell', 'dumbbell'],
        },
      })

      expect(updatedProgram.goals).toEqual(['strength', 'muscle_gain'])
      expect(updatedProgram.level).toBe('intermediate')
      expect(updatedProgram.targetDaysPerWeek).toBe(4)
      expect(updatedProgram.durationDisplay).toBe('8 weeks')
      expect(updatedProgram.equipmentNeeded).toEqual(['barbell', 'dumbbell'])
    })

    it('should only update metadata for owned programs', async () => {
      // Create program for user1
      const program = await createTestProgram(prisma, userId)

      // Create another user
      const user2 = await createTestUser()

      // Try to update program as user2 (should fail)
      await expect(
        prisma.program.update({
          where: { id: program.id, userId: user2.id },
          data: { level: 'advanced' },
        })
      ).rejects.toThrow()
    })
  })

  describe('Publishing with Metadata', () => {
    it('should copy metadata to CommunityProgram on publish', async () => {
      // Create program with metadata
      const program = await createTestProgram(prisma, userId, {
        name: 'Test Program',
      })

      await prisma.program.update({
        where: { id: program.id },
        data: {
          description: 'Test Description',
          level: 'intermediate',
          goals: ['strength', 'muscle_gain'],
          targetDaysPerWeek: 4,
          durationDisplay: '8 weeks',
          equipmentNeeded: ['barbell', 'dumbbell'],
        },
      })

      // Publish to community
      const result = await publishProgramToCommunity(
        prisma,
        program.id,
        userId,
        'strength'
      )

      expect(result.success).toBe(true)

      // Verify CommunityProgram has metadata
      const communityProgram = await prisma.communityProgram.findUnique({
        where: { originalProgramId: program.id },
      })

      expect(communityProgram).toBeDefined()
      expect(communityProgram!.level).toBe('intermediate')
      expect(communityProgram!.goals).toEqual(['strength', 'muscle_gain'])
      expect(communityProgram!.targetDaysPerWeek).toBe(4)
      expect(communityProgram!.durationDisplay).toBe('8 weeks')
      expect(communityProgram!.equipmentNeeded).toEqual(['barbell', 'dumbbell'])
    })

    it('should not publish without required metadata', async () => {
      const program = await createTestProgram(prisma, userId, {
        name: 'Test Program',
      })

      await prisma.program.update({
        where: { id: program.id },
        data: {
          description: 'Test Description',
        },
      })

      // Try to publish without metadata (missing level and goals)
      const result = await publishProgramToCommunity(
        prisma,
        program.id,
        userId,
        'strength'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('metadata')
    })

    it('should not publish already published programs', async () => {
      const program = await createTestProgram(prisma, userId, {
        name: 'Test Program',
      })

      await prisma.program.update({
        where: { id: program.id },
        data: {
          description: 'Test Description',
          level: 'intermediate',
          goals: ['strength'],
        },
      })

      // Publish once
      const firstResult = await publishProgramToCommunity(
        prisma,
        program.id,
        userId,
        'strength'
      )
      expect(firstResult.success).toBe(true)

      // Try to publish again
      const secondResult = await publishProgramToCommunity(
        prisma,
        program.id,
        userId,
        'strength'
      )
      expect(secondResult.success).toBe(false)
      expect(secondResult.error).toContain('already been published')
    })
  })

  describe('Cardio Program Metadata', () => {
    it('should detect equipment from cardio sessions', async () => {
      // Create cardio program
      const cardioProgram = await prisma.cardioProgram.create({
        data: {
          userId: userId,
          name: 'Test Cardio Program',
          description: 'Test',
          weeks: {
            create: [
              {
                userId: userId,
                weekNumber: 1,
                sessions: {
                  create: [
                    {
                      userId: userId,
                      name: 'Run',
                      dayNumber: 1,
                      targetDuration: 30,
                      equipment: 'treadmill',
                    },
                  ],
                },
              },
            ],
          },
        },
      })

      const equipment = await detectEquipmentNeeded(
        prisma,
        cardioProgram.id,
        'cardio'
      )

      // Note: 'treadmill' is not in our equipment constants, so it should be filtered out
      expect(equipment).toHaveLength(0)
    })

    it('should save and publish cardio program metadata', async () => {
      const cardioProgram = await prisma.cardioProgram.create({
        data: {
          userId: userId,
          name: 'Test Cardio Program',
          description: 'Test',
          weeks: {
            create: [
              {
                userId: userId,
                weekNumber: 1,
                sessions: {
                  create: [
                    {
                      userId: userId,
                      name: 'Run',
                      dayNumber: 1,
                      targetDuration: 30,
                    },
                  ],
                },
              },
            ],
          },
          level: 'beginner',
          goals: ['endurance', 'fat_loss'],
          targetDaysPerWeek: 3,
        },
      })

      // Publish
      const result = await publishProgramToCommunity(
        prisma,
        cardioProgram.id,
        userId,
        'cardio'
      )

      expect(result.success).toBe(true)

      // Verify metadata
      const communityProgram = await prisma.communityProgram.findUnique({
        where: { originalProgramId: cardioProgram.id },
      })

      expect(communityProgram!.level).toBe('beginner')
      expect(communityProgram!.goals).toEqual(['endurance', 'fat_loss'])
      expect(communityProgram!.targetDaysPerWeek).toBe(3)
    })
  })
})
