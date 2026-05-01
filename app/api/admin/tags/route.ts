import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/tags
 * List all tags grouped by category.
 */
export async function GET() {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const tags = await prisma.tag.findMany({
      include: { _count: { select: { articles: true } } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    const grouped = {
      topic: [] as typeof tags,
      body_area: [] as typeof tags,
      context: [] as typeof tags,
    }

    for (const tag of tags) {
      const cat = tag.category as keyof typeof grouped
      if (grouped[cat]) {
        grouped[cat].push(tag)
      }
    }

    return NextResponse.json({
      data: tags.map((t) => ({
        ...t,
        articleCount: t._count.articles,
        _count: undefined,
      })),
      grouped: Object.fromEntries(
        Object.entries(grouped).map(([cat, catTags]) => [
          cat,
          catTags.map((t) => ({ ...t, articleCount: t._count.articles, _count: undefined })),
        ])
      ),
    })
  } catch (error) {
    logger.error({ error }, 'Error listing tags')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/tags
 * Create a new tag.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireEditor({ rateLimit: true })
    if (auth.response) return auth.response

    const body = await request.json()
    const { name, category } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 422 })
    }

    if (!['topic', 'body_area', 'context'].includes(category)) {
      return NextResponse.json({ error: 'Category must be topic, body_area, or context' }, { status: 422 })
    }

    // Check uniqueness (name + category)
    const existing = await prisma.tag.findUnique({
      where: { name_category: { name: name.trim().toLowerCase(), category } },
    })
    if (existing) {
      return NextResponse.json({ error: 'A tag with this name and category already exists' }, { status: 409 })
    }

    const tag = await prisma.tag.create({
      data: { name: name.trim().toLowerCase(), category },
    })

    logger.info({ tagId: tag.id, name: tag.name, category }, 'Tag created')

    return NextResponse.json({ data: tag })
  } catch (error) {
    logger.error({ error }, 'Error creating tag')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
