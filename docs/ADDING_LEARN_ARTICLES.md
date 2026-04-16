# Adding Learn Articles

Operational guide for shipping a new Learn tab article to staging and production. For voice, tone, and formatting, see `ARTICLE_AUTHORING.md`. For feedback patterns established against the existing article set, see `article-review-feedback.md`.

## The two-file pattern

Adding an article to an environment that hasn't been seeded is one problem. Adding it to staging and prod, which are already seeded and ignore re-seeds, is a different problem. You need to handle both:

1. **`prisma/seeds/dev-articles.ts`** — the source of truth for new environments (fresh dev, CI, test containers). The seed script `prisma/seeds/seed-learning-content.ts` reads from this file but short-circuits if any `Collection` row already exists. So this file alone will never reach staging or prod.
2. **A Prisma data migration** — applies the same content to existing environments via the normal deploy pipeline (init container on staging, ArgoCD pre-sync Job on prod).

Every article PR should touch both. They're complementary, not redundant.

## Publishing policy

**Migration-inserted articles land as `pending_review`, not `published`.**

The public `/api/articles` endpoint filters to `status = 'published'`. By inserting as `pending_review`, a new article shows up in the admin review queue at `/admin/articles` but stays invisible to users until an admin clicks Publish. This prevents automatically-added content from reaching end users without a human approval step.

This is deliberate and should apply to every article migration going forward. The seed file (`dev-articles.ts`, used only in fresh dev/test/CI environments) uses `'published'` for developer convenience — the review gate is a staging/prod-only concern because the seed never reaches those environments.

Practical flow after a migration deploys:

1. Merge PR → CI builds image → staging deploys → migration runs → article lands as `pending_review`
2. An admin opens `/admin/articles`, filters by status = pending_review, reviews the new article
3. Admin clicks Publish; the admin PUT route sets `publishedAt = NOW()` and `status = 'published'`
4. Article becomes visible to users

If you need the article live immediately on deploy (bypassing review), escalate — don't change the migration to `'published'`. The review gate has value even for content you wrote yourself.

## Step-by-step

### 1. Write the article in `dev-articles.ts`

Define a new `ArticleDef` constant following the existing shape. Add it to the correct `*_ARTICLES` array at the desired position.

```ts
const myNewArticle: ArticleDef = {
  title: 'Example Title',
  slug: 'example-title',
  level: 'beginner',
  readTimeMinutes: 4,
  tags: ['Beginner Basics'],
  body: `# Example Title

Article markdown here.`,
}

export const GETTING_STARTED_ARTICLES: ArticleDef[] = [
  yourFirstWeek,
  // ... existing articles ...
  myNewArticle,         // insert at the desired position
  gymEtiquette,
]
```

Use `docs/ARTICLE_AUTHORING.md` for voice and formatting rules. Use `docs/article-review-feedback.md` to avoid repeating patterns that have already been flagged in review.

### 2. Write the data migration

Create `prisma/migrations/<timestamp>_add_<slug>_article/migration.sql` where `<timestamp>` is from `date -u +"%Y%m%d%H%M%S"` and `<slug>` matches the article slug.

See `prisma/migrations/20260416173535_add_when_to_stop_article/migration.sql` for a working example. The key requirements:

- **Look up collection and tag IDs by name**, not hardcoded — IDs differ between environments
- **Skip gracefully** if the collection doesn't exist yet (fresh envs will be handled by the seed)
- **Use `ON CONFLICT DO NOTHING`** on every INSERT for idempotency
- **Only reorder existing articles if the new article is not yet in the collection** — this is the subtle idempotency bug to watch for. A naive `UPDATE ... SET "order" = "order" + 1 WHERE "order" >= N` will shift positions every time it runs. Guard it with an existence check.

Template structure:

```sql
DO $mig$
DECLARE
  v_collection_id TEXT;
  v_article_id    TEXT;
  v_tag_id        TEXT;
  v_already_in_collection BOOLEAN;
BEGIN
  SELECT id INTO v_collection_id FROM "Collection" WHERE name = 'Getting Started' LIMIT 1;
  IF v_collection_id IS NULL THEN
    RAISE NOTICE 'Collection not found; skipping (fresh env seed will handle)';
    RETURN;
  END IF;

  SELECT id INTO v_tag_id FROM "Tag" WHERE name = 'Beginner Basics' AND category = 'topic' LIMIT 1;
  IF v_tag_id IS NULL THEN
    RAISE NOTICE 'Tag not found; skipping';
    RETURN;
  END IF;

  INSERT INTO "Article" (
    id, title, slug, body, level, status, "authorId",
    "readTimeMinutes", "publishedAt", "createdAt", "updatedAt"
  )
  VALUES (
    gen_random_uuid()::text,
    'Example Title',
    'example-title',
    $body$# Example Title

Markdown body here.$body$,
    'beginner'::"ArticleLevel",
    'pending_review'::"ArticleStatus",  -- review gate — see Publishing policy above
    'system',
    4,
    NULL,  -- publishedAt: NULL until admin reviews and publishes
    NOW(), NOW()
  )
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_article_id FROM "Article" WHERE slug = 'example-title' LIMIT 1;

  INSERT INTO "ArticleTag" ("articleId", "tagId")
  VALUES (v_article_id, v_tag_id)
  ON CONFLICT DO NOTHING;

  SELECT EXISTS(
    SELECT 1 FROM "CollectionArticle"
    WHERE "collectionId" = v_collection_id AND "articleId" = v_article_id
  ) INTO v_already_in_collection;

  IF NOT v_already_in_collection THEN
    -- Bump any existing articles at or past the target position
    UPDATE "CollectionArticle"
    SET "order" = "order" + 1
    WHERE "collectionId" = v_collection_id AND "order" >= 6;

    INSERT INTO "CollectionArticle" ("collectionId", "articleId", "order")
    VALUES (v_collection_id, v_article_id, 6);
  END IF;
END
$mig$;
```

### Field reference

| Field | Source | Notes |
|-------|--------|-------|
| `level` | enum `ArticleLevel` | `beginner` \| `intermediate` \| `advanced`. Cast as `'beginner'::"ArticleLevel"` |
| `status` | enum `ArticleStatus` | `draft` \| `pending_review` \| `published` \| `rejected`. Seed uses `'published'` (dev convenience). Migrations use `'pending_review'` (review gate — see Publishing policy) |
| `authorId` | text | Use `'system'` for seeded content. Admin-UI content uses a real user ID |
| `category` (Tag) | enum `TagCategory` | Seeds use `'topic'`. Match when looking up tag IDs |
| `Collection.displayOrder` | int | Position of the collection itself on the Learn tab |
| `CollectionArticle.order` | int | 1-indexed position within the collection |

### 3. Test the migration locally

The smoke test script `scripts/smoke-test-learn-content.sh` exercises the happy path, idempotency, and reorder correctness against minimal fixtures. It's the same script CI runs post-build. Quickest local check:

```bash
source scripts/worktree-env.sh
DATABASE_URL="postgresql://postgres:postgres@localhost:${PG_PORT}/ripit" \
  ./scripts/smoke-test-learn-content.sh
```

When you add a new article migration, update the script to also cover your new migration — either by extending the assertions (for position-specific checks) or by parameterizing `MIGRATION_SQL` and running it for both.

For a manual check against a seeded worktree DB (Collections must exist):

```bash
source scripts/worktree-env.sh

# Apply migration
docker exec -i ${PG_CONTAINER_NAME} psql -U postgres -d ripit -v ON_ERROR_STOP=1 \
  < prisma/migrations/<timestamp>_add_<slug>_article/migration.sql

# Inspect result
docker exec -i ${PG_CONTAINER_NAME} psql -U postgres -d ripit -c "
  SELECT ca.\"order\", a.slug
  FROM \"CollectionArticle\" ca
  JOIN \"Article\" a ON a.id = ca.\"articleId\"
  JOIN \"Collection\" c ON c.id = ca.\"collectionId\"
  WHERE c.name = 'Getting Started'
  ORDER BY ca.\"order\";"

# Verify idempotency: run a second time, confirm no change
docker exec -i ${PG_CONTAINER_NAME} psql -U postgres -d ripit -v ON_ERROR_STOP=1 \
  < prisma/migrations/<timestamp>_add_<slug>_article/migration.sql

# Verify fresh-env skip: wipe, run, confirm "Collection not found" notice
docker exec -i ${PG_CONTAINER_NAME} psql -U postgres -d ripit \
  -c 'TRUNCATE "CollectionArticle", "ArticleTag", "Collection", "Article", "Tag" CASCADE;'
docker exec -i ${PG_CONTAINER_NAME} psql -U postgres -d ripit -v ON_ERROR_STOP=1 \
  < prisma/migrations/<timestamp>_add_<slug>_article/migration.sql
```

Verify three things:

1. First run places the article at the correct position and bumps subsequent ones
2. Second run is a no-op (article stays at target position, no duplicate article or tag rows)
3. Against an empty DB, the migration prints a `NOTICE` and exits without error

### 4. Commit both files together

```bash
git add prisma/seeds/dev-articles.ts
git add "prisma/migrations/<timestamp>_add_<slug>_article/"
git commit -m "feat: add <title> learn article"
```

Do not commit the seed change without the migration. A seed-only PR will silently not reach staging or prod, which looks correct locally but breaks on deploy.

## What happens on deploy

- **Staging** (merge to `dev`): init container runs `prisma migrate deploy` before app pods start. The new migration applies, article appears.
- **Production** (merge to `main`): ArgoCD pre-sync Job runs `prisma migrate deploy`. Same flow.
- **Fresh dev worktrees**: `./scripts/dev.sh` applies schema via `db push` (not `migrate deploy`), so the data migration won't auto-run. The article shows up anyway because the seed contains it.

## Alternative: admin UI (for small edits, not initial creation)

If you are tweaking an existing article's body or title, prefer editing via the admin UI at `/admin/articles` on staging/prod. Admin-UI edits don't propagate back to `dev-articles.ts`, so the two can drift over time — that's expected once an article has shipped.

Use the migration pattern above only for **initial creation** of new articles. For ongoing edits, the admin UI is the source of truth.

## Gotchas

- **Tag must exist.** The migration looks up the tag by name. If you use a new tag that doesn't exist in the target environment, the migration will skip. Either pre-create the tag in a separate migration, or add a `CREATE TAG IF NOT EXISTS` step at the top of the migration.
- **Markdown body and dollar-quoting.** The article body in the SQL uses `$body$...$body$` dollar-quoting so you can embed single quotes and newlines without escaping. If your body contains the literal string `$body$`, switch the tag (e.g., `$article$...$article$`).
- **Em dashes and unicode in SQL.** `psql` reads the file as UTF-8 by default, so em dashes, curly quotes, and other non-ASCII characters in the body work. Don't escape them.
- **Position conflicts.** If two article-addition migrations in the same PR target the same collection position, the second will put the article one past the first. Keep position logic straightforward — insert at the end if you're not sure.
- **`displayOrder` vs `order`.** `Collection.displayOrder` orders the collections on the Learn tab. `CollectionArticle.order` orders articles within a collection. They're separate fields; don't mix them up.

## Related files

| Path | Purpose |
|------|---------|
| `prisma/seeds/dev-articles.ts` | Article content source of truth for new environments |
| `prisma/seeds/seed-learning-content.ts` | Seed runner (idempotent, skips when collections exist) |
| `prisma/schema.prisma` | `Article`, `Tag`, `ArticleTag`, `Collection`, `CollectionArticle` models |
| `app/api/admin/articles/route.ts` | Admin API for creating articles via UI |
| `app/(app)/admin/collections/page.tsx` | Admin UI for managing collection membership and order |
| `scripts/smoke-test-learn-content.sh` | Smoke test for article migrations (runs in CI post-build and locally) |
| `.github/workflows/build-app.yml` | CI smoke-test job that invokes the smoke-test script |
| `docs/ARTICLE_AUTHORING.md` | Writing style, markdown features, AI-tropes to avoid |
| `docs/article-review-feedback.md` | Review feedback on the existing 13 articles |
