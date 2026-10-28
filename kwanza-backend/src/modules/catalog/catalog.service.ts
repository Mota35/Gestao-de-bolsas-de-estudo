import { randomBytes } from 'node:crypto';
import type { Db, Tx } from '../../db/prisma.js';
import type { ContentPublicationStatus } from '../../types/enums.js';
import { badRequest, forbidden, invalidState, notFound } from '../../utils/errors.js';
import { pageArgs, pageMeta } from '../../utils/pagination.js';
import { slugify } from '../../utils/url.js';
import type { AuditService } from '../admin/audit.service.js';
import { publicWhatsapp } from '../mentors/mentors.service.js';

export type CatalogKind = 'service' | 'course';

const MODEL = { service: 'mentorService', course: 'course' } as const;
const ENTITY = { service: 'MENTOR_SERVICE', course: 'COURSE' } as const;

// Transições do próprio mentor. ARCHIVED é terminal para o mentor: serve também de remoção
// por moderação, que o mentor não pode reverter.
const OWNER_TRANSITIONS: Record<ContentPublicationStatus, ContentPublicationStatus[]> = {
  DRAFT: ['PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['DRAFT', 'UNPUBLISHED', 'ARCHIVED'],
  UNPUBLISHED: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
  ARCHIVED: [],
};

const MENTOR_SELECT = {
  select: {
    id: true,
    verificationStatus: true,
    whatsappNumber: true,
    allowWhatsappPublic: true,
    headline: true,
    location: true,
    modalities: true,
    availabilityPeriod: true,
    availabilitySchedule: true,
    user: { select: { id: true, name: true, isActive: true, emailVerifiedAt: true } },
  },
} as const;

export class CatalogService {
  constructor(private readonly deps: { db: Db; audit: AuditService }) {}

  private model(kind: CatalogKind): any {
    return (this.deps.db as any)[MODEL[kind]];
  }

  // ---------------------------------------------------------------- mapeamento

  private dto(kind: CatalogKind, row: any, opts: { withMentor?: boolean } = {}) {
    const { mentorProfileId, mentorProfile, price, ...rest } = row;
    const out: Record<string, unknown> = { ...rest, price: price.toString() };
    if (opts.withMentor && mentorProfile) {
      out.mentor = {
        id: mentorProfile.id,
        name: mentorProfile.user.name,
        verified: mentorProfile.verificationStatus === 'VERIFIED',
        headline: mentorProfile.headline,
        location: mentorProfile.location,
        modalities: mentorProfile.modalities,
        availability: mentorProfile.availabilitySchedule.join(' · '),
        availabilityNote: mentorProfile.availabilityPeriod,
        whatsapp: publicWhatsapp(
          mentorProfile,
          `Olá! Tenho interesse em "${row.title}" que vi na Kwanza Oportunidades.`,
        ),
      };
    }
    return out;
  }

  // ------------------------------------------------------------------- público

  private publicWhere(kind: CatalogKind, q: any) {
    const and: Record<string, unknown>[] = [
      { publicationStatus: 'PUBLISHED' },
      // um mentor não verificado/suspenso nunca aparece como oferta pública
      { mentorProfile: { verificationStatus: 'VERIFIED', user: { isActive: true } } },
    ];
    if (q.q) {
      and.push({
        OR: [
          { title: { contains: q.q, mode: 'insensitive' } },
          { description: { contains: q.q, mode: 'insensitive' } },
        ],
      });
    }
    if (q.category) {
      and.push({ category: kind === 'course' ? { equals: q.category, mode: 'insensitive' } : q.category });
    }
    if (q.mode) and.push({ mode: q.mode });
    if (q.mentorId) and.push({ mentorProfileId: q.mentorId });
    if (q.currency) and.push({ currency: q.currency });
    if (q.minPrice !== undefined) and.push({ price: { gte: q.minPrice } });
    if (q.maxPrice !== undefined) and.push({ price: { lte: q.maxPrice } });
    return { AND: and };
  }

  private orderBy(sort: string) {
    if (sort === 'price_asc') return [{ price: 'asc' }, { createdAt: 'desc' }];
    if (sort === 'price_desc') return [{ price: 'desc' }, { createdAt: 'desc' }];
    return [{ createdAt: 'desc' }];
  }

  async listPublic(kind: CatalogKind, q: any) {
    const where = this.publicWhere(kind, q);
    const [total, rows] = await Promise.all([
      this.model(kind).count({ where }),
      this.model(kind).findMany({
        where,
        orderBy: this.orderBy(q.sort),
        include: { mentorProfile: MENTOR_SELECT },
        ...pageArgs(q),
      }),
    ]);
    return { items: rows.map((r: any) => this.dto(kind, r, { withMentor: true })), meta: pageMeta(q, total) };
  }

  async getPublic(kind: CatalogKind, id: string) {
    const row = await this.model(kind).findFirst({
      where: { AND: [...this.publicWhere(kind, {}).AND, { id }] },
      include: { mentorProfile: MENTOR_SELECT },
    });
    if (!row) throw notFound('Não encontrado.');
    return this.dto(kind, row, { withMentor: true });
  }

  // -------------------------------------------------------------------- mentor

  private async ownProfile(userId: string) {
    const p = await this.deps.db.mentorProfile.findUnique({ where: { userId }, ...MENTOR_SELECT });
    if (!p) throw notFound('Perfil de mentor não encontrado.');
    return p;
  }

  /** Localiza um item do próprio mentor; itens de outros mentores respondem 404 (não revela a existência). */
  private async ownItem(kind: CatalogKind, userId: string, id: string) {
    const row = await this.model(kind).findFirst({
      where: { id, mentorProfile: { userId } },
      include: { mentorProfile: MENTOR_SELECT },
    });
    if (!row) throw notFound('Não encontrado.');
    return row;
  }

  async listMine(kind: CatalogKind, userId: string, q: { page: number; pageSize: number; status?: string }) {
    const profile = await this.ownProfile(userId);
    const where = { mentorProfileId: profile.id, ...(q.status ? { publicationStatus: q.status } : {}) };
    const [total, rows] = await Promise.all([
      this.model(kind).count({ where }),
      this.model(kind).findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q) }),
    ]);
    return { items: rows.map((r: any) => this.dto(kind, r)), meta: pageMeta(q, total) };
  }

  async getMine(kind: CatalogKind, userId: string, id: string) {
    return this.dto(kind, await this.ownItem(kind, userId, id));
  }

  private async uniqueServiceSlug(tx: Tx, mentorProfileId: string, title: string): Promise<string> {
    const base = slugify(title) || 'servico';
    for (let i = 0; i < 5; i++) {
      const slug = i === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
      const exists = await tx.mentorService.findUnique({
        where: { mentorProfileId_slug: { mentorProfileId, slug } },
        select: { id: true },
      });
      if (!exists) return slug;
    }
    throw badRequest('Não foi possível gerar um identificador único.');
  }

  async create(kind: CatalogKind, userId: string, input: Record<string, any>) {
    const profile = await this.ownProfile(userId);
    // O mentor pode preparar rascunhos mesmo antes da verificação; só a publicação exige aprovação.
    const row = await this.deps.db.$transaction(async (tx: Tx) => {
      const data: Record<string, unknown> = { ...input, mentorProfileId: profile.id, publicationStatus: 'DRAFT' };
      if (kind === 'service') data.slug = await this.uniqueServiceSlug(tx, profile.id, input.title);
      return (tx as any)[MODEL[kind]].create({ data });
    });
    return this.dto(kind, row);
  }

  async update(kind: CatalogKind, userId: string, id: string, input: Record<string, any>) {
    const item = await this.ownItem(kind, userId, id);
    if (item.publicationStatus === 'ARCHIVED') throw invalidState('Itens arquivados não podem ser editados.');
    const row = await this.model(kind).update({ where: { id }, data: input });
    return this.dto(kind, row);
  }

  async changeStatus(kind: CatalogKind, userId: string, id: string, to: ContentPublicationStatus) {
    const item = await this.ownItem(kind, userId, id);
    const from = item.publicationStatus as ContentPublicationStatus;
    if (from === to) return this.dto(kind, item);
    if (!OWNER_TRANSITIONS[from].includes(to)) throw invalidState(`Transição inválida: ${from} -> ${to}.`);

    if (to === 'PUBLISHED') {
      const m = item.mentorProfile;
      if (m.verificationStatus !== 'VERIFIED') {
        throw forbidden('O seu perfil de mentor ainda não foi aprovado pela administração.');
      }
      if (!m.user.emailVerifiedAt) throw forbidden('Confirme o seu email antes de publicar.');
      if (!m.user.isActive) throw forbidden('Conta desactivada.');
    }
    const res = await this.model(kind).updateMany({ where: { id, publicationStatus: from }, data: { publicationStatus: to } });
    if (res.count !== 1) throw invalidState('O estado foi alterado entretanto. Tente novamente.');
    return this.getMine(kind, userId, id);
  }

  // ---------------------------------------------------------------- moderação

  async listAdmin(kind: CatalogKind, q: { page: number; pageSize: number; status?: string }) {
    const where = q.status ? { publicationStatus: q.status } : {};
    const [total, rows] = await Promise.all([
      this.model(kind).count({ where }),
      this.model(kind).findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { mentorProfile: MENTOR_SELECT },
        ...pageArgs(q),
      }),
    ]);
    return { items: rows.map((r: any) => this.dto(kind, r, { withMentor: true })), meta: pageMeta(q, total) };
  }

  /** Moderação administrativa. ARCHIVE = remoção que o mentor não consegue reverter. */
  async moderate(
    actorId: string,
    kind: CatalogKind,
    id: string,
    action: 'UNPUBLISH' | 'ARCHIVE' | 'RESTORE',
    reason: string,
  ) {
    const { audit } = this.deps;
    const row = await this.model(kind).findUnique({ where: { id } });
    if (!row) throw notFound('Não encontrado.');
    const from = row.publicationStatus as ContentPublicationStatus;
    const to: ContentPublicationStatus = action === 'UNPUBLISH' ? 'UNPUBLISHED' : action === 'ARCHIVE' ? 'ARCHIVED' : 'UNPUBLISHED';
    if (action === 'RESTORE' && from !== 'ARCHIVED') throw invalidState('Só itens arquivados podem ser restaurados.');
    if (action === 'UNPUBLISH' && from !== 'PUBLISHED') throw invalidState('O item não está publicado.');

    await this.deps.db.$transaction(async (tx: Tx) => {
      await (tx as any)[MODEL[kind]].update({ where: { id }, data: { publicationStatus: to } });
      await audit.record(
        {
          actorUserId: actorId,
          action: action === 'RESTORE' ? 'UPDATE' : 'UNPUBLISH',
          entityType: ENTITY[kind],
          entityId: id,
          metadata: { moderation: action, from, to, reason },
        },
        tx,
      );
    });
    return this.dto(kind, await this.model(kind).findUnique({ where: { id } }));
  }
}
