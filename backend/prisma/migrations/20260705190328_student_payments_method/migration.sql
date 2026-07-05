-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "method" "PaymentMethod",
ALTER COLUMN "billingMonthStart" DROP NOT NULL,
ALTER COLUMN "billingMonthEnd" DROP NOT NULL;

