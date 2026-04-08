import { logger } from '@/lib/logger'

const BUCKET = 'learn-content'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

let minioClientPromise: Promise<import('minio').Client> | null = null

function getMinioClient(): Promise<import('minio').Client> {
  if (!minioClientPromise) {
    minioClientPromise = (async () => {
      const { Client } = await import('minio')
      const endpointUrl = process.env.MINIO_ENDPOINT || 'http://localhost:9000'
      const parsed = new URL(endpointUrl)

      return new Client({
        endPoint: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 9000),
        useSSL: parsed.protocol === 'https:',
        accessKey: process.env.MINIO_ROOT_USER || '',
        secretKey: process.env.MINIO_ROOT_PASSWORD || '',
      })
    })()
  }
  return minioClientPromise
}

export interface UploadResult {
  url: string
  objectName: string
}

/**
 * Upload a media file to the learn-content MinIO bucket.
 * Returns the public URL for embedding in markdown.
 */
export async function uploadMedia(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${buffer.length} bytes (max ${MAX_FILE_SIZE})`)
  }

  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error(`Invalid content type: ${contentType}. Allowed: ${ALLOWED_TYPES.join(', ')}`)
  }

  const client = await getMinioClient()

  // Generate unique object name with timestamp prefix
  const timestamp = Date.now()
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const objectName = `${timestamp}-${safeName}`

  await client.putObject(BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': contentType,
  })

  const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000'
  const url = `${endpoint}/${BUCKET}/${objectName}`

  logger.info({ objectName, contentType, size: buffer.length }, 'Media uploaded to MinIO')

  return { url, objectName }
}

export { ALLOWED_TYPES, MAX_FILE_SIZE }
