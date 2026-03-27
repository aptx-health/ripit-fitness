-- CreateEnum: UserRole
CREATE TYPE "UserRole" AS ENUM ('user', 'author', 'editor', 'admin');

-- AddColumn: role on BetterAuth user table
ALTER TABLE "user" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'user';

-- CreateEnum: ArticleLevel
CREATE TYPE "ArticleLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum: ArticleStatus
CREATE TYPE "ArticleStatus" AS ENUM ('draft', 'pending_review', 'published', 'rejected');

-- CreateEnum: TagCategory
CREATE TYPE "TagCategory" AS ENUM ('topic', 'body_area', 'context');

-- CreateTable: Article
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "level" "ArticleLevel" NOT NULL,
    "status" "ArticleStatus" NOT NULL DEFAULT 'draft',
    "authorId" TEXT NOT NULL,
    "reviewNote" TEXT,
    "readTimeMinutes" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Tag
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TagCategory" NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ArticleTag
CREATE TABLE "ArticleTag" (
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ArticleTag_pkey" PRIMARY KEY ("articleId","tagId")
);

-- CreateTable: ContentReadStatus
CREATE TABLE "ContentReadStatus" (
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "firstReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentReadStatus_pkey" PRIMARY KEY ("userId","articleId")
);

-- CreateTable: Collection
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CollectionArticle
CREATE TABLE "CollectionArticle" (
    "collectionId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CollectionArticle_pkey" PRIMARY KEY ("collectionId","articleId")
);

-- CreateTable: ArticleComment
CREATE TABLE "ArticleComment" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Article
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");
CREATE INDEX "Article_authorId_idx" ON "Article"("authorId");
CREATE INDEX "Article_status_idx" ON "Article"("status");
CREATE INDEX "Article_level_idx" ON "Article"("level");
CREATE INDEX "Article_publishedAt_idx" ON "Article"("publishedAt" DESC);
CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt" DESC);

-- CreateIndex: Tag
CREATE UNIQUE INDEX "Tag_name_category_key" ON "Tag"("name", "category");
CREATE INDEX "Tag_category_idx" ON "Tag"("category");

-- CreateIndex: ArticleTag
CREATE INDEX "ArticleTag_tagId_idx" ON "ArticleTag"("tagId");

-- CreateIndex: ContentReadStatus
CREATE INDEX "ContentReadStatus_userId_idx" ON "ContentReadStatus"("userId");
CREATE INDEX "ContentReadStatus_articleId_idx" ON "ContentReadStatus"("articleId");

-- CreateIndex: Collection
CREATE INDEX "Collection_displayOrder_idx" ON "Collection"("displayOrder");

-- CreateIndex: CollectionArticle
CREATE INDEX "CollectionArticle_articleId_idx" ON "CollectionArticle"("articleId");

-- CreateIndex: ArticleComment
CREATE INDEX "ArticleComment_articleId_idx" ON "ArticleComment"("articleId");
CREATE INDEX "ArticleComment_userId_idx" ON "ArticleComment"("userId");
CREATE INDEX "ArticleComment_articleId_createdAt_idx" ON "ArticleComment"("articleId", "createdAt");

-- AddForeignKey: ArticleTag
ALTER TABLE "ArticleTag" ADD CONSTRAINT "ArticleTag_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleTag" ADD CONSTRAINT "ArticleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ContentReadStatus
ALTER TABLE "ContentReadStatus" ADD CONSTRAINT "ContentReadStatus_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CollectionArticle
ALTER TABLE "CollectionArticle" ADD CONSTRAINT "CollectionArticle_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionArticle" ADD CONSTRAINT "CollectionArticle_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ArticleComment
ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
