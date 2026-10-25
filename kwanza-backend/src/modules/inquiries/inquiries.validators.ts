import { z } from 'zod';
import { INQUIRY_STATUS } from '../../types/enums.js';
import { paginationSchema } from '../../utils/pagination.js';

export const createInquirySchema = z
  .object({
    mentorServiceId: z.uuid(),
    message: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export const updateInquiryStatusSchema = z.object({ status: z.enum(INQUIRY_STATUS).exclude(['NEW']) }).strict();

export const listInquiriesQuery = paginationSchema.extend({ status: z.enum(INQUIRY_STATUS).optional() });
export const idParams = z.object({ id: z.uuid() });
