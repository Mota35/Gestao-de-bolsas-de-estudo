ALTER TABLE "mentor_profiles"
  ADD COLUMN "headline" VARCHAR(180),
  ADD COLUMN "location" VARCHAR(160),
  ADD COLUMN "modalities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "photoUrl" TEXT,
  ADD COLUMN "availabilityPeriod" VARCHAR(120),
  ADD COLUMN "availabilitySchedule" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "mentor_services"
  ADD COLUMN "availability" VARCHAR(500),
  ADD COLUMN "conditions" TEXT,
  ADD COLUMN "showWhatsApp" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "courses"
  ADD COLUMN "availability" VARCHAR(500),
  ADD COLUMN "conditions" TEXT,
  ADD COLUMN "showWhatsApp" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "student_data_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "kind" VARCHAR(20) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_data_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_data_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "student_data_requests_userId_createdAt_idx" ON "student_data_requests"("userId", "createdAt");

CREATE TABLE "support_messages" (
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
CREATE INDEX "support_messages_createdAt_idx" ON "support_messages"("createdAt");
ALTER TABLE "mentor_profiles" ADD COLUMN "experience" TEXT;
ALTER TABLE "mentor_services" ADD COLUMN "place" VARCHAR(180);
ALTER TABLE "courses" ADD COLUMN "place" VARCHAR(180);
ALTER TABLE "users"
  ADD COLUMN "termsAcceptedAt" TIMESTAMPTZ(6),
  ADD COLUMN "newsletterConsent" BOOLEAN NOT NULL DEFAULT false;
