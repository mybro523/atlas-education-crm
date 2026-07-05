-- CreateEnum
CREATE TYPE "StudentLevel" AS ENUM ('BEGINNER', 'STANDARD', 'ADVANCED');

-- CreateEnum
CREATE TYPE "ReferralSource" AS ENUM ('INSTAGRAM', 'FRIENDS', 'ADS', 'SELF', 'OTHER');

-- AlterEnum
ALTER TYPE "BroadcastAudience" ADD VALUE 'GROUP';

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "courseFee" DECIMAL(10,2),
ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "level" "StudentLevel",
ADD COLUMN     "referralSource" "ReferralSource";

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "educationLevel" TEXT,
ADD COLUMN     "hireDate" TIMESTAMP(3),
ADD COLUMN     "specialty" TEXT,
ADD COLUMN     "telegramUsername" TEXT;

-- AlterTable
ALTER TABLE "broadcasts" ADD COLUMN     "groupId" TEXT;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

