import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'

/**
 * Simulates the core logic of the create-issue API route.
 * Extracts the issue body construction and DB update logic
 * without making actual GitHub API calls.
 */
async function simulateCreateIssueBody(
  prisma: PrismaClient,
  userId: string | null,
  feedbackId: string,
  options: { adminNote?: string; labels?: string[] } = {}
) {
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  const feedback = await prisma.feedback.findUnique({ where: { id: feedbackId } })
  if (!feedback) {
    return { success: false, error: 'Feedback not found' }
  }

  // This mirrors the logic in create-issue/route.ts
  const effectiveAdminNote = typeof options.adminNote === 'string' && options.adminNote.trim().length > 0
    ? options.adminNote.trim()
    : feedback.adminNote

  const categoryTitle = feedback.category.charAt(0).toUpperCase() + feedback.category.slice(1)
  const title = `[${categoryTitle}] ${feedback.message.substring(0, 80)}${feedback.message.length > 80 ? '...' : ''}`

  const body = [
    `## User Feedback`,
    '',
    feedback.message,
    '',
    `**Category:** ${feedback.category}`,
    `**Page:** ${feedback.pageUrl}`,
    `**Submitted:** ${feedback.createdAt.toISOString().split('T')[0]}`,
    feedback.userAgent ? `**Device:** ${feedback.userAgent}` : '',
    effectiveAdminNote ? `\n**Admin Note:** ${effectiveAdminNote}` : '',
    '',
    `---`,
    `*Created from in-app feedback (ID: ${feedback.id})*`,
  ].filter(Boolean).join('\n')

  // Simulate the DB update that persists the admin note + issue URL
  const fakeIssueUrl = 'https://github.com/aptx-health/ripit-fitness/issues/999'
  await prisma.feedback.update({
    where: { id: feedbackId },
    data: {
      status: feedback.status === 'new' ? 'reviewed' : feedback.status,
      adminNote: [
        effectiveAdminNote,
        `GitHub Issue: ${fakeIssueUrl}`,
      ].filter(Boolean).join('\n'),
    },
  })

  return { success: true, title, body, effectiveAdminNote }
}

describe('Admin Create Issue API', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  it('should include admin note from request in the issue body', async () => {
    // Arrange: Create feedback with NO admin note in the database
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        category: 'bug',
        message: 'Something is broken',
        pageUrl: '/workouts',
        status: 'new',
        // adminNote is null in DB - note only exists in UI state
      },
    })

    // Act: Create issue with admin note passed from the frontend
    const result = await simulateCreateIssueBody(prisma, userId, feedback.id, {
      adminNote: 'This is a critical bug affecting multiple users',
    })

    // Assert: The issue body includes the admin note from the request
    expect(result.success).toBe(true)
    expect(result.body).toContain('**Admin Note:** This is a critical bug affecting multiple users')

    // Assert: The admin note is persisted to the database
    const updated = await prisma.feedback.findUnique({ where: { id: feedback.id } })
    expect(updated?.adminNote).toContain('This is a critical bug affecting multiple users')
    expect(updated?.adminNote).toContain('GitHub Issue:')
  })

  it('should fall back to DB admin note when request does not include one', async () => {
    // Arrange: Create feedback with an existing admin note in the database
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        category: 'feature',
        message: 'Please add dark mode',
        pageUrl: '/settings',
        status: 'new',
        adminNote: 'Previously saved note',
      },
    })

    // Act: Create issue without passing adminNote (simulates old behavior)
    const result = await simulateCreateIssueBody(prisma, userId, feedback.id, {})

    // Assert: The issue body uses the existing DB note
    expect(result.success).toBe(true)
    expect(result.body).toContain('**Admin Note:** Previously saved note')
  })

  it('should not include admin note section when no note exists anywhere', async () => {
    // Arrange: Create feedback with no admin note
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        category: 'general',
        message: 'Just a thought',
        pageUrl: '/dashboard',
        status: 'new',
      },
    })

    // Act: Create issue without admin note
    const result = await simulateCreateIssueBody(prisma, userId, feedback.id, {})

    // Assert: No admin note section in body
    expect(result.success).toBe(true)
    expect(result.body).not.toContain('Admin Note')
  })

  it('should persist the request admin note to the database', async () => {
    // Arrange: Create feedback with no saved admin note
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        category: 'bug',
        message: 'Buttons not working',
        pageUrl: '/programs',
        status: 'new',
      },
    })

    // Act: Create issue with admin note from UI
    await simulateCreateIssueBody(prisma, userId, feedback.id, {
      adminNote: 'Confirmed on mobile Safari',
    })

    // Assert: The admin note is now in the database (was null before)
    const updated = await prisma.feedback.findUnique({ where: { id: feedback.id } })
    expect(updated?.adminNote).toContain('Confirmed on mobile Safari')
    expect(updated?.status).toBe('reviewed')
  })
})
