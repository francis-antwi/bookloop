-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "idIssueDate" TIMESTAMP(3),
ADD COLUMN     "personalIdNumber" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "idIssueDate" TIMESTAMP(3),
ADD COLUMN     "isOtpVerified" BOOLEAN,
ADD COLUMN     "otpCode" TEXT,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "personalIdNumber" TEXT;
