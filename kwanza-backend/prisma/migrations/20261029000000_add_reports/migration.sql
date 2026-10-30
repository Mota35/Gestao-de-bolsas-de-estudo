CREATE TYPE "ReportTargetType" AS ENUM ('MENTOR_PROFILE', 'MENTOR_SERVICE', 'COURSE');
CREATE TYPE "ReportReason" AS ENUM ('SCAM', 'FALSE_INFORMATION', 'INAPPROPRIATE_CONTENT', 'IMPERSONATION', 'OTHER');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

CREATE TABLE "reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reporterUserId" UUID NOT NULL,
  "targetType" "ReportTargetType" NOT NULL,
  "targetId" UUID NOT NULL,
  "reason" "ReportReason" NOT NULL,
  "details" VARCHAR(2000),
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "resolutionNote" VARCHAR(1000),
  "resolvedById" UUID,
  "resolvedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "reports_status_createdAt_idx" ON "reports"("status", "createdAt");
CREATE INDEX "reports_targetType_targetId_idx" ON "reports"("targetType", "targetId");
CREATE INDEX "reports_reporterUserId_idx" ON "reports"("reporterUserId");
