import { NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { ALLOWED_TYPES, MAX_FILE_SIZE, uploadMedia } from '@/lib/admin/minio'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/media
 * Upload an image or GIF to MinIO learn-content bucket.
 * Returns URL for markdown embedding.
 *
 * Accepts multipart/form-data with a single "file" field.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireEditor()
    if (auth.response) return auth.response

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 422 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 5MB)` },
        { status: 422 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 422 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadMedia(buffer, file.name, file.type)

    logger.info(
      { filename: file.name, size: file.size, objectName: result.objectName },
      'Media uploaded via admin'
    )

    return NextResponse.json({
      data: {
        url: result.url,
        objectName: result.objectName,
        markdown: `![${file.name}](${result.url})`,
      },
    })
  } catch (error) {
    logger.error({ error }, 'Error uploading media')
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
