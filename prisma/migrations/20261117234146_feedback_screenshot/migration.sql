-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "context" JSONB;

-- CreateTable
CREATE TABLE "FeedbackScreenshot" (
    "feedbackId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackScreenshot_pkey" PRIMARY KEY ("feedbackId")
);

-- AddForeignKey
ALTER TABLE "FeedbackScreenshot" ADD CONSTRAINT "FeedbackScreenshot_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
