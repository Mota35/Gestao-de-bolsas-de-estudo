import { z } from 'zod';
import { MENTOR_VERIFICATION } from '../../types/enums.js';
import { normalizePhone } from '../../utils/phone.js';
import { paginationSchema } from '../../utils/pagination.js';

const tag = z.string().trim().toLowerCase().min(2).max(80);
const phone = z
  .string()
  .trim()
  .max(30)
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'Número de WhatsApp inválido. Use o formato internacional (ex.: +244 923 456 789).' });
      return z.NEVER;
    }
    return n;
  });

export const updateMentorProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    headline: z.string().trim().max(180).nullable().optional(),
    bio: z.string().trim().max(4000).nullable().optional(),
    experience: z.string().trim().max(4000).nullable().optional(),
    location: z.string().trim().max(160).nullable().optional(),
    modalities: z.array(z.string().trim().min(2).max(60)).max(10).optional(),
    specialties: z.array(tag).max(20).optional(),
    qualifications: z.array(z.string().trim().min(2).max(200)).max(20).optional(),
    experienceYears: z.number().int().min(0).max(70).nullable().optional(),
    languages: z.array(z.string().trim().min(2).max(60)).max(20).optional(),
    whatsappNumber: phone.nullable().optional(),
    allowWhatsappPublic: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Indique pelo menos um campo.');

export const availabilitySchema = z.object({
  period: z.string().trim().min(2).max(120),
  schedule: z.array(z.string().trim().min(1).max(300)).min(1).max(30),
}).strict();

export const photoSchema = z.object({
  photoData: z.string().regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).max(4_200_000),
}).strict();

export const listMentorsQuery = paginationSchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  specialty: tag.optional(),
  language: z.string().trim().min(2).max(60).optional(),
  modality: z.enum(['ONLINE', 'IN_PERSON']).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  availability: z.string().trim().min(1).max(120).optional(),
});

export const adminListMentorsQuery = paginationSchema.extend({
  status: z.enum(MENTOR_VERIFICATION).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

export const reviewMentorSchema = z
  .object({
    decision: z.enum(['VERIFIED', 'REJECTED', 'SUSPENDED']),
    reason: z.string().trim().min(5).max(1000).optional(),
  })
  .strict()
  .refine((v) => v.decision === 'VERIFIED' || Boolean(v.reason), {
    message: 'Indique o motivo ao rejeitar ou suspender.',
    path: ['reason'],
  });

export const idParams = z.object({ id: z.uuid() });
