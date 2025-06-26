-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "faceConfidence" DOUBLE PRECISION,
ADD COLUMN     "idImage" TEXT,
ADD COLUMN     "isFaceVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "selfieImage" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "faceConfidence" DOUBLE PRECISION,
ADD COLUMN     "idImage" TEXT,
ADD COLUMN     "isFaceVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "selfieImage" TEXT;
