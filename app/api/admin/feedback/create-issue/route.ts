import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

const GITHUB_REPO = 'aptx-health/ripit-fitness'

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'bug',
  feature: 'enhancement',
  confusion: 'ux',
  general: 'feedback',
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireEditor({ rateLimit: true })
    if (auth.response) return auth.response

    const token = process.env.GH_ISSUE_TOKEN
    if (!token) {
      logger.error('GH_ISSUE_TOKEN not configured')
      return NextResponse.json(
        { error: 'GitHub integration not configured' },
        { status: 500 }
      )
    }

    const { feedbackId, labels: extraLabels, adminNote } = await request.json()
    if (!feedbackId) {
      return NextResponse.json({ error: 'feedbackId is required' }, { status: 400 })
    }

    const feedback = await prisma.feedback.findUnique({ where: { id: feedbackId } })
    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    // Use admin note from the request (current UI state) if provided, otherwise fall back to DB value
    const effectiveAdminNote = typeof adminNote === 'string' && adminNote.trim().length > 0
      ? adminNote.trim()
      : feedback.adminNote

    // Build issue title and body
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

    const categoryLabel = CATEGORY_LABELS[feedback.category] || 'feedback'
    const validExtras = Array.isArray(extraLabels)
      ? extraLabels.filter((l: unknown) => typeof l === 'string' && l.trim().length > 0)
      : []
    const labels = [...new Set([categoryLabel, 'user-feedback', ...validExtras])]

    // Create GitHub issue
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title,
        body,
        labels,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      logger.error({ status: res.status, err, context: 'create-issue' }, 'GitHub API error')
      return NextResponse.json(
        { error: `GitHub API error: ${res.status}` },
        { status: 502 }
      )
    }

    const issue = await res.json()

    // Mark feedback as reviewed, persist the admin note, and store the issue URL
    await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: feedback.status === 'new' ? 'reviewed' : feedback.status,
        adminNote: [
          effectiveAdminNote,
          `GitHub Issue: ${issue.html_url}`,
        ].filter(Boolean).join('\n'),
        githubIssueUrl: issue.html_url,
      },
    })

    logger.info({ feedbackId, issueNumber: issue.number }, 'GitHub issue created from feedback')

    return NextResponse.json({
      success: true,
      issueUrl: issue.html_url,
      issueNumber: issue.number,
    })
  } catch (error) {
    logger.error({ error, context: 'create-issue' }, 'Failed to create GitHub issue')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
