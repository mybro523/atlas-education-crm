-- ==========================================================================
-- SaaS tenancy: academies + per-row academy scoping with full backfill.
-- The existing installation becomes the first client academy so no data is
-- lost. Written by hand: prisma's generated diff cannot backfill.
-- ==========================================================================

-- New role for the platform owner (safe to add; not used inside this tx).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OWNER' BEFORE 'FOUNDER';

CREATE TYPE "AcademyStatus" AS ENUM ('ACTIVE', 'BLOCKED');

CREATE TABLE "academies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "status" "AcademyStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscriptionStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscriptionEnd" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "academies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academy_payments" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL DEFAULT '',
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "academy_payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "academy_payments_academyId_idx" ON "academy_payments"("academyId");
ALTER TABLE "academy_payments" ADD CONSTRAINT "academy_payments_academyId_fkey"
    FOREIGN KEY ("academyId") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The current installation becomes the first academy (far-future paid-through).
INSERT INTO "academies" ("id", "name", "status", "subscriptionStart", "subscriptionEnd", "createdAt", "updatedAt")
VALUES ('academy-atlas', 'Atlas Education', 'ACTIVE', CURRENT_TIMESTAMP, '2099-12-31 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- --------------------------------------------------------------------------
-- Add + backfill "academyId" on every tenant table.
-- --------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'branches', 'students', 'parents', 'teachers', 'employees',
        'rooms', 'course_types', 'courses', 'groups', 'lessons', 'lesson_rates',
        'grades', 'attendances', 'remarks', 'payments', 'finance_records',
        'salaries', 'conversations', 'messages', 'broadcasts', 'notifications',
        'system_settings'
    ] LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN "academyId" TEXT', t);
        EXECUTE format('UPDATE %I SET "academyId" = ''academy-atlas''', t);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN "academyId" SET NOT NULL', t);
        -- Type-level default only: '' never survives the FK, but it lets
        -- Prisma's generated types keep academyId optional for services.
        EXECUTE format('ALTER TABLE %I ALTER COLUMN "academyId" SET DEFAULT ''''', t);
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("academyId") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE',
            t, t || '_academyId_fkey');
        EXECUTE format('CREATE INDEX %I ON %I ("academyId")', t || '_academyId_idx', t);
    END LOOP;
END $$;

-- users: nullable academyId — the platform OWNER belongs to no academy.
ALTER TABLE "users" ADD COLUMN "academyId" TEXT;
UPDATE "users" SET "academyId" = 'academy-atlas';
ALTER TABLE "users" ADD CONSTRAINT "users_academyId_fkey"
    FOREIGN KEY ("academyId") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "users_academyId_idx" ON "users"("academyId");

-- system_settings: key was the PK; it becomes per-academy composite.
ALTER TABLE "system_settings" DROP CONSTRAINT "system_settings_pkey";
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("academyId", "key");

-- conversations: external identity is unique per academy now.
DROP INDEX "conversations_channel_externalId_key";
CREATE UNIQUE INDEX "conversations_academyId_channel_externalId_key"
    ON "conversations"("academyId", "channel", "externalId");
