-- CreateEnum
CREATE TYPE "ParentRelation" AS ENUM ('FATHER', 'MOTHER', 'OTHER');

-- DropForeignKey
ALTER TABLE "teacher_subjects" DROP CONSTRAINT "teacher_subjects_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "teacher_subjects" DROP CONSTRAINT "teacher_subjects_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "groups" DROP CONSTRAINT "groups_subjectId_fkey";

-- DropIndex
DROP INDEX "courses_subjectId_idx";

-- AlterTable
ALTER TABLE "parents" ADD COLUMN     "position" TEXT,
ADD COLUMN     "relation" "ParentRelation" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "courses" DROP COLUMN "subjectId",
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "groups" DROP COLUMN "subjectId";

-- AlterTable
ALTER TABLE "lessons" DROP COLUMN "room",
DROP COLUMN "topic",
ADD COLUMN     "roomId" TEXT;

-- DropTable
DROP TABLE "subjects";

-- DropTable
DROP TABLE "teacher_subjects";

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rooms_branchId_idx" ON "rooms"("branchId");

-- CreateIndex
CREATE INDEX "lessons_roomId_idx" ON "lessons"("roomId");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

