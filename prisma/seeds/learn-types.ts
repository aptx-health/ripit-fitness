/**
 * Shared types for learning content seed data.
 */

export type ArticleSeed = {
  title: string
  slug: string
  level: 'beginner' | 'intermediate' | 'advanced'
  readTimeMinutes: number
  tags: { name: string; category: 'topic' | 'body_area' | 'context' }[]
  body: string
}

export type CollectionSeed = {
  name: string
  description: string
  displayOrder: number
  /** Article slugs in display order */
  articleSlugs: string[]
}
