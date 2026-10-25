import { z } from 'zod';
import { paginationSchema } from '../../utils/pagination.js';
import { isSafeHttpUrl } from '../../utils/url.js';
import { scholarshipFields } from '../scholarships/scholarships.validators.js';

const SOURCE_TYPES = ['OFFICIAL_INSTITUTION', 'GOVERNMENT', 'NGO', 'UNIVERSITY', 'AGGREGATOR', 'OTHER'] as const;
const COLLECTION_METHODS = ['MANUAL', 'API', 'RSS', 'SCRAPING', 'PARTNER_IMPORT'] as const;
const INTEGRATION_STATUS = ['ACTIVE', 'PAUSED', 'FAILED', 'DISABLED'] as const;

const url = z.string().trim().max(2048).refine(isSafeHttpUrl, 'URL inválido (apenas http/https).');

export const createSourceSchema = z
  .object({
    name: z.string().trim().min(2).max(180),
    officialUrl: url,
    sourceType: z.enum(SOURCE_TYPES),
    collectionMethod: z.enum(COLLECTION_METHODS).default('MANUAL'),
  })
  .strict();

export const updateSourceSchema = z
  .object({
    name: z.string().trim().min(2).max(180).optional(),
    officialUrl: url.optional(),
    integrationStatus: z.enum(INTEGRATION_STATUS).optional(),
    lastVerifiedAt: z.coerce.date().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Indique pelo menos um campo.');

export const manualEntrySchema = scholarshipFields
  .extend({ sourceUrl: url.optional() })
  .strict();

export const keyParams = z.object({ key: z.string().regex(/^[a-z0-9-]{2,40}$/) });
export const idParams = z.object({ id: z.uuid() });
export const pendingParams = z.object({ id: z.uuid(), linkId: z.uuid() });
export const auditQuery = paginationSchema.extend({
  actorUserId: z.uuid().optional(),
  entityType: z.string().max(40).optional(),
  entityId: z.string().max(128).optional(),
  action: z.string().max(40).optional(),
});
