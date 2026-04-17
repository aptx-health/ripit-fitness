import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { CURRENT_WAIVER_VERSION } from '@/lib/constants/waiver'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'

// ---------------------------------------------------------------------------
// Simulation helpers — replicate API-route logic without HTTP transport
// ---------------------------------------------------------------------------

async function simulateAcceptWaiver(
  prisma: PrismaClient,
  userId: string | null,
  body: { waiverVersion?: string },
  opts: { ipAddress?: string; userAgent?: string } = {}
) {
  if (!userId) {
    return { success: false, error: 'Unauthorized', status: 401 }
  }

  const waiverVersion =
    typeof body.waiverVersion === 'string' ? body.waiverVersion.trim() : null

  if (!waiverVersion || waiverVersion.length > 20) {
    return { success: false, error: 'waiverVersion is required', status: 400 }
  }

  // Idempotency check
  const existing = await prisma.waiverAcceptance.findFirst({
    where: { userId, waiverVersion },
  })

  if (existing) {
    return { success: true, accepted: true, version: waiverVersion }
  }

  await prisma.waiverAcceptance.create({
    data: {
      userId,
      waiverVersion,
      ipAddress: opts.ipAddress ?? null,
      userAgent: opts.userAgent ?? null,
    },
  })

  return { success: true, accepted: true, version: waiverVersion }
}

async function simulateGetWaiverStatus(
  prisma: PrismaClient,
  userId: string | null
) {
  if (!userId) {
    return { success: false, error: 'Unauthorized', status: 401 }
  }

  const latest = await prisma.waiverAcceptance.findFirst({
    where: { userId },
    orderBy: { acceptedAt: 'desc' },
  })

  const accepted = latest?.waiverVersion === CURRENT_WAIVER_VERSION

  return {
    success: true,
    accepted,
    currentVersion: CURRENT_WAIVER_VERSION,
    acceptedVersion: latest?.waiverVersion ?? null,
    acceptedAt: latest?.acceptedAt?.toISOString() ?? null,
  }
}

async function simulateAdminGetWaiverAcceptances(
  prisma: PrismaClient,
  role: string,
  opts: { userId?: string; page?: number; limit?: number } = {}
) {
  if (role !== 'admin' && role !== 'editor') {
    return { success: false, error: 'Forbidden', status: 403 }
  }

  const page = opts.page ?? 1
  const limit = Math.min(opts.limit ?? 50, 100)

  const where: Record<string, unknown> = {}
  if (opts.userId) {
    where.userId = opts.userId
  }

  const [records, totalCount] = await Promise.all([
    prisma.waiverAcceptance.findMany({
      where,
      orderBy: { acceptedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.waiverAcceptance.count({ where }),
  ])

  return {
    success: true,
    data: records.map((r) => ({
      id: r.id,
      userId: r.userId,
      waiverVersion: r.waiverVersion,
      acceptedAt: r.acceptedAt.toISOString(),
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
    })),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

/**
 * Simulates the routing guard check from the app layout.
 * Returns true if the user should be redirected to the waiver page.
 */
async function simulateRoutingGuard(
  prisma: PrismaClient,
  userId: string
): Promise<boolean> {
  const acceptance = await prisma.waiverAcceptance.findFirst({
    where: { userId, waiverVersion: CURRENT_WAIVER_VERSION },
  })
  return !acceptance
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Waiver API', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  // --- POST /api/waiver/accept ---

  describe('POST /api/waiver/accept', () => {
    it('should create a waiver acceptance row', async () => {
      const result = await simulateAcceptWaiver(prisma, userId, {
        waiverVersion: '1.0',
      }, { ipAddress: '192.168.1.1', userAgent: 'TestAgent/1.0' })

      expect(result.success).toBe(true)
      expect(result.accepted).toBe(true)
      expect(result.version).toBe('1.0')

      // Verify DB row
      const row = await prisma.waiverAcceptance.findFirst({
        where: { userId, waiverVersion: '1.0' },
      })
      expect(row).toBeTruthy()
      expect(row?.ipAddress).toBe('192.168.1.1')
      expect(row?.userAgent).toBe('TestAgent/1.0')
    })

    it('should be idempotent — no duplicate row on second acceptance', async () => {
      await simulateAcceptWaiver(prisma, userId, { waiverVersion: '1.0' })
      await simulateAcceptWaiver(prisma, userId, { waiverVersion: '1.0' })

      const count = await prisma.waiverAcceptance.count({
        where: { userId, waiverVersion: '1.0' },
      })
      expect(count).toBe(1)
    })

    it('should return 401 when unauthenticated', async () => {
      const result = await simulateAcceptWaiver(prisma, null, {
        waiverVersion: '1.0',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
      expect(result.status).toBe(401)
    })

    it('should return 400 when waiverVersion is missing', async () => {
      const result = await simulateAcceptWaiver(prisma, userId, {})
      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
    })

    it('should allow separate rows for different versions', async () => {
      await simulateAcceptWaiver(prisma, userId, { waiverVersion: '1.0' })
      await simulateAcceptWaiver(prisma, userId, { waiverVersion: '1.1' })

      const count = await prisma.waiverAcceptance.count({
        where: { userId },
      })
      expect(count).toBe(2)
    })
  })

  // --- GET /api/waiver/status ---

  describe('GET /api/waiver/status', () => {
    it('should return not accepted when user has no acceptances', async () => {
      const result = await simulateGetWaiverStatus(prisma, userId)

      expect(result.success).toBe(true)
      expect(result.accepted).toBe(false)
      expect(result.currentVersion).toBe(CURRENT_WAIVER_VERSION)
      expect(result.acceptedVersion).toBeNull()
      expect(result.acceptedAt).toBeNull()
    })

    it('should return accepted when user has accepted the current version', async () => {
      await prisma.waiverAcceptance.create({
        data: { userId, waiverVersion: CURRENT_WAIVER_VERSION },
      })

      const result = await simulateGetWaiverStatus(prisma, userId)

      expect(result.success).toBe(true)
      expect(result.accepted).toBe(true)
      expect(result.acceptedVersion).toBe(CURRENT_WAIVER_VERSION)
      expect(result.acceptedAt).toBeTruthy()
    })

    it('should detect version mismatch — accepted v1.0 but current is different', async () => {
      // Simulate accepting an old version
      await prisma.waiverAcceptance.create({
        data: { userId, waiverVersion: '0.9' },
      })

      const result = await simulateGetWaiverStatus(prisma, userId)

      expect(result.success).toBe(true)
      expect(result.accepted).toBe(false)
      expect(result.acceptedVersion).toBe('0.9')
      expect(result.currentVersion).toBe(CURRENT_WAIVER_VERSION)
    })

    it('should return 401 when unauthenticated', async () => {
      const result = await simulateGetWaiverStatus(prisma, null)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })
  })

  // --- GET /api/admin/waiver ---

  describe('GET /api/admin/waiver', () => {
    it('should require editor role', async () => {
      const result = await simulateAdminGetWaiverAcceptances(prisma, 'user')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Forbidden')
      expect(result.status).toBe(403)
    })

    it('should return acceptance records for editors', async () => {
      await prisma.waiverAcceptance.create({
        data: { userId, waiverVersion: '1.0', ipAddress: '10.0.0.1' },
      })

      const result = await simulateAdminGetWaiverAcceptances(prisma, 'editor')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data![0].userId).toBe(userId)
      expect(result.data![0].waiverVersion).toBe('1.0')
      expect(result.data![0].ipAddress).toBe('10.0.0.1')
    })

    it('should filter by userId when provided', async () => {
      const otherUser = await createTestUser()
      await prisma.waiverAcceptance.create({
        data: { userId, waiverVersion: '1.0' },
      })
      await prisma.waiverAcceptance.create({
        data: { userId: otherUser.id, waiverVersion: '1.0' },
      })

      const result = await simulateAdminGetWaiverAcceptances(prisma, 'admin', {
        userId,
      })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data![0].userId).toBe(userId)
    })

    it('should paginate results', async () => {
      // Create 3 records
      for (let i = 0; i < 3; i++) {
        const u = await createTestUser()
        await prisma.waiverAcceptance.create({
          data: { userId: u.id, waiverVersion: '1.0' },
        })
      }

      const result = await simulateAdminGetWaiverAcceptances(prisma, 'editor', {
        page: 1,
        limit: 2,
      })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.pagination?.totalCount).toBe(3)
      expect(result.pagination?.totalPages).toBe(2)
    })
  })

  // --- Routing guard ---

  describe('Routing guard', () => {
    it('should redirect user without acceptance to waiver screen', async () => {
      const shouldRedirect = await simulateRoutingGuard(prisma, userId)
      expect(shouldRedirect).toBe(true)
    })

    it('should allow user with current acceptance to proceed', async () => {
      await prisma.waiverAcceptance.create({
        data: { userId, waiverVersion: CURRENT_WAIVER_VERSION },
      })

      const shouldRedirect = await simulateRoutingGuard(prisma, userId)
      expect(shouldRedirect).toBe(false)
    })

    it('should redirect user with outdated acceptance to re-accept', async () => {
      await prisma.waiverAcceptance.create({
        data: { userId, waiverVersion: '0.9' },
      })

      const shouldRedirect = await simulateRoutingGuard(prisma, userId)
      expect(shouldRedirect).toBe(true)
    })
  })
})
