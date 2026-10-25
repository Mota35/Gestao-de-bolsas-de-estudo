-- Initial migration for Kwanza Oportunidades.
-- Generated alongside schema.prisma; review and apply in a disposable development database first.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('STUDENT','MENTOR','ADMIN');
CREATE TYPE "MentorVerificationStatus" AS ENUM ('PENDING','VERIFIED','REJECTED','SUSPENDED');
CREATE TYPE "ScholarshipPublicationStatus" AS ENUM ('DRAFT','IN_REVIEW','PUBLISHED','ARCHIVED');
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED','PENDING','VERIFIED','REJECTED');
CREATE TYPE "ScholarshipValidityStatus" AS ENUM ('UPCOMING','OPEN','CLOSED','UNKNOWN');
CREATE TYPE "ScholarshipSourceType" AS ENUM ('OFFICIAL_INSTITUTION','GOVERNMENT','NGO','UNIVERSITY','AGGREGATOR','OTHER');
CREATE TYPE "CollectionMethod" AS ENUM ('MANUAL','API','RSS','SCRAPING','PARTNER_IMPORT');
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE','PAUSED','FAILED','DISABLED');
CREATE TYPE "ScholarshipSourceLinkStatus" AS ENUM ('ACTIVE','SUPERSEDED','INVALID');
CREATE TYPE "ServicePublicationStatus" AS ENUM ('DRAFT','PUBLISHED','UNPUBLISHED','ARCHIVED');
CREATE TYPE "ServiceCategory" AS ENUM ('APPLICATION_SUPPORT','CAREER_GUIDANCE','STUDY_ABROAD','LANGUAGE_TEST','PREPARATION','ACADEMIC_MENTORSHIP','OTHER');
CREATE TYPE "DeliveryMode" AS ENUM ('ONLINE','IN_PERSON','HYBRID');
CREATE TYPE "InquiryStatus" AS ENUM ('NEW','CONTACTED','IN_DISCUSSION','ACCEPTED','DECLINED','CLOSED');
CREATE TYPE "TokenPurpose" AS ENUM ('PASSWORD_RESET','EMAIL_VERIFICATION');
CREATE TYPE "ApplicationStatus" AS ENUM ('PLANNING','IN_PROGRESS','SUBMITTED_EXTERNALLY','SUBMITTED_ON_PLATFORM','UNDER_REVIEW','ACCEPTED','REJECTED','WITHDRAWN','EXPIRED');
CREATE TYPE "NotificationType" AS ENUM ('SCHOLARSHIP_DEADLINE','SCHOLARSHIP_STATUS','APPLICATION_STATUS','MENTOR_STATUS','SYSTEM','SECURITY','OTHER');
CREATE TYPE "AuditAction" AS ENUM ('CREATE','UPDATE','DELETE','PUBLISH','UNPUBLISH','VERIFY','REJECT','LOGIN','LOGOUT','TOKEN_REVOKE','ROLE_CHANGE','EXPORT','OTHER');
CREATE TYPE "AuditEntityType" AS ENUM ('USER','STUDENT_PROFILE','MENTOR_PROFILE','SCHOLARSHIP','SCHOLARSHIP_SOURCE','MENTOR_SERVICE','COURSE','APPLICATION','INQUIRY','TOKEN','SESSION','OTHER');
CREATE TYPE "CoursePublicationStatus" AS ENUM ('DRAFT','PUBLISHED','UNPUBLISHED','ARCHIVED');
CREATE TYPE "RefreshTokenStatus" AS ENUM ('ACTIVE','REVOKED','EXPIRED');

CREATE TABLE "users" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "name" VARCHAR(120) NOT NULL, "email" VARCHAR(320) NOT NULL,
"passwordHash" VARCHAR(255) NOT NULL, "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
"emailVerifiedAt" TIMESTAMPTZ(6), "isActive" BOOLEAN NOT NULL DEFAULT true,
"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "student_profiles" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "nationalityCountry" VARCHAR(100),
"academicLevel" VARCHAR(100), "institution" VARCHAR(180), "fieldOfStudy" VARCHAR(160),
"destinationCountries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
"academicPreferences" JSONB, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMPTZ(6) NOT NULL, CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "mentor_profiles" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "bio" TEXT,
"specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "qualifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
"experienceYears" INTEGER, "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "whatsappNumber" VARCHAR(30),
"allowWhatsappPublic" BOOLEAN NOT NULL DEFAULT false, "verificationStatus" "MentorVerificationStatus" NOT NULL DEFAULT 'PENDING',
"rejectionReason" VARCHAR(1000), "reviewedById" UUID, "reviewedAt" TIMESTAMPTZ(6),
"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
CONSTRAINT "mentor_profiles_pkey" PRIMARY KEY ("id"), CONSTRAINT "mentor_profiles_experienceYears_check" CHECK ("experienceYears" IS NULL OR "experienceYears" >= 0)
);
CREATE TABLE "scholarships" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "title" VARCHAR(240) NOT NULL, "slug" VARCHAR(260) NOT NULL,
"description" TEXT NOT NULL, "sponsoringInstitution" VARCHAR(200) NOT NULL, "institutionCountry" VARCHAR(100),
"destinationCountry" VARCHAR(100) NOT NULL, "educationLevel" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
"studyAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "studyMode" "DeliveryMode",
"fundingType" VARCHAR(100) NOT NULL, "eligibilityCriteria" TEXT,
"requiredDocuments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "openingDate" DATE, "applicationDeadline" DATE,
"officialUrl" VARCHAR(2048) NOT NULL, "externalId" VARCHAR(200),
"publicationStatus" "ScholarshipPublicationStatus" NOT NULL DEFAULT 'DRAFT',
"verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED', "verifiedById" UUID,
"verifiedAt" TIMESTAMPTZ(6), "sourceLastCheckedAt" TIMESTAMPTZ(6),
"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
CONSTRAINT "scholarships_pkey" PRIMARY KEY ("id"),
CONSTRAINT "scholarships_deadline_after_opening_check" CHECK ("openingDate" IS NULL OR "applicationDeadline" IS NULL OR "applicationDeadline" >= "openingDate")
);
CREATE TABLE "scholarship_sources" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "name" VARCHAR(180) NOT NULL, "officialUrl" VARCHAR(2048) NOT NULL,
"domain" VARCHAR(255), "sourceType" "ScholarshipSourceType" NOT NULL,
"collectionMethod" "CollectionMethod" NOT NULL DEFAULT 'MANUAL',
"integrationStatus" "IntegrationStatus" NOT NULL DEFAULT 'DISABLED',
"lastCollectedAt" TIMESTAMPTZ(6), "lastVerifiedAt" TIMESTAMPTZ(6),
"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
CONSTRAINT "scholarship_sources_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "scholarship_source_links" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "scholarshipId" UUID NOT NULL, "sourceId" UUID NOT NULL,
"sourceUrl" VARCHAR(2048) NOT NULL, "externalId" VARCHAR(200), "status" "ScholarshipSourceLinkStatus" NOT NULL DEFAULT 'ACTIVE',
"importedAt" TIMESTAMPTZ(6), "lastSeenAt" TIMESTAMPTZ(6), "sourcePayload" JSONB,
"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
CONSTRAINT "scholarship_source_links_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "scholarship_favorites" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "scholarshipId" UUID NOT NULL,
"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "scholarship_favorites_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "mentor_services" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "mentorProfileId" UUID NOT NULL, "title" VARCHAR(200) NOT NULL,
"slug" VARCHAR(220) NOT NULL, "description" TEXT NOT NULL, "category" "ServiceCategory" NOT NULL,
"price" DECIMAL(12,2) NOT NULL, "currency" CHAR(3) NOT NULL DEFAULT 'AOA', "durationMinutes" INTEGER,
"mode" "DeliveryMode" NOT NULL, "requirements" TEXT,
"publicationStatus" "ServicePublicationStatus" NOT NULL DEFAULT 'DRAFT',
"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
CONSTRAINT "mentor_services_pkey" PRIMARY KEY ("id"),
CONSTRAINT "mentor_services_price_check" CHECK ("price" >= 0),
CONSTRAINT "mentor_services_duration_check" CHECK ("durationMinutes" IS NULL OR "durationMinutes" > 0)
);
CREATE TABLE "courses" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "mentorProfileId" UUID NOT NULL, "title" VARCHAR(220) NOT NULL,
"description" TEXT NOT NULL, "category" VARCHAR(120) NOT NULL, "price" DECIMAL(12,2) NOT NULL,
"currency" CHAR(3) NOT NULL DEFAULT 'AOA', "durationMinutes" INTEGER, "mode" "DeliveryMode" NOT NULL,
"enrollmentUrl" VARCHAR(2048), "publicationStatus" "CoursePublicationStatus" NOT NULL DEFAULT 'DRAFT',
"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
CONSTRAINT "courses_pkey" PRIMARY KEY ("id"), CONSTRAINT "courses_price_check" CHECK ("price" >= 0),
CONSTRAINT "courses_duration_check" CHECK ("durationMinutes" IS NULL OR "durationMinutes" > 0)
);
CREATE TABLE "mentorship_inquiries" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "studentUserId" UUID NOT NULL, "mentorServiceId" UUID NOT NULL,
"message" VARCHAR(2000), "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
CONSTRAINT "mentorship_inquiries_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "password_reset_tokens" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "tokenHash" VARCHAR(255) NOT NULL,
"expiresAt" TIMESTAMPTZ(6) NOT NULL, "usedAt" TIMESTAMPTZ(6),
"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "email_verification_tokens" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "tokenHash" VARCHAR(255) NOT NULL,
"expiresAt" TIMESTAMPTZ(6) NOT NULL, "usedAt" TIMESTAMPTZ(6),
"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "refresh_tokens" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "tokenHash" VARCHAR(255) NOT NULL,
"expiresAt" TIMESTAMPTZ(6) NOT NULL, "revokedAt" TIMESTAMPTZ(6),
"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "userAgent" VARCHAR(500), "ipHash" VARCHAR(128),
CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "notifications" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "type" "NotificationType" NOT NULL,
"title" VARCHAR(180) NOT NULL, "message" VARCHAR(2000) NOT NULL, "readAt" TIMESTAMPTZ(6),
"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "audit_logs" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "actorUserId" UUID, "action" "AuditAction" NOT NULL,
"entityType" "AuditEntityType" NOT NULL, "entityId" VARCHAR(128), "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"metadata" JSONB, CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "applications" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "studentUserId" UUID NOT NULL, "scholarshipId" UUID NOT NULL,
"status" "ApplicationStatus" NOT NULL DEFAULT 'PLANNING', "submittedAt" TIMESTAMPTZ(6),
"externalReference" VARCHAR(255), "notes" VARCHAR(2000),
"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_isActive_idx" ON "users"("role","isActive");
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
CREATE UNIQUE INDEX "student_profiles_userId_key" ON "student_profiles"("userId");
CREATE INDEX "student_profiles_nationalityCountry_idx" ON "student_profiles"("nationalityCountry");
CREATE INDEX "student_profiles_academicLevel_idx" ON "student_profiles"("academicLevel");
CREATE INDEX "student_profiles_fieldOfStudy_idx" ON "student_profiles"("fieldOfStudy");
CREATE UNIQUE INDEX "mentor_profiles_userId_key" ON "mentor_profiles"("userId");
CREATE INDEX "mentor_profiles_verificationStatus_createdAt_idx" ON "mentor_profiles"("verificationStatus","createdAt");
CREATE INDEX "mentor_profiles_reviewedById_idx" ON "mentor_profiles"("reviewedById");
CREATE UNIQUE INDEX "scholarships_slug_key" ON "scholarships"("slug");
CREATE INDEX "scholarships_title_idx" ON "scholarships"("title");
CREATE INDEX "scholarships_sponsoringInstitution_idx" ON "scholarships"("sponsoringInstitution");
CREATE INDEX "scholarships_destinationCountry_publicationStatus_idx" ON "scholarships"("destinationCountry","publicationStatus");
CREATE INDEX "scholarships_publicationStatus_verificationStatus_applicationDeadline_idx" ON "scholarships"("publicationStatus","verificationStatus","applicationDeadline");
CREATE INDEX "scholarships_applicationDeadline_idx" ON "scholarships"("applicationDeadline");
CREATE INDEX "scholarships_externalId_idx" ON "scholarships"("externalId");
CREATE INDEX "scholarships_verifiedById_idx" ON "scholarships"("verifiedById");
CREATE INDEX "scholarships_openingDate_idx" ON "scholarships"("openingDate");
CREATE INDEX "scholarship_sources_integrationStatus_sourceType_idx" ON "scholarship_sources"("integrationStatus","sourceType");
CREATE INDEX "scholarship_sources_domain_idx" ON "scholarship_sources"("domain");
CREATE UNIQUE INDEX "scholarship_source_links_scholarshipId_sourceId_sourceUrl_key" ON "scholarship_source_links"("scholarshipId","sourceId","sourceUrl");
CREATE INDEX "scholarship_source_links_sourceId_status_lastSeenAt_idx" ON "scholarship_source_links"("sourceId","status","lastSeenAt");
CREATE INDEX "scholarship_source_links_externalId_idx" ON "scholarship_source_links"("externalId");
CREATE UNIQUE INDEX "scholarship_favorites_userId_scholarshipId_key" ON "scholarship_favorites"("userId","scholarshipId");
CREATE INDEX "scholarship_favorites_scholarshipId_createdAt_idx" ON "scholarship_favorites"("scholarshipId","createdAt");
CREATE INDEX "scholarship_favorites_userId_createdAt_idx" ON "scholarship_favorites"("userId","createdAt");
CREATE UNIQUE INDEX "mentor_services_mentorProfileId_slug_key" ON "mentor_services"("mentorProfileId","slug");
CREATE INDEX "mentor_services_publicationStatus_category_price_idx" ON "mentor_services"("publicationStatus","category","price");
CREATE INDEX "mentor_services_mentorProfileId_publicationStatus_idx" ON "mentor_services"("mentorProfileId","publicationStatus");
CREATE INDEX "courses_publicationStatus_category_price_idx" ON "courses"("publicationStatus","category","price");
CREATE INDEX "courses_mentorProfileId_publicationStatus_idx" ON "courses"("mentorProfileId","publicationStatus");
CREATE INDEX "mentorship_inquiries_studentUserId_status_createdAt_idx" ON "mentorship_inquiries"("studentUserId","status","createdAt");
CREATE INDEX "mentorship_inquiries_mentorServiceId_status_createdAt_idx" ON "mentorship_inquiries"("mentorServiceId","status","createdAt");
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_userId_expiresAt_idx" ON "password_reset_tokens"("userId","expiresAt");
CREATE INDEX "password_reset_tokens_expiresAt_usedAt_idx" ON "password_reset_tokens"("expiresAt","usedAt");
CREATE UNIQUE INDEX "email_verification_tokens_tokenHash_key" ON "email_verification_tokens"("tokenHash");
CREATE INDEX "email_verification_tokens_userId_expiresAt_idx" ON "email_verification_tokens"("userId","expiresAt");
CREATE INDEX "email_verification_tokens_expiresAt_usedAt_idx" ON "email_verification_tokens"("expiresAt","usedAt");
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE INDEX "refresh_tokens_userId_expiresAt_idx" ON "refresh_tokens"("userId","expiresAt");
CREATE INDEX "refresh_tokens_expiresAt_revokedAt_idx" ON "refresh_tokens"("expiresAt","revokedAt");
CREATE INDEX "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId","readAt","createdAt");
CREATE INDEX "audit_logs_actorUserId_occurredAt_idx" ON "audit_logs"("actorUserId","occurredAt");
CREATE INDEX "audit_logs_entityType_entityId_occurredAt_idx" ON "audit_logs"("entityType","entityId","occurredAt");
CREATE INDEX "audit_logs_action_occurredAt_idx" ON "audit_logs"("action","occurredAt");
CREATE UNIQUE INDEX "applications_studentUserId_scholarshipId_key" ON "applications"("studentUserId","scholarshipId");
CREATE INDEX "applications_studentUserId_status_updatedAt_idx" ON "applications"("studentUserId","status","updatedAt");
CREATE INDEX "applications_scholarshipId_status_idx" ON "applications"("scholarshipId","status");

ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "scholarship_source_links" ADD CONSTRAINT "scholarship_source_links_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "scholarships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scholarship_source_links" ADD CONSTRAINT "scholarship_source_links_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "scholarship_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scholarship_favorites" ADD CONSTRAINT "scholarship_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scholarship_favorites" ADD CONSTRAINT "scholarship_favorites_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "scholarships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mentor_services" ADD CONSTRAINT "mentor_services_mentorProfileId_fkey" FOREIGN KEY ("mentorProfileId") REFERENCES "mentor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courses" ADD CONSTRAINT "courses_mentorProfileId_fkey" FOREIGN KEY ("mentorProfileId") REFERENCES "mentor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mentorship_inquiries" ADD CONSTRAINT "mentorship_inquiries_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mentorship_inquiries" ADD CONSTRAINT "mentorship_inquiries_mentorServiceId_fkey" FOREIGN KEY ("mentorServiceId") REFERENCES "mentor_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "scholarships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
