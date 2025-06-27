/*
  Warnings:

  - You are about to drop the column `idDateOfBirth` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `idFullName` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "faceConfidence" DOUBLE PRECISION,
ADD COLUMN     "idDOB" TEXT,
ADD COLUMN     "idExpiryDate" TEXT,
ADD COLUMN     "idImage" TEXT,
ADD COLUMN     "idIssuer" TEXT,
ADD COLUMN     "idName" TEXT,
ADD COLUMN     "idNumber" TEXT,
ADD COLUMN     "isFaceVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "selfieImage" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "idDateOfBirth",
DROP COLUMN "idFullName",
ADD COLUMN     "idDOB" TEXT,
ADD COLUMN     "idName" TEXT;
