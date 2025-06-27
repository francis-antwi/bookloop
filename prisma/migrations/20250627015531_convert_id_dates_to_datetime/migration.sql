/*
  Warnings:

  - The `idDOB` column on the `Account` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `idExpiryDate` column on the `Account` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `idExpiryDate` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `idDOB` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "idDOB",
ADD COLUMN     "idDOB" TIMESTAMP(3),
DROP COLUMN "idExpiryDate",
ADD COLUMN     "idExpiryDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" DROP COLUMN "idExpiryDate",
ADD COLUMN     "idExpiryDate" TIMESTAMP(3),
DROP COLUMN "idDOB",
ADD COLUMN     "idDOB" TIMESTAMP(3);
