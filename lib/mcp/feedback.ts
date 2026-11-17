import type { PrismaClient } from '@prisma/client'

/** The user's feedback, newest first, each marked with whether it has a screenshot (never the bytes). */
export async function listUserFeedback(
  prisma: PrismaClient,
  userId: string,
  { status, category, limit }: { status?: string; category?: string; limit?: number }
) {
  const rows = await prisma.feedback.findMany({
    where: { userId, status: status ?? 'new', ...(category && { category }) },
    orderBy: { createdAt: 'desc' },
    take: limit ?? 20,
    select: {
      id: true,
      category: true,
      message: true,
      pageUrl: true,
      rating: true,
      refinements: true,
      status: true,
      adminNote: true,
      createdAt: true,
      screenshot: { select: { size: true } },
    },
  })
  return rows.map(({ screenshot, ...row }) => ({ ...row, hasScreenshot: screenshot !== null }))
}

/** One of the user's bug reports with its screenshot; null when it isn't theirs or has none. */
export async function getUserFeedbackScreenshot(prisma: PrismaClient, userId: string, feedbackId: string) {
  const row = await prisma.feedback.findFirst({
    where: { id: feedbackId, userId },
    select: {
      id: true,
      category: true,
      message: true,
      pageUrl: true,
      context: true,
      createdAt: true,
      screenshot: { select: { mimeType: true, data: true } },
    },
  })
  if (!row?.screenshot) return null
  const { screenshot, ...info } = row
  return {
    image: { type: 'image' as const, data: Buffer.from(screenshot.data).toString('base64'), mimeType: screenshot.mimeType },
    info,
  }
}
