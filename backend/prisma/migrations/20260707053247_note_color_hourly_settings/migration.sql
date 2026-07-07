-- AlterTable
ALTER TABLE "students" ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "hourlyRate" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "color" TEXT;

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

