import { z } from 'zod';
import { CONTENT_PUBLICATION, DELIVERY_MODES, SERVICE_CATEGORIES } from '../../types/enums.js';
import { paginationSchema } from '../../utils/pagination.js';
import { isSafeHttpUrl } from '../../utils/url.js';

export const SUPPORTED_CURRENCIES = ['AOA', 'USD', 'EUR', 'GBP', 'BRL', 'ZAR'] as const;

const price = z
  .number()
  .min(0)
  .max(99_999_999.99)
  .refine((n) => Math.round(n * 100) / 100 === n, 'No máximo 2 casas decimais.');

const common = {
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().min(20).max(8000),
  price,
  currency: z.enum(SUPPORTED_CURRENCIES).default('AOA'),
  durationMinutes: z.number().int().min(5).max(100_000).nullable().optional(),
  mode: z.enum(DELIVERY_MODES),
  availability: z.string().trim().max(500).nullable().optional(),
  conditions: z.string().trim().max(4000).nullable().optional(),
  place: z.string().trim().max(180).nullable().optional(),
  showWhatsApp: z.boolean().default(false),
};

export const createServiceSchema = z
  .object({
    ...common,
    category: z.enum(SERVICE_CATEGORIES),
    requirements: z.string().trim().max(4000).nullable().optional(),
  })
  .strict();

export const createCourseSchema = z
  .object({
    ...common,
    category: z.string().trim().min(2).max(120),
    enrollmentUrl: z
      .string()
      .trim()
      .max(2048)
      .refine(isSafeHttpUrl, 'URL inválido (apenas http/https).')
      .nullable()
      .optional(),
  })
  .strict();

// Em actualizações o default da moeda não deve sobrescrever o valor existente.
const makePartial = <T extends z.ZodObject>(s: T) =>
  s.partial().refine((v) => Object.keys(v).length > 0, 'Indique pelo menos um campo.');
export const updateServiceSchema = makePartial(
  createServiceSchema.extend({ currency: z.enum(SUPPORTED_CURRENCIES) }),
);
export const updateCourseSchema = makePartial(
  createCourseSchema.extend({ currency: z.enum(SUPPORTED_CURRENCIES) }),
);

export const ownerStatusSchema = z.object({ to: z.enum(['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED']) }).strict();

export const idParams = z.object({ id: z.uuid() });

const listBase = paginationSchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  mode: z.enum(DELIVERY_MODES).optional(),
  mentorId: z.uuid().optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['recent', 'price_asc', 'price_desc']).default('recent'),
});

const priceNeedsCurrency = (v: { minPrice?: number; maxPrice?: number; currency?: string }) =>
  (v.minPrice === undefined && v.maxPrice === undefined) || v.currency !== undefined;
const priceMsg = { message: 'Indique a moeda ao filtrar por preço.', path: ['currency'] };
const priceRange = (v: { minPrice?: number; maxPrice?: number }) =>
  v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice;

export const listServicesQuery = listBase
  .extend({ category: z.enum(SERVICE_CATEGORIES).optional() })
  .refine(priceNeedsCurrency, priceMsg)
  .refine(priceRange, { message: 'minPrice não pode exceder maxPrice.', path: ['minPrice'] });

export const listCoursesQuery = listBase
  .extend({ category: z.string().trim().min(2).max(120).optional() })
  .refine(priceNeedsCurrency, priceMsg)
  .refine(priceRange, { message: 'minPrice não pode exceder maxPrice.', path: ['minPrice'] });

export const mineQuery = paginationSchema.extend({ status: z.enum(CONTENT_PUBLICATION).optional() });

export const moderateSchema = z
  .object({
    action: z.enum(['UNPUBLISH', 'ARCHIVE', 'RESTORE']),
    reason: z.string().trim().min(5).max(1000),
  })
  .strict();

export const moderationParams = z.object({ kind: z.enum(['service', 'course']), id: z.uuid() });
