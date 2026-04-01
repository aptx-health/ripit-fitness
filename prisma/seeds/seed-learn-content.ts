/**
 * Seed script for learning content (articles, tags, collections).
 *
 * Idempotent — safe to run multiple times. Uses upsert to avoid duplicates.
 *
 * Usage:
 *   doppler run --config dev_personal -- npx tsx prisma/seeds/seed-learn-content.ts
 */

import { PrismaClient } from '@prisma/client'
import type { ArticleSeed } from './learn-types'
import { ALL_ARTICLES, ALL_COLLECTIONS } from './learn-fundamentals'

const prisma = new PrismaClient()

/** System author ID used for seeded content */
const SYSTEM_AUTHOR_ID = 'system'

async function upsertTags(article: ArticleSeed) {
  const tagIds: string[] = []

  for (const tag of article.tags) {
    const result = await prisma.tag.upsert({
      where: {
        name_category: { name: tag.name, category: tag.category },
      },
      create: { name: tag.name, category: tag.category },
      update: {},
    })
    tagIds.push(result.id)
  }

  return tagIds
}

async function seedArticles() {
  console.log('Seeding articles...')
  const articleMap = new Map<string, string>() // slug -> id

  for (const article of ALL_ARTICLES) {
    const tagIds = await upsertTags(article)

    const result = await prisma.article.upsert({
      where: { slug: article.slug },
      create: {
        title: article.title,
        slug: article.slug,
        body: article.body,
        level: article.level,
        status: 'published',
        authorId: SYSTEM_AUTHOR_ID,
        readTimeMinutes: article.readTimeMinutes,
        publishedAt: new Date(),
        tags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
      update: {
        title: article.title,
        body: article.body,
        level: article.level,
        readTimeMinutes: article.readTimeMinutes,
      },
    })

    articleMap.set(article.slug, result.id)
    console.log(`  [${result.id}] ${article.title}`)
  }

  return articleMap
}

async function seedCollections(articleMap: Map<string, string>) {
  console.log('\nSeeding collections...')

  for (const collection of ALL_COLLECTIONS) {
    // Upsert collection by name (no unique constraint, so find first)
    let existing = await prisma.collection.findFirst({
      where: { name: collection.name },
    })

    if (existing) {
      existing = await prisma.collection.update({
        where: { id: existing.id },
        data: {
          description: collection.description,
          displayOrder: collection.displayOrder,
        },
      })
    } else {
      existing = await prisma.collection.create({
        data: {
          name: collection.name,
          description: collection.description,
          displayOrder: collection.displayOrder,
        },
      })
    }

    // Clear existing article links and re-create in correct order
    await prisma.collectionArticle.deleteMany({
      where: { collectionId: existing.id },
    })

    for (let i = 0; i < collection.articleSlugs.length; i++) {
      const slug = collection.articleSlugs[i]
      const articleId = articleMap.get(slug)

      if (!articleId) {
        console.warn(`  Warning: article "${slug}" not found, skipping`)
        continue
      }

      await prisma.collectionArticle.create({
        data: {
          collectionId: existing.id,
          articleId,
          order: i + 1,
        },
      })
    }

    console.log(
      `  [${existing.id}] ${collection.name} (${collection.articleSlugs.length} articles)`
    )
  }
}

async function main() {
  console.log('Seeding learning content...\n')

  const articleMap = await seedArticles()
  await seedCollections(articleMap)

  console.log(
    `\nDone! Seeded ${articleMap.size} articles and ${ALL_COLLECTIONS.length} collections.`
  )
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
