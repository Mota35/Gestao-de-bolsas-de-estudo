import type { z } from 'zod';
import type { Db, Tx } from '../../db/prisma.js';
import { conflict, forbidden, invalidState, notFound } from '../../utils/errors.js';
import { pageArgs, pageMeta } from '../../utils/pagination.js';
import type { AuditService } from '../admin/audit.service.js';
import type { createReportSchema, listReportsQuery } from './reports.validators.js';

/** Denúncias de perfis e serviços (tabela `reports`, ver prisma/additions). */
export class ReportsService {
  constructor(private readonly deps: { db: Db; audit: AuditService }) {}

  /** Devolve o dono (userId) do alvo se existir e estiver visível publicamente; null caso contrário. */
  private async targetOwner(type: string, id: string): Promise<string | null> {
    const { db } = this.deps;
    if (type === 'MENTOR_PROFILE') {
      const p = await db.mentorProfile.findFirst({ where: { id, verificationStatus: 'VERIFIED' }, select: { userId: true } });
      return p?.userId ?? null;
    }
    const model: any = type === 'MENTOR_SERVICE' ? db.mentorService : db.course;
    const row = await model.findFirst({
      where: { id, publicationStatus: 'PUBLISHED' },
      select: { mentorProfile: { select: { userId: true } } },
    });
    return row?.mentorProfile.userId ?? null;
  }

  async create(reporterUserId: string, input: z.infer<typeof createReportSchema>) {
    const owner = await this.targetOwner(input.targetType, input.targetId);
    if (!owner) throw notFound('Conteúdo não encontrado.');
    if (owner === reporterUserId) throw forbidden('Não pode denunciar o seu próprio conteúdo.');

    const existing = await this.deps.db.report.findFirst({
      where: { reporterUserId, targetType: input.targetType, targetId: input.targetId, status: 'OPEN' },
      select: { id: true },
    });
    if (existing) throw conflict('Já denunciou este conteúdo; a denúncia está em análise.');

    const r = await this.deps.db.report.create({
      data: {
        reporterUserId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        details: input.details ?? null,
      },
    });
    return { id: r.id, status: r.status, createdAt: r.createdAt };
  }

  // -------------------------------------------------------------------- admin

  async list(q: z.infer<typeof listReportsQuery>) {
    const where = { ...(q.status ? { status: q.status } : {}), ...(q.targetType ? { targetType: q.targetType } : {}) };
    const [total, rows] = await Promise.all([
      this.deps.db.report.count({ where }),
      this.deps.db.report.findMany({ where, orderBy: { createdAt: 'asc' }, ...pageArgs(q) }),
    ]);
    return { items: rows, meta: pageMeta(q, total) };
  }

  async get(id: string) {
    const r = await this.deps.db.report.findUnique({ where: { id } });
    if (!r) throw notFound('Denúncia não encontrada.');
    return r;
  }

  async resolve(actorId: string, id: string, outcome: 'RESOLVED' | 'DISMISSED', note: string) {
    const { db, audit } = this.deps;
    await db.$transaction(async (tx: Tx) => {
      const res = await tx.report.updateMany({
        where: { id, status: 'OPEN' },
        data: { status: outcome, resolutionNote: note, resolvedById: actorId, resolvedAt: new Date() },
      });
      if (res.count !== 1) {
        const exists = await tx.report.findUnique({ where: { id }, select: { id: true } });
        throw exists ? invalidState('A denúncia já foi tratada.') : notFound('Denúncia não encontrada.');
      }
      await audit.record(
        { actorUserId: actorId, action: 'OTHER', entityType: 'OTHER', entityId: id, metadata: { report: outcome, note } },
        tx,
      );
    });
    return this.get(id);
  }
}
