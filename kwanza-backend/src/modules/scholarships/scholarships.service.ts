import { randomBytes } from 'node:crypto';
import type { z } from 'zod';
import type { AppConfig } from '../../config/index.js';
import type { Db, Tx } from '../../db/prisma.js';
import { isUniqueViolation } from '../../db/prisma.js';
import type { ScholarshipPublicationStatus, ScholarshipValidity, VerificationStatus } from '../../types/enums.js';
import { formatCalendarDate } from '../../utils/dates.js';
import { badRequest, invalidState, notFound } from '../../utils/errors.js';
import { pageArgs, pageMeta } from '../../utils/pagination.js';
import { slugify } from '../../utils/url.js';
import type { AuditService } from '../admin/audit.service.js';
import { computeValidity, daysRemaining, todayIn } from './validity.js';
import type {
  adminListScholarshipsQuery,
  createScholarshipSchema,
  listScholarshipsQuery,
  updateScholarshipSchema,
} from './scholarships.validators.js';

type ListQuery = z.infer<typeof listScholarshipsQuery>;
type AdminListQuery = z.infer<typeof adminListScholarshipsQuery>;
type CreateInput = z.infer<typeof createScholarshipSchema>;
type UpdateInput = z.infer<typeof updateScholarshipSchema>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const INCLUDE_SOURCE = {
  sourceLinks: {
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    take: 1,
    include: { source: { select: { id: true, name: true, officialUrl: true, domain: true, sourceType: true } } },
  },
} as const;

// Transições permitidas (pelo administrador). EXPIRED não existe como estado: é calculado.
const TRANSITIONS: Record<ScholarshipPublicationStatus, ScholarshipPublicationStatus[]> = {
  DRAFT: ['IN_REVIEW', 'ARCHIVED'],
  IN_REVIEW: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['DRAFT', 'ARCHIVED'],
  ARCHIVED: ['DRAFT'],
};

export class ScholarshipsService {
  constructor(
    private readonly deps: { config: AppConfig; db: Db; audit: AuditService },
  ) {}

  private today(): Date {
    return todayIn(this.deps.config.defaultTimezone);
  }

  // ---------------------------------------------------------------- mapeamento

  toDto(row: any, opts: { admin?: boolean; favoriteIds?: Set<string> } = {}) {
    const today = this.today();
    const validity: ScholarshipValidity = computeValidity(row, today);
    const link = row.sourceLinks?.[0];
    const staleMs = this.deps.config.scholarshipStaleDays * 86_400_000;
    const checkedAt: Date | null = row.sourceLastCheckedAt ?? null;
    const dto: Record<string, unknown> = {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      sponsoringInstitution: row.sponsoringInstitution,
      institutionCountry: row.institutionCountry,
      destinationCountry: row.destinationCountry,
      educationLevel: row.educationLevel,
      studyAreas: row.studyAreas,
      studyMode: row.studyMode,
      fundingType: row.fundingType,
      eligibilityCriteria: row.eligibilityCriteria,
      requiredDocuments: row.requiredDocuments,
      openingDate: formatCalendarDate(row.openingDate),
      applicationDeadline: formatCalendarDate(row.applicationDeadline),
      deadlineTimezone: this.deps.config.defaultTimezone,
      officialUrl: row.officialUrl,
      source: link
        ? { id: link.source.id, name: link.source.name, url: link.sourceUrl, domain: link.source.domain, type: link.source.sourceType }
        : null,
      sourceLastCheckedAt: checkedAt,
      verification: {
        status: row.verificationStatus,
        verifiedAt: row.verifiedAt,
        // dados não reverificados há muito tempo não devem ser tratados como actuais
        isStale: !checkedAt || Date.now() - checkedAt.getTime() > staleMs,
      },
      validity,
      isOpen: validity === 'OPEN',
      daysRemaining: validity === 'OPEN' ? daysRemaining(row.applicationDeadline, today) : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    if (opts.favoriteIds) dto.isFavorite = opts.favoriteIds.has(row.id);
    if (opts.admin) {
      dto.publicationStatus = row.publicationStatus;
      dto.externalId = row.externalId;
      dto.verifiedById = row.verifiedById;
    }
    return dto;
  }

  // ------------------------------------------------------------------- filtros

  private buildWhere(q: ListQuery, base: Record<string, unknown>) {
    const today = this.today();
    const and: Record<string, unknown>[] = [base];

    if (q.q) {
      const t = q.q;
      and.push({
        OR: [
          { title: { contains: t, mode: 'insensitive' } },
          { sponsoringInstitution: { contains: t, mode: 'insensitive' } },
          { description: { contains: t, mode: 'insensitive' } },
          { studyAreas: { has: t.toLowerCase() } },
        ],
      });
    }
    if (q.country) and.push({ destinationCountry: { equals: q.country, mode: 'insensitive' } });
    if (q.institutionCountry) and.push({ institutionCountry: { equals: q.institutionCountry, mode: 'insensitive' } });
    if (q.level?.length) and.push({ educationLevel: { hasSome: q.level } });
    if (q.area?.length) and.push({ studyAreas: { hasSome: q.area } });
    if (q.mode) and.push({ studyMode: q.mode });
    if (q.funding) and.push({ fundingType: q.funding });
    if (q.deadlineBefore) and.push({ applicationDeadline: { lte: q.deadlineBefore } });
    if (q.deadlineAfter) and.push({ applicationDeadline: { gte: q.deadlineAfter } });

    // Estado de validade calculado em tempo de consulta (independente de jobs).
    const notUpcoming = { OR: [{ openingDate: null }, { openingDate: { lte: today } }] };
    switch (q.state) {
      case 'open':
        and.push(notUpcoming, { applicationDeadline: { gte: today } });
        break;
      case 'upcoming':
        and.push({ openingDate: { gt: today } });
        break;
      case 'closed':
        and.push(notUpcoming, { applicationDeadline: { lt: today } });
        break;
      case 'unknown':
        and.push(notUpcoming, { applicationDeadline: null });
        break;
      default:
        break;
    }
    return { AND: and };
  }

  private orderBy(sort: ListQuery['sort']): any {
    switch (sort) {
      case 'deadline_desc':
        return [{ applicationDeadline: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
      case 'recent':
        return [{ createdAt: 'desc' }];
      case 'title':
        return [{ title: 'asc' }];
      default:
        return [{ applicationDeadline: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }];
    }
  }

  // ------------------------------------------------------------------- público

  async listPublic(q: ListQuery, userId?: string) {
    const where = this.buildWhere(q, { publicationStatus: 'PUBLISHED' });
    const [total, rows] = await Promise.all([
      this.deps.db.scholarship.count({ where }),
      this.deps.db.scholarship.findMany({
        where,
        orderBy: this.orderBy(q.sort),
        include: INCLUDE_SOURCE,
        ...pageArgs(q),
      }),
    ]);
    const favoriteIds = userId ? await this.favoriteIdsAmong(userId, rows.map((r: any) => r.id)) : undefined;
    return { items: rows.map((r: any) => this.toDto(r, { favoriteIds })), meta: pageMeta(q, total) };
  }

  async getPublic(idOrSlug: string, userId?: string) {
    const row = await this.deps.db.scholarship.findFirst({
      where: { publicationStatus: 'PUBLISHED', ...(UUID_RE.test(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug }) },
      include: INCLUDE_SOURCE,
    });
    if (!row) throw notFound('Bolsa não encontrada.');
    const favoriteIds = userId ? await this.favoriteIdsAmong(userId, [row.id]) : undefined;
    return this.toDto(row, { favoriteIds });
  }

  private async favoriteIdsAmong(userId: string, scholarshipIds: string[]): Promise<Set<string>> {
    if (!scholarshipIds.length) return new Set();
    const favs = await this.deps.db.scholarshipFavorite.findMany({
      where: { userId, scholarshipId: { in: scholarshipIds } },
      select: { scholarshipId: true },
    });
    return new Set(favs.map((f: { scholarshipId: string }) => f.scholarshipId));
  }

  // ----------------------------------------------------------------- favoritos

  async addFavorite(userId: string, scholarshipId: string): Promise<void> {
    const s = await this.deps.db.scholarship.findFirst({
      where: { id: scholarshipId, publicationStatus: 'PUBLISHED' },
      select: { id: true },
    });
    if (!s) throw notFound('Bolsa não encontrada.');
    // upsert torna a operação idempotente e segura contra pedidos concorrentes
    await this.deps.db.scholarshipFavorite.upsert({
      where: { userId_scholarshipId: { userId, scholarshipId } },
      create: { userId, scholarshipId },
      update: {},
    });
  }

  async removeFavorite(userId: string, scholarshipId: string): Promise<void> {
    await this.deps.db.scholarshipFavorite.deleteMany({ where: { userId, scholarshipId } });
  }

  async listFavorites(userId: string, page: { page: number; pageSize: number }) {
    const where: any = { userId, scholarship: { publicationStatus: 'PUBLISHED' } };
    const [total, rows] = await Promise.all([
      this.deps.db.scholarshipFavorite.count({ where }),
      this.deps.db.scholarshipFavorite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { scholarship: { include: INCLUDE_SOURCE } },
        ...pageArgs(page),
      }),
    ]);
    const favoriteIds = new Set<string>(rows.map((r: any) => r.scholarshipId));
    return {
      items: rows.map((r: any) => ({ savedAt: r.createdAt, scholarship: this.toDto(r.scholarship, { favoriteIds }) })),
      meta: pageMeta(page, total),
    };
  }

  // -------------------------------------------------------------------- admin

  async listAdmin(q: AdminListQuery) {
    const base: Record<string, unknown> = {};
    if (q.status) base.publicationStatus = q.status;
    if (q.verification) base.verificationStatus = q.verification;
    const where = this.buildWhere(q, base);
    const [total, rows] = await Promise.all([
      this.deps.db.scholarship.count({ where }),
      this.deps.db.scholarship.findMany({ where, orderBy: this.orderBy(q.sort), include: INCLUDE_SOURCE, ...pageArgs(q) }),
    ]);
    return { items: rows.map((r: any) => this.toDto(r, { admin: true })), meta: pageMeta(q, total) };
  }

  async getAdmin(id: string) {
    const row = await this.deps.db.scholarship.findUnique({ where: { id }, include: INCLUDE_SOURCE });
    if (!row) throw notFound('Bolsa não encontrada.');
    return this.toDto(row, { admin: true });
  }

  private async uniqueSlug(tx: Tx, title: string): Promise<string> {
    const base = slugify(title) || 'bolsa';
    for (let i = 0; i < 5; i++) {
      const slug = `${base}-${randomBytes(3).toString('hex')}`;
      const exists = await tx.scholarship.findUnique({ where: { slug }, select: { id: true } });
      if (!exists) return slug;
    }
    throw badRequest('Não foi possível gerar um identificador único.');
  }

  async create(actorId: string, input: CreateInput) {
    const { db, audit } = this.deps;
    const source = await db.scholarshipSource.findUnique({ where: { id: input.sourceId } });
    if (!source) throw badRequest('Fonte de informação inexistente.', [{ field: 'body.sourceId', message: 'Fonte inexistente.' }]);

    const { sourceId, sourceUrl, ...data } = input;
    try {
      const created = await db.$transaction(async (tx: Tx) => {
        const slug = await this.uniqueSlug(tx, data.title);
        const s = await tx.scholarship.create({
          data: {
            ...data,
            slug,
            publicationStatus: 'DRAFT',
            verificationStatus: 'UNVERIFIED',
          },
        });
        await tx.scholarshipSourceLink.create({
          data: {
            scholarshipId: s.id,
            sourceId,
            sourceUrl: sourceUrl ?? data.officialUrl,
            externalId: data.externalId ?? null,
            importedAt: null,
            lastSeenAt: new Date(),
          },
        });
        await audit.record(
          { actorUserId: actorId, action: 'CREATE', entityType: 'SCHOLARSHIP', entityId: s.id, metadata: { title: s.title, sourceId } },
          tx,
        );
        return s;
      });
      return this.getAdmin(created.id);
    } catch (err) {
      if (isUniqueViolation(err)) throw badRequest('Já existe uma bolsa com este identificador externo.');
      throw err;
    }
  }

  async update(actorId: string, id: string, input: UpdateInput) {
    const { db, audit } = this.deps;
    const existing = await db.scholarship.findUnique({ where: { id } });
    if (!existing) throw notFound('Bolsa não encontrada.');

    const { sourceId, sourceUrl, ...data } = input;
    // regista apenas os campos realmente alterados (valor anterior/novo)
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [k, v] of Object.entries(data)) {
      const from = (existing as Record<string, unknown>)[k];
      if (JSON.stringify(from) !== JSON.stringify(v)) changes[k] = { from, to: v };
    }

    await db.$transaction(async (tx: Tx) => {
      if (Object.keys(data).length) await tx.scholarship.update({ where: { id }, data });
      if (sourceId) {
        const source = await tx.scholarshipSource.findUnique({ where: { id: sourceId } });
        if (!source) throw badRequest('Fonte de informação inexistente.');
        await tx.scholarshipSourceLink.updateMany({
          where: { scholarshipId: id, status: 'ACTIVE' },
          data: { status: 'SUPERSEDED' },
        });
        await tx.scholarshipSourceLink.upsert({
          where: { scholarshipId_sourceId_sourceUrl: { scholarshipId: id, sourceId, sourceUrl: sourceUrl ?? data.officialUrl ?? existing.officialUrl } },
          create: { scholarshipId: id, sourceId, sourceUrl: sourceUrl ?? data.officialUrl ?? existing.officialUrl, lastSeenAt: new Date() },
          update: { status: 'ACTIVE', lastSeenAt: new Date() },
        });
        changes.sourceId = { from: null, to: sourceId };
      }
      await audit.record(
        { actorUserId: actorId, action: 'UPDATE', entityType: 'SCHOLARSHIP', entityId: id, metadata: { changes } },
        tx,
      );
    });
    return this.getAdmin(id);
  }

  /** Marca que a informação foi reverificada na fonte oficial agora. */
  async markChecked(actorId: string, id: string) {
    const res = await this.deps.db.scholarship.updateMany({ where: { id }, data: { sourceLastCheckedAt: new Date() } });
    if (res.count === 0) throw notFound('Bolsa não encontrada.');
    await this.deps.audit.record({ actorUserId: actorId, action: 'UPDATE', entityType: 'SCHOLARSHIP', entityId: id, metadata: { checked: true } });
    return this.getAdmin(id);
  }

  async verify(actorId: string, id: string, decision: VerificationStatus, note?: string) {
    const { db, audit } = this.deps;
    const existing = await db.scholarship.findUnique({ where: { id } });
    if (!existing) throw notFound('Bolsa não encontrada.');
    const approved = decision === 'VERIFIED';
    await db.$transaction(async (tx: Tx) => {
      await tx.scholarship.update({
        where: { id },
        data: {
          verificationStatus: decision,
          verifiedById: approved ? actorId : null,
          verifiedAt: approved ? new Date() : null,
          // verificar implica ter consultado a fonte agora
          ...(approved ? { sourceLastCheckedAt: new Date() } : {}),
          // uma bolsa publicada que deixa de estar verificada sai de publicação
          ...(!approved && existing.publicationStatus === 'PUBLISHED' ? { publicationStatus: 'DRAFT' } : {}),
        },
      });
      await audit.record(
        {
          actorUserId: actorId,
          action: approved ? 'VERIFY' : 'REJECT',
          entityType: 'SCHOLARSHIP',
          entityId: id,
          metadata: { decision, note },
        },
        tx,
      );
    });
    return this.getAdmin(id);
  }

  async transition(actorId: string, id: string, to: ScholarshipPublicationStatus) {
    const { db, audit } = this.deps;
    const s = await db.scholarship.findUnique({ where: { id } });
    if (!s) throw notFound('Bolsa não encontrada.');
    const from = s.publicationStatus as ScholarshipPublicationStatus;
    if (from === to) return this.getAdmin(id);
    if (!TRANSITIONS[from].includes(to)) throw invalidState(`Transição inválida: ${from} -> ${to}.`);

    if (to === 'PUBLISHED') {
      if (s.verificationStatus !== 'VERIFIED') throw invalidState('Só é possível publicar bolsas verificadas.');
      if (!s.sourceLastCheckedAt) throw invalidState('Registe a data da última verificação da fonte antes de publicar.');
      if (computeValidity(s, this.today()) === 'CLOSED') {
        throw invalidState('O prazo desta bolsa já terminou; não pode ser publicada como oportunidade.');
      }
    }

    // actualização condicional: evita corridas entre dois administradores
    const res = await db.scholarship.updateMany({
      where: { id, publicationStatus: from },
      data: { publicationStatus: to },
    });
    if (res.count !== 1) throw invalidState('O estado da bolsa foi alterado entretanto. Tente novamente.');
    await audit.record({
      actorUserId: actorId,
      action: to === 'PUBLISHED' ? 'PUBLISH' : to === 'ARCHIVED' || from === 'PUBLISHED' ? 'UNPUBLISH' : 'UPDATE',
      entityType: 'SCHOLARSHIP',
      entityId: id,
      metadata: { from, to },
    });
    return this.getAdmin(id);
  }
}
