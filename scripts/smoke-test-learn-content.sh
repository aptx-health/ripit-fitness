#!/usr/bin/env bash
# Smoke test for Learn-content data migrations.
#
# Validates that article-insertion migrations work end-to-end on a seeded
# environment. The CI smoke-test job already runs `prisma migrate deploy`
# against a fresh DB, which exercises the data migration's "skip on empty
# environment" branch. This script complements that by exercising the
# happy path.
#
# What this script does:
#   1. Seeds minimal learning-content fixtures (Getting Started collection,
#      Beginner Basics tag, 6 stub articles matching the pre-migration
#      baseline)
#   2. Runs the when-to-stop article migration against those fixtures
#   3. Verifies the article landed at position 6 and gym-etiquette was
#      bumped to position 7
#   4. Runs the migration a second time and verifies no duplicate rows —
#      idempotency check
#
# This is a post-build smoke test, not an integration test. It validates
# that the migration behaves correctly when the preconditions it expects
# (collection and tag exist) are actually met. Integration tests live in
# __tests__/ and run under vitest.
#
# Usage:
#   DATABASE_URL=postgresql://... ./scripts/smoke-test-learn-content.sh
#
# Requires: psql on PATH, DATABASE_URL set.

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"

MIGRATION_SQL="${MIGRATION_SQL:-prisma/migrations/20260416173535_add_when_to_stop_article/migration.sql}"

if [ ! -f "$MIGRATION_SQL" ]; then
  echo "Migration SQL not found at $MIGRATION_SQL"
  exit 1
fi

# psql helper — DATABASE_URL contains credentials so psql can parse it directly
run_sql() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 "$@"
}

query() {
  psql "$DATABASE_URL" -tAc "$1"
}

assert_eq() {
  local actual="$1" expected="$2" label="$3"
  if [ "$actual" != "$expected" ]; then
    echo "FAIL: $label — expected '$expected', got '$actual'"
    exit 1
  fi
  echo "  ok: $label"
}

echo "=== Seeding minimal fixtures ==="

# Clean slate for learning tables only. Use CASCADE to sweep read-status
# and comment tables that reference Article.
run_sql <<'SQL'
TRUNCATE "CollectionArticle", "ArticleTag", "Article", "Collection", "Tag" CASCADE;

INSERT INTO "Tag" (id, name, category) VALUES
  ('smoke-tag-beginner-basics', 'Beginner Basics', 'topic');

INSERT INTO "Collection" (id, name, description, "displayOrder", "createdAt", "updatedAt") VALUES
  ('smoke-coll-getting-started', 'Getting Started', 'Intro content', 1, NOW(), NOW());

-- 6 stub articles matching the pre-migration baseline. Bodies are stub text;
-- the migration under test doesn't read them.
INSERT INTO "Article" (id, title, slug, body, level, status, "authorId", "readTimeMinutes", "publishedAt", "createdAt", "updatedAt") VALUES
  ('smoke-art-1', 'Your First Week', 'your-first-week', 'stub', 'beginner', 'published', 'system', 4, NOW(), NOW(), NOW()),
  ('smoke-art-2', 'How to Read Your Program', 'how-to-read-your-program', 'stub', 'beginner', 'published', 'system', 3, NOW(), NOW(), NOW()),
  ('smoke-art-3', 'Choosing the Right Weight', 'choosing-the-right-weight', 'stub', 'beginner', 'published', 'system', 4, NOW(), NOW(), NOW()),
  ('smoke-art-4', 'Warming Up', 'warming-up', 'stub', 'beginner', 'published', 'system', 3, NOW(), NOW(), NOW()),
  ('smoke-art-5', 'Staying Safe', 'staying-safe', 'stub', 'beginner', 'published', 'system', 4, NOW(), NOW(), NOW()),
  ('smoke-art-6', 'Gym Etiquette', 'gym-etiquette', 'stub', 'beginner', 'published', 'system', 3, NOW(), NOW(), NOW());

INSERT INTO "CollectionArticle" ("collectionId", "articleId", "order") VALUES
  ('smoke-coll-getting-started', 'smoke-art-1', 1),
  ('smoke-coll-getting-started', 'smoke-art-2', 2),
  ('smoke-coll-getting-started', 'smoke-art-3', 3),
  ('smoke-coll-getting-started', 'smoke-art-4', 4),
  ('smoke-coll-getting-started', 'smoke-art-5', 5),
  ('smoke-coll-getting-started', 'smoke-art-6', 6);
SQL

echo "=== Running migration (first pass) ==="
run_sql -f "$MIGRATION_SQL" > /dev/null

echo "=== Verifying happy path ==="
RESULT=$(query "
  SELECT ca.\"order\"
  FROM \"CollectionArticle\" ca
  JOIN \"Article\" a ON a.id = ca.\"articleId\"
  JOIN \"Collection\" c ON c.id = ca.\"collectionId\"
  WHERE c.name = 'Getting Started' AND a.slug = 'when-to-stop';
")
assert_eq "$RESULT" "6" "when-to-stop is in Getting Started at position 6"

RESULT=$(query "
  SELECT ca.\"order\"
  FROM \"CollectionArticle\" ca
  JOIN \"Article\" a ON a.id = ca.\"articleId\"
  JOIN \"Collection\" c ON c.id = ca.\"collectionId\"
  WHERE c.name = 'Getting Started' AND a.slug = 'gym-etiquette';
")
assert_eq "$RESULT" "7" "gym-etiquette shifted from 6 to 7"

RESULT=$(query "SELECT COUNT(*) FROM \"Article\" WHERE slug = 'when-to-stop';")
assert_eq "$RESULT" "1" "when-to-stop article row created exactly once"

RESULT=$(query "
  SELECT COUNT(*) FROM \"ArticleTag\" at
  JOIN \"Article\" a ON a.id = at.\"articleId\"
  JOIN \"Tag\" t ON t.id = at.\"tagId\"
  WHERE a.slug = 'when-to-stop' AND t.name = 'Beginner Basics';
")
assert_eq "$RESULT" "1" "Beginner Basics tag linked to when-to-stop"

# Enforce review-gate policy: migration-inserted articles must land in
# pending_review so an admin approves them before they reach users. The
# public /api/articles endpoint filters to status = 'published'.
RESULT=$(query "SELECT status FROM \"Article\" WHERE slug = 'when-to-stop';")
assert_eq "$RESULT" "pending_review" "when-to-stop inserted as pending_review (review gate)"

RESULT=$(query "SELECT \"publishedAt\" IS NULL FROM \"Article\" WHERE slug = 'when-to-stop';")
assert_eq "$RESULT" "t" "publishedAt is NULL while pending review"

echo "=== Running migration (second pass, idempotency) ==="
run_sql -f "$MIGRATION_SQL" > /dev/null
run_sql -f "$MIGRATION_SQL" > /dev/null

RESULT=$(query "SELECT COUNT(*) FROM \"Article\" WHERE slug = 'when-to-stop';")
assert_eq "$RESULT" "1" "still exactly one when-to-stop article after repeated runs"

RESULT=$(query "
  SELECT ca.\"order\"
  FROM \"CollectionArticle\" ca
  JOIN \"Article\" a ON a.id = ca.\"articleId\"
  WHERE a.slug = 'when-to-stop';
")
assert_eq "$RESULT" "6" "when-to-stop still at position 6 after repeated runs"

RESULT=$(query "
  SELECT ca.\"order\"
  FROM \"CollectionArticle\" ca
  JOIN \"Article\" a ON a.id = ca.\"articleId\"
  WHERE a.slug = 'gym-etiquette';
")
assert_eq "$RESULT" "7" "gym-etiquette still at position 7 after repeated runs"

RESULT=$(query "
  SELECT COUNT(*) FROM \"ArticleTag\" at
  JOIN \"Article\" a ON a.id = at.\"articleId\"
  WHERE a.slug = 'when-to-stop';
")
assert_eq "$RESULT" "1" "still exactly one tag link after repeated runs"

echo ""
echo "All learn-content migration smoke tests passed."
