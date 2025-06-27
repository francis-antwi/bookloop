/*
  Warnings:

  - You are about to drop the column `faceConfidence` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `idImage` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `isFaceVerified` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `selfieImage` on the `Account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "faceConfidence",
DROP COLUMN "idImage",
DROP COLUMN "isFaceVerified",
DROP COLUMN "selfieImage";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "idDateOfBirth" TEXT,
ADD COLUMN     "idExpiryDate" TEXT,
ADD COLUMN     "idFullName" TEXT,
ADD COLUMN     "idIssuer" TEXT,
ADD COLUMN     "idNumber" TEXT;
