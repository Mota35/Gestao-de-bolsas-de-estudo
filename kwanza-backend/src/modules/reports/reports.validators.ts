import { z } from 'zod';
import { paginationSchema } from '../../utils/pagination.js';

export const REPORT_TARGETS = ['MENTOR_PROFILE', 'MENTOR_SERVICE', 'COURSE'] as const;
export const REPORT_REASONS = ['SCAM', 'FALSE_INFORMATION', 'INAPPROPRIATE_CONTENT', 'IMPERSONATION', 'OTHER'] as const;
export const REPORT_STATUS = ['OPEN', 'RESOLVED', 'DISMISSED'] as const;

export const createReportSchema = z
  .object({
    targetType: z.enum(REPORT_TARGETS),
    targetId: z.uuid(),
    reason: z.enum(REPORT_REASONS),
    details: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export const listReportsQuery = paginationSchema.extend({
  status: z.enum(REPORT_STATUS).optional(),
  targetType: z.enum(REPORT_TARGETS).optional(),
});

export const resolveReportSchema = z
  .object({ outcome: z.enum(['RESOLVED', 'DISMISSED']), note: z.string().trim().min(3).max(1000) })
  .strict();

export const idParams = z.object({ id: z.uuid() });
