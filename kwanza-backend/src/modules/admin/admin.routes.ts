import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../db/prisma.js';
import type { AuthMiddlewares } from '../../middlewares/auth.js';
import { getQuery, validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { forbidden, notFound } from '../../utils/errors.js';
import { pageArgs, pageMeta, paginationSchema } from '../../utils/pagination.js';
import type { AuditService } from './audit.service.js';
import type { CatalogService } from '../catalog/catalog.service.js';
import * as cv from '../catalog/catalog.validators.js';
import type { ReportsService } from '../reports/reports.service.js';
import * as rv from '../reports/reports.validators.js';
import { auditQuery } from '../integrations/integrations.validators.js';

export function createAdminRoutes(deps: {
  db: Db;
  audit: AuditService;
  catalog: CatalogService;
  reports: ReportsService;
  mw: AuthMiddlewares;
}) {
  const { db, audit, catalog, reports, mw } = deps;
  const r = Router();
  r.use(mw.requireAuth, mw.requireRole('ADMIN'));

  r.get('/overview', asyncHandler(async (_req, res) => {
    const [users, students, mentors, totalScholarships, openScholarships, expiredScholarships, pendingMentors, pendingReports,
      pendingRows, actions, scholarships, services, courses] = await Promise.all([
      db.user.count(), db.user.count({ where: { role: 'STUDENT' } }), db.user.count({ where: { role: 'MENTOR' } }),
      db.scholarship.count(), db.scholarship.count({ where: { publicationStatus: 'PUBLISHED', applicationDeadline: { gte: new Date() } } }),
      db.scholarship.count({ where: { publicationStatus: 'PUBLISHED', applicationDeadline: { lt: new Date() } } }),
      db.mentorProfile.count({ where: { verificationStatus: 'PENDING' } }), db.report.count({ where: { status: 'OPEN' } }),
      db.mentorProfile.findMany({ where: { verificationStatus: 'PENDING' }, select: { id: true, createdAt: true, user: { select: { name: true } } }, take: 5, orderBy: { createdAt: 'asc' } }),
      db.auditLog.findMany({ where: { occurredAt: { gte: new Date(Date.now() - 28 * 86400000) } }, select: { occurredAt: true } }),
      db.scholarship.count({ where: { publicationStatus: 'PUBLISHED' } }), db.mentorService.count({ where: { publicationStatus: 'PUBLISHED' } }), db.course.count({ where: { publicationStatus: 'PUBLISHED' } }),
    ]);
    const weekly = Array.from({ length: 4 }, (_, i) => {
      const from = new Date(Date.now() - (4 - i) * 7 * 86400000);
      const to = new Date(from.getTime() + 7 * 86400000);
      return { label: `Sem. ${i + 1}`, value: actions.filter((a: any) => a.occurredAt >= from && a.occurredAt < to).length };
    });
    const pending = pendingRows.map((m: any) => ({ type: 'Mentor', resource: m.user.name, date: m.createdAt, state: 'PENDING', next: 'Rever perfil' }));
    res.json({ data: { users: { total: users, students, mentors }, scholarships: { total: totalScholarships, open: openScholarships, expired: expiredScholarships }, pendingMentors, pendingReports, weekly, content: [{ label: 'Bolsas publicadas', value: scholarships }, { label: 'Serviços publicados', value: services }, { label: 'Cursos publicados', value: courses }], pending } });
  }));

  // ---- moderação de serviços e cursos
  const kindParam = z.object({ kind: z.enum(['services', 'courses']) });
  const toKind = (k: string) => (k === 'services' ? 'service' : 'course') as 'service' | 'course';
  r.get('/catalog/:kind', validate({ params: kindParam, query: cv.mineQuery }), asyncHandler(async (req, res) => {
    const { items, meta } = await catalog.listAdmin(toKind(String(req.params.kind)), getQuery(req));
    res.json({ data: items, meta });
  }));
  r.post('/catalog/:kind/:id/moderate', validate({ params: kindParam.extend({ id: z.uuid() }), body: cv.moderateSchema }), asyncHandler(async (req, res) => {
    const data = await catalog.moderate(req.user!.id, toKind(String(req.params.kind)), String(req.params.id), req.body.action, req.body.reason);
    res.json({ data });
  }));

  // ---- denúncias
  r.get('/reports', validate({ query: rv.listReportsQuery }), asyncHandler(async (req, res) => {
    const { items, meta } = await reports.list(getQuery(req));
    res.json({ data: items, meta });
  }));
  r.get('/reports/:id', validate({ params: rv.idParams }), asyncHandler(async (req, res) => {
    res.json({ data: await reports.get(String(req.params.id)) });
  }));
  r.post('/reports/:id/resolve', validate({ params: rv.idParams, body: rv.resolveReportSchema }), asyncHandler(async (req, res) => {
    res.json({ data: await reports.resolve(req.user!.id, String(req.params.id), req.body.outcome, req.body.note) });
  }));
  r.post('/reports/:id/request-info', validate({ params: rv.idParams, body: z.object({ note: z.string().trim().min(3).max(1000) }).strict() }), asyncHandler(async (req, res) => {
    const report = await db.report.findUnique({ where: { id: String(req.params.id) } });
    if (!report) throw notFound('Denúncia não encontrada.');
    let userId: string | null = null;
    if (report.targetType === 'MENTOR_PROFILE') userId = (await db.mentorProfile.findUnique({ where: { id: report.targetId }, select: { userId: true } }))?.userId ?? null;
    else if (report.targetType === 'MENTOR_SERVICE') userId = (await db.mentorService.findUnique({ where: { id: report.targetId }, select: { mentorProfile: { select: { userId: true } } } }))?.mentorProfile.userId ?? null;
    else userId = (await db.course.findUnique({ where: { id: report.targetId }, select: { mentorProfile: { select: { userId: true } } } }))?.mentorProfile.userId ?? null;
    if (!userId) throw notFound('Responsável pelo conteúdo não encontrado.');
    await db.notification.create({ data: { userId, type: 'OTHER', title: 'Pedido de esclarecimento', message: req.body.note } });
    await audit.record({ actorUserId: req.user!.id, action: 'OTHER', entityType: 'OTHER', entityId: report.id, metadata: { action: 'request-info' } });
    res.status(202).json({ data: { message: 'Pedido enviado ao mentor.' } });
  }));

  // ---- utilizadores
  r.get('/users', validate({ query: paginationSchema.extend({ role: z.enum(['STUDENT', 'MENTOR', 'ADMIN']).optional(), q: z.string().trim().max(100).optional() }) }), asyncHandler(async (req, res) => {
    const q = getQuery<{ page: number; pageSize: number; role?: string; q?: string }>(req);
    const where: Record<string, unknown> = {
      ...(q.role ? { role: q.role } : {}),
      ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { email: { contains: q.q, mode: 'insensitive' } }] } : {}),
    };
    const [total, rows] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where, orderBy: { createdAt: 'desc' }, ...pageArgs(q),
        select: { id: true, name: true, email: true, role: true, isActive: true, emailVerifiedAt: true, createdAt: true },
      }),
    ]);
    res.json({ data: rows, meta: pageMeta(q, total) });
  }));

  // Desactivar/reactivar conta (revoga todas as sessões ao desactivar). Não permite auto-bloqueio.
  r.patch('/users/:id/active', validate({ params: z.object({ id: z.uuid() }), body: z.object({ isActive: z.boolean() }).strict() }), asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    if (id === req.user!.id) {
      res.status(409).json({ error: { code: 'INVALID_STATE', message: 'Não pode desactivar a própria conta.', requestId: req.id } });
      return;
    }
    const target = await db.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) throw notFound('Utilizador não encontrado.');
    await db.$transaction(async (tx: any) => {
      await tx.user.update({ where: { id }, data: { isActive: req.body.isActive } });
      if (!req.body.isActive) await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await audit.record({ actorUserId: req.user!.id, action: 'UPDATE', entityType: 'USER', entityId: id, metadata: { isActive: req.body.isActive } }, tx);
    });
    res.status(204).end();
  }));

  r.patch('/users/:id/role', validate({
    params: z.object({ id: z.uuid() }),
    body: z.object({ role: z.enum(['STUDENT', 'MENTOR', 'ADMIN']), isActive: z.boolean(), reason: z.string().trim().min(5).max(1000) }).strict(),
  }), asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    if (id === req.user!.id) throw forbidden('Não pode alterar o próprio papel ou estado.');
    const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
    if (!target) throw notFound('Utilizador não encontrado.');
    await db.$transaction(async (tx: any) => {
      await tx.user.update({ where: { id }, data: { role: req.body.role, isActive: req.body.isActive } });
      if (!req.body.isActive) await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await audit.record({ actorUserId: req.user!.id, action: 'ROLE_CHANGE', entityType: 'USER', entityId: id, metadata: { fromRole: target.role, toRole: req.body.role, fromActive: target.isActive, toActive: req.body.isActive, reason: req.body.reason } }, tx);
    });
    res.status(204).end();
  }));

  // ---- auditoria (só leitura)
  r.get('/audit-logs', validate({ query: auditQuery }), asyncHandler(async (req, res) => {
    const q = getQuery<{ page: number; pageSize: number; actorUserId?: string; entityType?: string; entityId?: string; action?: string }>(req);
    const where: Record<string, unknown> = {
      ...(q.actorUserId ? { actorUserId: q.actorUserId } : {}),
      ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.entityId ? { entityId: q.entityId } : {}),
      ...(q.action ? { action: q.action } : {}),
    };
    const [total, rows] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({ where, orderBy: { occurredAt: 'desc' }, include: { actor: { select: { name: true, email: true } } }, ...pageArgs(q) }),
    ]);
    res.json({ data: rows, meta: pageMeta(q, total) });
  }));
  return r;
}
