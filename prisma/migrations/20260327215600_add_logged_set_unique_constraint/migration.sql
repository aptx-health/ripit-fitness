-- CreateIndex
CREATE UNIQUE INDEX "LoggedSet_completionId_exerciseId_setNumber_key" ON "LoggedSet"("completionId", "exerciseId", "setNumber");
