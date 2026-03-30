/**
 * Generate a URL-friendly slug from a title.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Calculate estimated read time in minutes from markdown body text.
 * Assumes average reading speed of 200 words per minute (conservative for technical content).
 */
export function calculateReadTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}
