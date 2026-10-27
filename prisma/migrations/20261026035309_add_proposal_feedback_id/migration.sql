-- Agent tools: link a proposal to the feedback it addresses. Additive only:
-- a nullable column, its index and a SET NULL foreign key. No existing rows change.

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "feedbackId" TEXT;

-- CreateIndex
CREATE INDEX "Proposal_feedbackId_idx" ON "Proposal"("feedbackId");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;

