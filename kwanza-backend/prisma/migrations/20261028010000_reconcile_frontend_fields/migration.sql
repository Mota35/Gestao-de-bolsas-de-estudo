ALTER TABLE "mentor_profiles"
  ADD COLUMN IF NOT EXISTS "headline" VARCHAR(180),
  ADD COLUMN IF NOT EXISTS "experience" TEXT,
  ADD COLUMN IF NOT EXISTS "location" VARCHAR(160),
  ADD COLUMN IF NOT EXISTS "modalities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "photoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "availabilityPeriod" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "availabilitySchedule" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "mentor_services"
  ADD COLUMN IF NOT EXISTS "availability" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "conditions" TEXT,
  ADD COLUMN IF NOT EXISTS "place" VARCHAR(180),
  ADD COLUMN IF NOT EXISTS "showWhatsApp" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "availability" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "conditions" TEXT,
  ADD COLUMN IF NOT EXISTS "place" VARCHAR(180),
  ADD COLUMN IF NOT EXISTS "showWhatsApp" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "newsletterConsent" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "student_data_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "kind" VARCHAR(20) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_data_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_data_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "student_data_requests_userId_createdAt_idx" ON "student_data_requests"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(120) NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "category" VARCHAR(80) NOT NULL,
  "subject" VARCHAR(180) NOT NULL,
  "message" VARCHAR(4000) NOT NULL,
  "consent" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "support_messages_createdAt_idx" ON "support_messages"("createdAt");
