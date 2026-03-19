-- AlterTable: make authorUserId and originalProgramId optional for curated programs
ALTER TABLE "CommunityProgram" ALTER COLUMN "authorUserId" DROP NOT NULL;
ALTER TABLE "CommunityProgram" ALTER COLUMN "originalProgramId" DROP NOT NULL;

-- AddColumn: curated flag
ALTER TABLE "CommunityProgram" ADD COLUMN "curated" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "CommunityProgram_curated_idx" ON "CommunityProgram"("curated");
