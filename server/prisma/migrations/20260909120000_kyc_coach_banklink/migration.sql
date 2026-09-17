-- AlterTable User
ALTER TABLE "User" ADD COLUMN "kyc_status" TEXT NOT NULL DEFAULT 'unverified';

-- AlterTable Account
ALTER TABLE "Account" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'demo';
ALTER TABLE "Account" ADD COLUMN "external_item_id" TEXT;
ALTER TABLE "Account" ADD COLUMN "link_status" TEXT NOT NULL DEFAULT 'linked';

-- CreateTable
CREATE TABLE IF NOT EXISTS "kyc_submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "date_of_birth" DATETIME NOT NULL,
    "country" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_last4" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "review_notes" TEXT,
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" DATETIME,
    CONSTRAINT "kyc_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "kyc_submissions_user_id_idx" ON "kyc_submissions"("user_id");
CREATE INDEX IF NOT EXISTS "kyc_submissions_status_idx" ON "kyc_submissions"("status");

-- CreateTable
CREATE TABLE IF NOT EXISTS "coach_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coach_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "coach_messages_user_id_created_at_idx" ON "coach_messages"("user_id", "created_at");

-- CreateTable (from prior upgrade)
CREATE TABLE IF NOT EXISTS "savings_goals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_amount" REAL NOT NULL,
    "current_amount" REAL NOT NULL DEFAULT 0,
    "target_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "savings_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "savings_goals_user_id_idx" ON "savings_goals"("user_id");
