import { z } from 'zod';
import { DELIVERY_MODES, SCHOLARSHIP_PUBLICATION, VERIFICATION_STATUS } from '../../types/enums.js';
import { parseCalendarDate } from '../../utils/dates.js';
import { paginationSchema } from '../../utils/pagination.js';
import { isSafeHttpUrl } from '../../utils/url.js';

export const EDUCATION_LEVELS = ['BACHELOR', 'MASTER', 'DOCTORATE', 'POSTDOC', 'VOCATIONAL', 'SHORT_COURSE', 'OTHER'] as const;
export const FUNDING_TYPES = ['FULL', 'PARTIAL', 'TUITION_ONLY', 'STIPEND', 'OTHER'] as const;
export const VALIDITY_FILTERS = ['open', 'upcoming', 'closed', 'unknown', 'all'] as const;

const TZ = 'Africa/Luanda';

/** Data de calendário 'YYYY-MM-DD' -> Date UTC-meia-noite. */
export const calendarDate = z
  .string()
  .trim()
  .refine((v) => parseCalendarDate(v, TZ) !== null, 'Data inválida (use AAAA-MM-DD).')
  .transform((v) => parseCalendarDate(v, TZ) as Date);

export const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(isSafeHttpUrl, 'URL inválido (apenas http/https, sem credenciais).');

const tag = z.string().trim().toLowerCase().min(2).max(80);
const textList = (max: number) => z.array(z.string().trim().min(1).max(300)).max(max);

export const scholarshipFields = z.object({
  title: z.string().trim().min(5).max(240),
  description: z.string().trim().min(20).max(20_000),
  sponsoringInstitution: z.string().trim().min(2).max(200),
  institutionCountry: z.string().trim().min(2).max(100).nullable().optional(),
  destinationCountry: z.string().trim().min(2).max(100),
  educationLevel: z.array(z.enum(EDUCATION_LEVELS)).min(1).max(7),
  studyAreas: z.array(tag).min(1).max(20),
  studyMode: z.enum(DELIVERY_MODES).nullable().optional(),
  fundingType: z.enum(FUNDING_TYPES),
  eligibilityCriteria: z.string().trim().max(10_000).nullable().optional(),
  requiredDocuments: textList(30).default([]),
  openingDate: calendarDate.nullable().optional(),
  applicationDeadline: calendarDate.nullable().optional(),
  officialUrl: httpUrl,
  externalId: z.string().trim().max(200).nullable().optional(),
});

const scholarshipBase = scholarshipFields.extend({
  // Fonte da informação (registo em ScholarshipSource)
  sourceId: z.uuid(),
  sourceUrl: httpUrl.optional(),
});

function datesCoherent(v: { openingDate?: Date | null; applicationDeadline?: Date | null }) {
  return !(v.openingDate && v.applicationDeadline && v.applicationDeadline < v.openingDate);
}
const dateMsg = { message: 'O prazo não pode ser anterior à data de abertura.', path: ['applicationDeadline'] };

export const createScholarshipSchema = scholarshipBase.strict().refine(datesCoherent, dateMsg);
export const updateScholarshipSchema = scholarshipBase
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Indique pelo menos um campo.')
  .refine(datesCoherent, dateMsg);

export const idParams = z.object({ id: z.uuid() });
export const idOrSlugParams = z.object({ idOrSlug: z.string().trim().min(3).max(260) });

const csv = <T extends z.ZodType<unknown, string>>(item: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(item).max(20));

export const SORTS = ['deadline_asc', 'deadline_desc', 'recent', 'title'] as const;

export const listScholarshipsQuery = paginationSchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  country: z.string().trim().min(2).max(100).optional(),
  institutionCountry: z.string().trim().min(2).max(100).optional(),
  level: csv(z.enum(EDUCATION_LEVELS)).optional(),
  area: csv(tag).optional(),
  mode: z.enum(DELIVERY_MODES).optional(),
  funding: z.enum(FUNDING_TYPES).optional(),
  state: z.enum(VALIDITY_FILTERS).default('open'),
  deadlineBefore: calendarDate.optional(),
  deadlineAfter: calendarDate.optional(),
  sort: z.enum(SORTS).default('deadline_asc'),
});

export const adminListScholarshipsQuery = listScholarshipsQuery.extend({
  state: z.enum(VALIDITY_FILTERS).default('all'),
  status: z.enum(SCHOLARSHIP_PUBLICATION).optional(),
  verification: z.enum(VERIFICATION_STATUS).optional(),
});

export const transitionSchema = z
  .object({ to: z.enum(['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED']) })
  .strict();

export const verifySchema = z
  .object({
    decision: z.enum(['VERIFIED', 'REJECTED', 'PENDING']),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();
