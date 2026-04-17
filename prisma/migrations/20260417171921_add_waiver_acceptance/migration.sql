-- CreateTable
CREATE TABLE "WaiverAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "waiverVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "WaiverAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaiverAcceptance_userId_waiverVersion_idx" ON "WaiverAcceptance"("userId", "waiverVersion");

-- CreateIndex
CREATE INDEX "WaiverAcceptance_userId_acceptedAt_idx" ON "WaiverAcceptance"("userId", "acceptedAt");
