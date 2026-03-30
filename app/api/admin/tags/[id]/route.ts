import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * PATCH /api/admin/tags/[id]
 * Update a tag's name or category.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()
    const { name, category } = body

    const existing = await prisma.tag.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    const newName = name?.trim().toLowerCase() || existing.name
    const newCategory = category || existing.category

    // Check uniqueness if name or category changed
    if (newName !== existing.name || newCategory !== existing.category) {
      const conflict = await prisma.tag.findFirst({
        where: { name: newName, category: newCategory, id: { not: id } },
      })
      if (conflict) {
        return NextResponse.json({ error: 'A tag with this name and category already exists' }, { status: 409 })
      }
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: { name: newName, category: newCategory },
    })

    logger.info({ tagId: id, name: newName, category: newCategory }, 'Tag updated')

    return NextResponse.json({ data: tag })
  } catch (error) {
    logger.error({ error }, 'Error updating tag')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/tags/[id]
 * Delete a tag. Warns if tag is in use.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const { id } = await params

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { articles: true } } },
    })

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Check force param — if tag is in use, require confirmation
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    if (tag._count.articles > 0 && !force) {
      return NextResponse.json(
        {
          error: `Tag is used by ${tag._count.articles} article(s). Pass ?force=true to delete anyway.`,
          articleCount: tag._count.articles,
        },
        { status: 409 }
      )
    }

    await prisma.tag.delete({ where: { id } })

    logger.info({ tagId: id, name: tag.name }, 'Tag deleted')

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, 'Error deleting tag')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
