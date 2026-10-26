-- Agent tools slice 1: personal access tokens for the MCP server and the
-- proposals agents create. Additive only.

-- CreateTable
CREATE TABLE "AgentToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AgentToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentTokenId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "summary" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "targetId" TEXT,
    "before" JSONB,
    "inverse" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentToken_tokenHash_key" ON "AgentToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AgentToken_userId_idx" ON "AgentToken"("userId");

-- CreateIndex
CREATE INDEX "Proposal_userId_status_createdAt_idx" ON "Proposal"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Proposal_agentTokenId_idx" ON "Proposal"("agentTokenId");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_agentTokenId_fkey" FOREIGN KEY ("agentTokenId") REFERENCES "AgentToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

