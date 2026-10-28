import type { z } from 'zod';
import type { Db, Tx } from '../../db/prisma.js';
import type { MentorVerificationStatus } from '../../types/enums.js';
import { badRequest, invalidState, notFound } from '../../utils/errors.js';
import { pageArgs, pageMeta } from '../../utils/pagination.js';
import { toWaDigits } from '../../utils/phone.js';
import type { AuditService } from '../admin/audit.service.js';
import type { listMentorsQuery, reviewMentorSchema, updateMentorProfileSchema, adminListMentorsQuery } from './mentors.validators.js';

type UpdateInput = z.infer<typeof updateMentorProfileSchema>;
type ReviewInput = z.infer<typeof reviewMentorSchema>;

export interface WhatsappContact {
  e164: string;
  waDigits: string;
  url: string;
  urlWithMessage: string | null;
  suggestedMessage: string | null;
}

/** Dados para o frontend construir links wa.me. Devolve null se o mentor não autorizou a divulgação. */
export function publicWhatsapp(
  profile: { whatsappNumber: string | null; allowWhatsappPublic: boolean },
  message?: string,
): WhatsappContact | null {
  if (!profile.whatsappNumber || !profile.allowWhatsappPublic) return null;
  const waDigits = toWaDigits(profile.whatsappNumber);
  const url = `https://wa.me/${waDigits}`;
  return {
    e164: profile.whatsappNumber,
    waDigits,
    url,
    urlWithMessage: message ? `${url}?text=${encodeURIComponent(message)}` : null,
    suggestedMessage: message ?? null,
  };
}

const PUBLIC_USER = { select: { id: true, name: true, isActive: true } } as const;

const REVIEW_TRANSITIONS: Record<MentorVerificationStatus, MentorVerificationStatus[]> = {
  PENDING: ['VERIFIED', 'REJECTED', 'SUSPENDED'],
  VERIFIED: ['REJECTED', 'SUSPENDED'],
  REJECTED: ['VERIFIED', 'SUSPENDED'],
  SUSPENDED: ['VERIFIED', 'REJECTED'],
};

export class MentorsService {
  constructor(private readonly deps: { db: Db; audit: AuditService }) {}

  // ---------------------------------------------------------------- mapeamento

  /** Nunca inclui dados privados (número não autorizado, motivo de rejeição, revisor). */
  toPublic(p: any, opts: { includeServices?: boolean } = {}) {
    const prices = [...(p.services ?? []).map((s: any) => Number(s.price)), ...(p.courses ?? []).map((s: any) => Number(s.price))];
    return {
      id: p.id,
      name: p.user.name,
      headline: p.headline ?? p.specialties?.[0] ?? 'Mentor',
      location: p.location ?? '',
      modalities: p.modalities ?? [],
      availability: p.availabilitySchedule?.join(' · ') ?? '',
      availabilityNote: p.availabilityPeriod ?? undefined,
      photo: p.photoUrl ?? undefined,
      bio: p.bio ? [p.bio] : [],
      specialties: p.specialties,
      qualifications: p.qualifications,
      experienceYears: p.experienceYears,
      languages: p.languages,
      priceFrom: prices.length ? Math.min(...prices) : 0,
      // só é "verificado" após aprovação administrativa; as consultas públicas já só devolvem VERIFIED
      verified: p.verificationStatus === 'VERIFIED',
      whatsapp: publicWhatsapp(p),
      ...(opts.includeServices ? { services: p.services, courses: p.courses } : {}),
    };
  }

  toOwner(p: any) {
    return {
      id: p.id,
      name: p.user.name,
      title: p.headline ?? '',
      bio: p.bio,
      experience: p.experience ?? '',
      location: p.location ?? '',
      modalities: p.modalities ?? [],
      photo: p.photoUrl ?? undefined,
      availabilityPeriod: p.availabilityPeriod ?? '',
      schedule: p.availabilitySchedule ?? [],
      specialties: p.specialties,
      qualifications: p.qualifications,
      experienceYears: p.experienceYears,
      languages: p.languages,
      whatsappNumber: p.whatsappNumber,
      allowWhatsappPublic: p.allowWhatsappPublic,
      verificationStatus: p.verificationStatus,
      verified: p.verificationStatus === 'VERIFIED',
      rejectionReason: p.verificationStatus === 'REJECTED' ? p.rejectionReason : null,
      reviewedAt: p.reviewedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  // ------------------------------------------------------------------- público

  async listPublic(q: z.infer<typeof listMentorsQuery>) {
    const and: Record<string, unknown>[] = [{ verificationStatus: 'VERIFIED' }, { user: { isActive: true } }];
    if (q.specialty) and.push({ specialties: { has: q.specialty } });
    if (q.language) and.push({ languages: { has: q.language } });
    if (q.modality) and.push({ modalities: { has: q.modality === 'ONLINE' ? 'Online' : 'Presencial' } });
    if (q.maxPrice !== undefined) and.push({ OR: [
      { services: { some: { publicationStatus: 'PUBLISHED', price: { lte: q.maxPrice } } } },
      { courses: { some: { publicationStatus: 'PUBLISHED', price: { lte: q.maxPrice } } } },
    ] });
    if (q.availability) and.push({ availabilityPeriod: { contains: q.availability, mode: 'insensitive' } });
    if (q.q) {
      and.push({
        OR: [
          { user: { name: { contains: q.q, mode: 'insensitive' } } },
          { bio: { contains: q.q, mode: 'insensitive' } },
          { specialties: { has: q.q.toLowerCase() } },
        ],
      });
    }
    const where = { AND: and };
    const [total, rows] = await Promise.all([
      this.deps.db.mentorProfile.count({ where }),
      this.deps.db.mentorProfile.findMany({
        where,
        orderBy: [{ reviewedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: PUBLIC_USER,
          services: { where: { publicationStatus: 'PUBLISHED' }, take: 20 },
          courses: { where: { publicationStatus: 'PUBLISHED' }, take: 20 },
        },
        ...pageArgs(q),
      }),
    ]);
    return { items: rows.map((r: any) => this.toPublic(r, { includeServices: true })), meta: pageMeta(q, total) };
  }

  async getPublic(id: string) {
    const p = await this.deps.db.mentorProfile.findFirst({
      where: { id, verificationStatus: 'VERIFIED', user: { isActive: true } },
      include: {
        user: PUBLIC_USER,
        services: { where: { publicationStatus: 'PUBLISHED' }, orderBy: { createdAt: 'desc' } },
        courses: { where: { publicationStatus: 'PUBLISHED' }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!p) throw notFound('Mentor não encontrado.');
    p.services = p.services.map(({ mentorProfileId, ...s }: any) => ({ ...s, price: s.price.toString() }));
    p.courses = p.courses.map(({ mentorProfileId, ...c }: any) => ({ ...c, price: c.price.toString() }));
    return this.toPublic(p, { includeServices: true });
  }

  // ------------------------------------------------------------ próprio perfil

  private async ownProfile(userId: string) {
    const p = await this.deps.db.mentorProfile.findUnique({ where: { userId }, include: { user: PUBLIC_USER } });
    if (!p) throw notFound('Perfil de mentor não encontrado.');
    return p;
  }

  async getOwn(userId: string) {
    return this.toOwner(await this.ownProfile(userId));
  }

  async updateOwn(userId: string, input: UpdateInput) {
    const { db, audit } = this.deps;
    const current = await this.ownProfile(userId);

    const number = input.whatsappNumber === undefined ? current.whatsappNumber : input.whatsappNumber;
    // remover o número desliga sempre a divulgação pública
    const allow = input.whatsappNumber === null ? false : (input.allowWhatsappPublic ?? current.allowWhatsappPublic);
    if (allow && !number) {
      throw badRequest('Defina um número de WhatsApp antes de autorizar a divulgação pública.', [
        { field: 'body.allowWhatsappPublic', message: 'Requer whatsappNumber.' },
      ]);
    }
    // Se o número for removido, a divulgação é desligada.
    const { name, ...profileInput } = input;
    const data: Record<string, unknown> = { ...profileInput };
    if (input.whatsappNumber === null) data.allowWhatsappPublic = false;

    // Alterações às credenciais de um perfil verificado exigem nova revisão.
    const credentialsChanged =
      (input.qualifications !== undefined && JSON.stringify(input.qualifications) !== JSON.stringify(current.qualifications)) ||
      (input.experienceYears !== undefined && input.experienceYears !== current.experienceYears);
    const needsReview = current.verificationStatus === 'VERIFIED' && credentialsChanged;
    if (needsReview) data.verificationStatus = 'PENDING';

    const updated = await db.$transaction(async (tx: Tx) => {
      if (name && name !== current.user.name) await tx.user.update({ where: { id: userId }, data: { name } });
      const u = await tx.mentorProfile.update({ where: { id: current.id }, data, include: { user: PUBLIC_USER } });
      if (needsReview) {
        await audit.record(
          { actorUserId: userId, action: 'UPDATE', entityType: 'MENTOR_PROFILE', entityId: current.id, metadata: { reReviewRequired: true } },
          tx,
        );
      }
      return u;
    });
    return { ...this.toOwner(updated), reReviewRequired: needsReview };
  }

  async saveAvailability(userId: string, period: string, schedule: string[]) {
    const p = await this.ownProfile(userId);
    const updated = await this.deps.db.mentorProfile.update({
      where: { id: p.id }, data: { availabilityPeriod: period, availabilitySchedule: schedule }, include: { user: PUBLIC_USER },
    });
    return this.toOwner(updated);
  }

  async savePhoto(userId: string, photoData: string) {
    const p = await this.ownProfile(userId);
    const updated = await this.deps.db.mentorProfile.update({ where: { id: p.id }, data: { photoUrl: photoData }, include: { user: PUBLIC_USER } });
    return this.toOwner(updated);
  }

  /** Submete (ou re-submete após rejeição) o perfil para verificação administrativa. */
  async submitForVerification(userId: string) {
    const p = await this.ownProfile(userId);
    if (p.verificationStatus === 'VERIFIED') throw invalidState('O perfil já está verificado.');
    if (p.verificationStatus === 'SUSPENDED') throw invalidState('O perfil está suspenso. Contacte a administração.');
    const missing = this.completenessIssues(p);
    if (missing.length) throw badRequest('Perfil incompleto.', missing.map((m) => ({ field: m, message: 'Obrigatório para verificação.' })));
    if (p.verificationStatus === 'REJECTED') {
      await this.deps.db.mentorProfile.update({
        where: { id: p.id },
        data: { verificationStatus: 'PENDING', rejectionReason: null },
      });
    }
    return this.getOwn(userId);
  }

  private completenessIssues(p: { bio: string | null; specialties: string[] }): string[] {
    const issues: string[] = [];
    if (!p.bio || p.bio.trim().length < 30) issues.push('bio');
    if (!p.specialties.length) issues.push('specialties');
    return issues;
  }

  // -------------------------------------------------------------------- admin

  async listAdmin(q: z.infer<typeof adminListMentorsQuery>) {
    const and: Record<string, unknown>[] = [];
    if (q.status) and.push({ verificationStatus: q.status });
    if (q.q) and.push({ OR: [{ user: { name: { contains: q.q, mode: 'insensitive' } } }, { user: { email: { contains: q.q, mode: 'insensitive' } } }] });
    const where = and.length ? { AND: and } : {};
    const [total, rows] = await Promise.all([
      this.deps.db.mentorProfile.count({ where }),
      this.deps.db.mentorProfile.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true, email: true, emailVerifiedAt: true, isActive: true } } },
        ...pageArgs(q),
      }),
    ]);
    return {
      items: rows.map((r: any) => ({
        id: r.id,
        name: r.user.name,
        email: r.user.email,
        emailVerified: r.user.emailVerifiedAt !== null,
        verificationStatus: r.verificationStatus,
        specialties: r.specialties,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
      })),
      meta: pageMeta(q, total),
    };
  }

  async getAdmin(id: string) {
    const p = await this.deps.db.mentorProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true, emailVerifiedAt: true, isActive: true } } },
    });
    if (!p) throw notFound('Mentor não encontrado.');
    return { ...this.toOwner(p), email: p.user.email, emailVerified: p.user.emailVerifiedAt !== null, isActive: p.user.isActive, reviewedById: p.reviewedById };
  }

  async review(actorId: string, id: string, input: ReviewInput) {
    const { db, audit } = this.deps;
    const p = await db.mentorProfile.findUnique({ where: { id }, include: { user: true } });
    if (!p) throw notFound('Mentor não encontrado.');
    const from = p.verificationStatus as MentorVerificationStatus;
    const to = input.decision as MentorVerificationStatus;
    if (from === to) return this.getAdmin(id);
    if (!REVIEW_TRANSITIONS[from].includes(to)) throw invalidState(`Transição inválida: ${from} -> ${to}.`);

    if (to === 'VERIFIED') {
      const issues = this.completenessIssues(p);
      if (issues.length) throw invalidState(`Perfil incompleto (${issues.join(', ')}); não pode ser verificado.`);
      if (!p.user.emailVerifiedAt) throw invalidState('O email do mentor ainda não foi confirmado.');
    }

    await db.$transaction(async (tx: Tx) => {
      // condicional ao estado lido: duas revisões simultâneas não se sobrepõem
      const res = await tx.mentorProfile.updateMany({
        where: { id, verificationStatus: from },
        data: {
          verificationStatus: to,
          rejectionReason: to === 'VERIFIED' ? null : (input.reason ?? null),
          reviewedById: actorId,
          reviewedAt: new Date(),
        },
      });
      if (res.count !== 1) throw invalidState('O estado do mentor foi alterado entretanto.');
      await audit.record(
        {
          actorUserId: actorId,
          action: to === 'VERIFIED' ? 'VERIFY' : to === 'REJECTED' ? 'REJECT' : 'UNPUBLISH',
          entityType: 'MENTOR_PROFILE',
          entityId: id,
          metadata: { from, to, reason: input.reason },
        },
        tx,
      );
    });
    return this.getAdmin(id);
  }
}
