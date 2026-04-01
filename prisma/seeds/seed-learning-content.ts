/**
 * Seed learning content: articles, tags, and collections.
 *
 * Idempotent — skips if collections already exist.
 * Does NOT require a test user or any other seed data.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx prisma/seeds/seed-learning-content.ts
 *
 * Worktree example:
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:5435/ripit" npx tsx prisma/seeds/seed-learning-content.ts
 */
import { PrismaClient } from '@prisma/client'
import { COLLECTIONS } from './dev-articles'

const prisma = new PrismaClient()

// Articles are authored by the system, not a real user.
// This ID is used as a placeholder for the authorId foreign key.
const SYSTEM_AUTHOR_ID = 'system'

async function main() {
  console.log('Seeding learning content...\n')

  // Check if Article table exists
  try {
    await prisma.$queryRaw`SELECT 1 FROM "Article" LIMIT 0`
  } catch {
    console.error('Article table not found. Run prisma db push or migrate first.')
    process.exit(1)
  }

  // Check idempotency
  const existing = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "Collection"
  `
  if (Number(existing[0]?.count) > 0) {
    console.log('Collections already exist — skipping. To re-seed, delete existing collections first.')
    return
  }

  // Collect unique tags across all articles
  const allTags = new Set<string>()
  for (const collection of COLLECTIONS) {
    for (const article of collection.articles) {
      for (const tag of article.tags) {
        allTags.add(tag)
      }
    }
  }

  // Create tags
  const tagIdMap = new Map<string, string>()
  for (const tagName of allTags) {
    const result = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "Tag" (id, name, category)
      VALUES (gen_random_uuid()::text, ${tagName}, 'topic'::"TagCategory")
      ON CONFLICT (name, category) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `
    if (result.length > 0) {
      tagIdMap.set(tagName, result[0].id)
    }
  }
  console.log(`  Tags: ${tagIdMap.size}`)

  let totalArticles = 0

  for (const collection of COLLECTIONS) {
    const articleIds: string[] = []

    for (const article of collection.articles) {
      const result = await prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO "Article" (id, title, slug, body, level, status, "authorId", "readTimeMinutes", "publishedAt", "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid()::text,
          ${article.title},
          ${article.slug},
          ${article.body},
          ${article.level}::"ArticleLevel",
          'published'::"ArticleStatus",
          ${SYSTEM_AUTHOR_ID},
          ${article.readTimeMinutes},
          NOW(),
          NOW(),
          NOW()
        )
        ON CONFLICT (slug) DO NOTHING
        RETURNING id
      `
      if (result.length > 0) {
        articleIds.push(result[0].id)
        totalArticles++

        // Tag associations
        for (const tagName of article.tags) {
          const tagId = tagIdMap.get(tagName)
          if (tagId) {
            await prisma.$queryRaw`
              INSERT INTO "ArticleTag" ("articleId", "tagId")
              VALUES (${result[0].id}, ${tagId})
              ON CONFLICT DO NOTHING
            `
          }
        }
      }
    }

    // Create collection
    const collectionResult = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "Collection" (id, name, description, "displayOrder", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${collection.name}, ${collection.description}, ${collection.displayOrder}, NOW(), NOW())
      RETURNING id
    `

    if (collectionResult.length > 0) {
      const collectionId = collectionResult[0].id
      for (let i = 0; i < articleIds.length; i++) {
        await prisma.$queryRaw`
          INSERT INTO "CollectionArticle" ("collectionId", "articleId", "order")
          VALUES (${collectionId}, ${articleIds[i]}, ${i + 1})
          ON CONFLICT DO NOTHING
        `
      }
    }

    console.log(`  "${collection.name}": ${articleIds.length} articles`)
  }

  console.log(`\nDone. ${totalArticles} articles across ${COLLECTIONS.length} collections.`)
}

main()
  .catch((e) => {
    console.error('Learning content seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
