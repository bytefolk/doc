-- CreateTable
CREATE TABLE "PubDocLike" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "pubDocId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PubDocLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PubDocLike_pubDocId_idx" ON "PubDocLike"("pubDocId");

-- CreateIndex
CREATE UNIQUE INDEX "PubDocLike_viewerId_pubDocId_key" ON "PubDocLike"("viewerId", "pubDocId");

-- AddForeignKey
ALTER TABLE "PubDocLike" ADD CONSTRAINT "PubDocLike_pubDocId_fkey" FOREIGN KEY ("pubDocId") REFERENCES "PubDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
