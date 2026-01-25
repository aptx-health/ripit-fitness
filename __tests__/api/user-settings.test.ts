import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'

describe('User Settings API', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  describe('GET /api/settings', () => {
    it('should return default settings if user settings do not exist', async () => {
      // Act: Fetch settings for user who has never set preferences
      const response = await simulateGetSettings(prisma, userId)

      // Assert: Default settings are returned
      expect(response.success).toBe(true)
      expect(response.settings).toBeTruthy()
      expect(response.settings?.userId).toBe(userId)
      expect(response.settings?.displayName).toBeNull()
      expect(response.settings?.defaultWeightUnit).toBe('lbs')
      expect(response.settings?.defaultIntensityRating).toBe('rpe')
    })

    it('should return existing settings if they exist', async () => {
      // Arrange: Create user settings
      const existingSettings = await prisma.userSettings.create({
        data: {
          userId,
          displayName: 'Test User',
          defaultWeightUnit: 'kg',
          defaultIntensityRating: 'rir'
        }
      })

      // Act: Fetch settings
      const response = await simulateGetSettings(prisma, userId)

      // Assert: Existing settings are returned
      expect(response.success).toBe(true)
      expect(response.settings?.displayName).toBe('Test User')
      expect(response.settings?.defaultWeightUnit).toBe('kg')
      expect(response.settings?.defaultIntensityRating).toBe('rir')
    })

    it('should return error if user is not authenticated', async () => {
      // Act: Fetch settings without user ID
      const response = await simulateGetSettings(prisma, null)

      // Assert: Unauthorized error
      expect(response.success).toBe(false)
      expect(response.error).toBe('Unauthorized')
    })
  })

  describe('PUT /api/settings', () => {
    it('should create settings if they do not exist', async () => {
      // Act: Update settings for user who has never set preferences
      const response = await simulateUpdateSettings(prisma, userId, {
        displayName: 'New User',
        defaultWeightUnit: 'kg',
        defaultIntensityRating: 'rir'
      })

      // Assert: Settings are created
      expect(response.success).toBe(true)
      expect(response.settings?.displayName).toBe('New User')
      expect(response.settings?.defaultWeightUnit).toBe('kg')
      expect(response.settings?.defaultIntensityRating).toBe('rir')

      // Verify in database
      const dbSettings = await prisma.userSettings.findUnique({
        where: { userId }
      })
      expect(dbSettings).toBeTruthy()
      expect(dbSettings?.displayName).toBe('New User')
    })

    it('should update existing settings', async () => {
      // Arrange: Create initial settings
      await prisma.userSettings.create({
        data: {
          userId,
          displayName: 'Original Name',
          defaultWeightUnit: 'lbs',
          defaultIntensityRating: 'rpe'
        }
      })

      // Act: Update settings
      const response = await simulateUpdateSettings(prisma, userId, {
        displayName: 'Updated Name',
        defaultWeightUnit: 'kg',
        defaultIntensityRating: 'rir'
      })

      // Assert: Settings are updated
      expect(response.success).toBe(true)
      expect(response.settings?.displayName).toBe('Updated Name')
      expect(response.settings?.defaultWeightUnit).toBe('kg')
      expect(response.settings?.defaultIntensityRating).toBe('rir')
    })

    it('should handle partial updates', async () => {
      // Arrange: Create initial settings
      await prisma.userSettings.create({
        data: {
          userId,
          displayName: 'Test User',
          defaultWeightUnit: 'lbs',
          defaultIntensityRating: 'rpe'
        }
      })

      // Act: Update only weight unit
      const response = await simulateUpdateSettings(prisma, userId, {
        defaultWeightUnit: 'kg'
      })

      // Assert: Only weight unit is updated
      expect(response.success).toBe(true)
      expect(response.settings?.displayName).toBe('Test User')
      expect(response.settings?.defaultWeightUnit).toBe('kg')
      expect(response.settings?.defaultIntensityRating).toBe('rpe')
    })

    it('should trim and handle empty display name', async () => {
      // Act: Update with empty string display name
      const response = await simulateUpdateSettings(prisma, userId, {
        displayName: '   ',
        defaultWeightUnit: 'lbs',
        defaultIntensityRating: 'rpe'
      })

      // Assert: Empty display name is stored as null
      expect(response.success).toBe(true)
      expect(response.settings?.displayName).toBeNull()
    })

    it('should validate weight unit', async () => {
      // Act: Try to update with invalid weight unit
      const response = await simulateUpdateSettings(prisma, userId, {
        defaultWeightUnit: 'invalid' as any
      })

      // Assert: Validation error
      expect(response.success).toBe(false)
      expect(response.error).toContain('Invalid weight unit')
    })

    it('should validate intensity rating', async () => {
      // Act: Try to update with invalid intensity rating
      const response = await simulateUpdateSettings(prisma, userId, {
        defaultIntensityRating: 'invalid' as any
      })

      // Assert: Validation error
      expect(response.success).toBe(false)
      expect(response.error).toContain('Invalid intensity rating')
    })

    it('should return error if user is not authenticated', async () => {
      // Act: Update settings without user ID
      const response = await simulateUpdateSettings(prisma, null, {
        displayName: 'Test'
      })

      // Assert: Unauthorized error
      expect(response.success).toBe(false)
      expect(response.error).toBe('Unauthorized')
    })
  })
})

// Simulation functions that replicate API logic

async function simulateGetSettings(
  prisma: PrismaClient,
  userId: string | null
) {
  try {
    // Simulate auth check
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Fetch or create user settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId }
    })

    // If settings don't exist, create default settings
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          displayName: null,
          defaultWeightUnit: 'lbs',
          defaultIntensityRating: 'rpe'
        }
      })
    }

    return {
      success: true,
      settings
    }
  } catch (error) {
    return { success: false, error: 'Internal server error' }
  }
}

async function simulateUpdateSettings(
  prisma: PrismaClient,
  userId: string | null,
  data: {
    displayName?: string
    defaultWeightUnit?: 'lbs' | 'kg' | string
    defaultIntensityRating?: 'rpe' | 'rir' | string
  }
) {
  try {
    // Simulate auth check
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const { displayName, defaultWeightUnit, defaultIntensityRating } = data

    // Validate weight unit
    if (defaultWeightUnit && !['lbs', 'kg'].includes(defaultWeightUnit)) {
      return {
        success: false,
        error: 'Invalid weight unit. Must be "lbs" or "kg"'
      }
    }

    // Validate intensity rating
    if (defaultIntensityRating && !['rpe', 'rir'].includes(defaultIntensityRating)) {
      return {
        success: false,
        error: 'Invalid intensity rating. Must be "rpe" or "rir"'
      }
    }

    // Update or create settings
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        ...(displayName !== undefined && { displayName: displayName?.trim() || null }),
        ...(defaultWeightUnit && { defaultWeightUnit: defaultWeightUnit as 'lbs' | 'kg' }),
        ...(defaultIntensityRating && { defaultIntensityRating: defaultIntensityRating as 'rpe' | 'rir' }),
        updatedAt: new Date()
      },
      create: {
        userId,
        displayName: displayName?.trim() || null,
        defaultWeightUnit: (defaultWeightUnit as 'lbs' | 'kg') || 'lbs',
        defaultIntensityRating: (defaultIntensityRating as 'rpe' | 'rir') || 'rpe'
      }
    })

    return {
      success: true,
      settings
    }
  } catch (error) {
    return { success: false, error: 'Internal server error' }
  }
}
