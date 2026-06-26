/*
  Warnings:

  - The values [SUPER_ADMIN] on the enum `AdminRole` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[candidateCode]` on the table `Student` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdminRole_new" AS ENUM ('ADMIN', 'TRAINEE_OPERATOR', 'PLACEMENT_OPERATOR');
ALTER TABLE "Admin" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Admin" ALTER COLUMN "role" TYPE "AdminRole_new" USING ("role"::text::"AdminRole_new");
ALTER TYPE "AdminRole" RENAME TO "AdminRole_old";
ALTER TYPE "AdminRole_new" RENAME TO "AdminRole";
DROP TYPE "AdminRole_old";
ALTER TABLE "Admin" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
COMMIT;

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Placement" ADD COLUMN     "details" JSONB;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "candidateCode" TEXT,
ADD COLUMN     "profileData" JSONB;

-- CreateIndex
CREATE INDEX "Admin_role_idx" ON "Admin"("role");

-- CreateIndex
CREATE INDEX "Admin_isActive_idx" ON "Admin"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Student_candidateCode_key" ON "Student"("candidateCode");

-- CreateIndex
CREATE INDEX "Student_candidateCode_idx" ON "Student"("candidateCode");
