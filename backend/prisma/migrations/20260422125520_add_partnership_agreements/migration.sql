-- CreateTable
CREATE TABLE "PartnershipAgreement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "bullets" JSONB NOT NULL,
    "mouLabel" TEXT NOT NULL DEFAULT 'View MOU',
    "mouUrl" TEXT,
    "summary" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnershipAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipAgreement_name_key" ON "PartnershipAgreement"("name");

-- CreateIndex
CREATE INDEX "PartnershipAgreement_name_idx" ON "PartnershipAgreement"("name");

-- CreateIndex
CREATE INDEX "PartnershipAgreement_sortOrder_idx" ON "PartnershipAgreement"("sortOrder");

-- CreateIndex
CREATE INDEX "PartnershipAgreement_isActive_idx" ON "PartnershipAgreement"("isActive");
