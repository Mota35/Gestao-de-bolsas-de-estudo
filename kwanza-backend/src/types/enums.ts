/**
 * Espelho dos enums do schema Prisma como uniões de strings.
 * Mantém o código independente do cliente gerado e é validado em tempo de execução com Zod.
 */
export const USER_ROLES = ['STUDENT', 'MENTOR', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const MENTOR_VERIFICATION = ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'] as const;
export type MentorVerificationStatus = (typeof MENTOR_VERIFICATION)[number];

export const SCHOLARSHIP_PUBLICATION = ['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED'] as const;
export type ScholarshipPublicationStatus = (typeof SCHOLARSHIP_PUBLICATION)[number];

export const VERIFICATION_STATUS = ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUS)[number];

export const DELIVERY_MODES = ['ONLINE', 'IN_PERSON', 'HYBRID'] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

export const SERVICE_CATEGORIES = [
  'APPLICATION_SUPPORT', 'CAREER_GUIDANCE', 'STUDY_ABROAD', 'LANGUAGE_TEST',
  'PREPARATION', 'ACADEMIC_MENTORSHIP', 'OTHER',
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const CONTENT_PUBLICATION = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'] as const;
export type ContentPublicationStatus = (typeof CONTENT_PUBLICATION)[number];

export const INQUIRY_STATUS = ['NEW', 'CONTACTED', 'IN_DISCUSSION', 'ACCEPTED', 'DECLINED', 'CLOSED'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUS)[number];

/** Estado de validade calculado (não existe coluna: deriva das datas e do fuso horário). */
export type ScholarshipValidity = 'UPCOMING' | 'OPEN' | 'CLOSED' | 'UNKNOWN';
