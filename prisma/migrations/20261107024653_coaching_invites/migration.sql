-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "coachLinkId" TEXT,
ALTER COLUMN "agentTokenId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CoachInvite" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachLink" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "traineeUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endedBy" TEXT,

    CONSTRAINT "CoachLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachInvite_tokenHash_key" ON "CoachInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "CoachInvite_coachUserId_idx" ON "CoachInvite"("coachUserId");

-- CreateIndex
CREATE INDEX "CoachLink_coachUserId_idx" ON "CoachLink"("coachUserId");

-- CreateIndex
CREATE INDEX "CoachLink_traineeUserId_idx" ON "CoachLink"("traineeUserId");

-- CreateIndex
CREATE INDEX "Proposal_coachLinkId_idx" ON "Proposal"("coachLinkId");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_coachLinkId_fkey" FOREIGN KEY ("coachLinkId") REFERENCES "CoachLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A proposal has exactly one sender: an agent token or a coach link
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_one_sender_check" CHECK (("agentTokenId" IS NULL) <> ("coachLinkId" IS NULL));
