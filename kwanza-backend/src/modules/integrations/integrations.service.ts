import { randomBytes } from 'node:crypto';
import type { Logger } from 'pino';
import type { z } from 'zod';
import type { AppConfig } from '../../config/index.js';
import type { Db, Tx } from '../../db/prisma.js';
import type { ConnectorRegistry } from '../../integrations/scholarships/registry.js';
import {
  candidateSchema,
  IntegrationUnavailableError,
  type Candidate,
  type ScholarshipConnector,
} from '../../integrations/scholarships/types.js';
import { AppError, badRequest, invalidState, notFound } from '../../utils/errors.js';
import { formatCalendarDate } from '../../utils/dates.js';
import { hostMatches, hostOf, slugify } from '../../utils/url.js';
import type { AuditService } from '../admin/audit.service.js';
import type { ScholarshipsService } from '../scholarships/scholarships.service.js';
import type { createScholarshipSchema } from '../scholarships/scholarships.validators.js';
import type { createSourceSchema, updateSourceSchema } from './integrations.validators.js';

type ManualInput = Omit<z.infer<typeof createScholarshipSchema>, 'sourceId' | 'sourceUrl'> & { sourceUrl?: string };

/** Campos comparados entre a bolsa guardada e o candidato externo. */
const COMPARED_FIELDS = [
  'title', 'description', 'sponsoringInstitution', 'institutionCountry', 'destinationCountry',
  'educationLevel', 'studyAreas', 'studyMode', 'fundingType', 'eligibilityCriteria',
  'requiredDocuments', 'openingDate', 'applicationDeadline', 'officialUrl',
] as const;

type Field = (typeof COMPARED_FIELDS)[number];

function comparable(field: Field, value: unknown): unknown {
  if (value instanceof Date) return formatCalendarDate(value);
  if (value === undefined) return null;
  if (Array.isArray(value)) return [...value].sort();
  return value;
}

export function diffCandidate(existing: Record<string, unknown>, candidate: Candidate): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const f of COMPARED_FIELDS) {
    const from = comparable(f, existing[f]);
    const to = comparable(f, (candidate as Record<string, unknown>)[f]);
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      diff[f] = { from: existing[f] instanceof Date ? formatCalendarDate(existing[f] as Date) : existing[f] ?? null, to: to };
    }
  }
  return diff;
}

/** Converte o candidato em dados persistíveis (datas string -> Date). */
function candidateToData(c: Candidate) {
  const { externalId, sourceUrl, ...rest } = c;
  void sourceUrl;
  return { ...rest, externalId };
}

export interface ImportStats {
  received: number;
  created: number;
  updatedDrafts: number;
  pendingReview: number;
  unchanged: number;
  invalid: number;
  rejectedDomain: number;
}

export class IntegrationsService {
  private running = new Set<string>();

  constructor(
    private readonly deps: {
      config: AppConfig;
      db: Db;
      logger: Logger;
      audit: AuditService;
      registry: ConnectorRegistry;
      scholarships: ScholarshipsService;
    },
  ) {}

  // ------------------------------------------------------------------ fontes

  async listSources() {
    return this.deps.db.scholarshipSource.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async createSource(actorId: string, input: z.infer<typeof createSourceSchema>) {
    const domain = hostOf(input.officialUrl);
    const source = await this.deps.db.scholarshipSource.create({
      data: {
        name: input.name,
        officialUrl: input.officialUrl,
        domain,
        sourceType: input.sourceType,
        collectionMethod: input.collectionMethod,
        // uma fonte nasce desactivada para importação automática
        integrationStatus: 'DISABLED',
      },
    });
    await this.deps.audit.record({
      actorUserId: actorId, action: 'CREATE', entityType: 'SCHOLARSHIP_SOURCE', entityId: source.id,
      metadata: { name: source.name, domain },
    });
    return source;
  }

  async updateSource(actorId: string, id: string, input: z.infer<typeof updateSourceSchema>) {
    const existing = await this.deps.db.scholarshipSource.findUnique({ where: { id } });
    if (!existing) throw notFound('Fonte não encontrada.');
    const data: Record<string, unknown> = { ...input };
    if (input.officialUrl) data.domain = hostOf(input.officialUrl);
    const source = await this.deps.db.scholarshipSource.update({ where: { id }, data });
    await this.deps.audit.record({
      actorUserId: actorId, action: 'UPDATE', entityType: 'SCHOLARSHIP_SOURCE', entityId: id, metadata: { fields: Object.keys(input) },
    });
    return source;
  }

  // -------------------------------------------------------------- conectores

  private connectorOrThrow(key: string): ScholarshipConnector {
    const c = this.deps.registry.get(key);
    if (!c) throw notFound('Integração não encontrada.');
    return c;
  }

  private async sourceFor(connector: ScholarshipConnector) {
    return this.deps.db.scholarshipSource.findFirst({
      where: { domain: { in: [...connector.allowedDomains] } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listConnectors() {
    const out = [];
    for (const c of this.deps.registry.list()) {
      const source = await this.sourceFor(c);
      out.push({
        key: c.key,
        displayName: c.displayName,
        allowedDomains: c.allowedDomains,
        capabilities: c.capabilities,
        configured: c.isConfigured(),
        source: source
          ? { id: source.id, integrationStatus: source.integrationStatus, lastCollectedAt: source.lastCollectedAt }
          : null,
      });
    }
    return out;
  }

  // -------------------------------------------------------- introdução manual

  /** Introdução manual de uma bolsa da fonte do conector (fica DRAFT/UNVERIFIED até validação). */
  async manualEntry(actorId: string, key: string, input: ManualInput) {
    const connector = this.connectorOrThrow(key);
    const source = await this.sourceFor(connector);
    if (!source) {
      throw invalidState(`Registe primeiro a fonte "${connector.displayName}" (POST /admin/sources) com o domínio ${connector.allowedDomains[0]}.`);
    }
    const host = hostOf(input.officialUrl);
    if (!host || !connector.allowedDomains.some((d) => hostMatches(host, d))) {
      throw badRequest(`O link oficial tem de pertencer a ${connector.allowedDomains.join(', ')}.`, [
        { field: 'body.officialUrl', message: 'Domínio não corresponde à fonte.' },
      ]);
    }
    return this.deps.scholarships.create(actorId, { ...input, sourceId: source.id } as never);
  }

  // ---------------------------------------------------------------- importação

  async runImport(actorId: string, key: string) {
    const { db, audit, logger, config } = this.deps;
    const connector = this.connectorOrThrow(key);
    const source = await this.sourceFor(connector);
    if (!source) {
      throw invalidState(`Registe primeiro a fonte "${connector.displayName}" antes de importar.`);
    }
    if (!connector.capabilities.automaticImport) {
      throw new AppError(
        503,
        'INTEGRATION_UNAVAILABLE',
        'Não existe integração automática autorizada para esta fonte. Use a introdução manual.',
      );
    }
    if (this.running.has(source.id)) throw invalidState('Já existe uma importação em curso para esta fonte.');
    this.running.add(source.id);

    const stats: ImportStats = {
      received: 0, created: 0, updatedDrafts: 0, pendingReview: 0, unchanged: 0, invalid: 0, rejectedDomain: 0,
    };
    const errors: { index: number; message: string }[] = [];
    try {
      let raw: unknown[];
      try {
        raw = await connector.fetchRaw();
      } catch (err) {
        await db.scholarshipSource.update({ where: { id: source.id }, data: { integrationStatus: 'FAILED' } });
        await audit.record({
          actorUserId: actorId, action: 'OTHER', entityType: 'SCHOLARSHIP_SOURCE', entityId: source.id,
          metadata: { import: 'failed', reason: err instanceof Error ? err.message : 'unknown' },
        });
        logger.warn({ err, source: key }, 'Importação falhou');
        const message = err instanceof IntegrationUnavailableError ? err.message : 'Falha ao contactar a fonte externa.';
        throw new AppError(502, 'INTEGRATION_UNAVAILABLE', message);
      }

      stats.received = raw.length;
      for (const [index, item] of raw.entries()) {
        try {
          const parsed = candidateSchema.safeParse(item);
          if (!parsed.success) {
            stats.invalid++;
            if (errors.length < 20) errors.push({ index, message: parsed.error.issues[0]?.message ?? 'inválido' });
            continue;
          }
          const c = parsed.data;
          const host = hostOf(c.officialUrl);
          if (!host || !connector.allowedDomains.some((d) => hostMatches(host, d))) {
            stats.rejectedDomain++;
            continue;
          }
          await this.processCandidate(source.id, c, stats);
        } catch (err) {
          // um item problemático não interrompe os restantes
          stats.invalid++;
          logger.error({ err, index }, 'Erro ao processar item importado');
        }
      }

      await db.scholarshipSource.update({
        where: { id: source.id },
        data: { integrationStatus: 'ACTIVE', lastCollectedAt: new Date() },
      });
      await audit.record({
        actorUserId: actorId, action: 'OTHER', entityType: 'SCHOLARSHIP_SOURCE', entityId: source.id,
        metadata: { import: 'completed', ...stats },
      });
      void config;
      return { stats, errors };
    } finally {
      this.running.delete(source.id);
    }
  }

  private async processCandidate(sourceId: string, c: Candidate, stats: ImportStats): Promise<void> {
    const { db } = this.deps;
    const now = new Date();
    const payload = {
      collectedAt: now.toISOString(),
      candidate: JSON.parse(JSON.stringify(c)),
    };

    const link = await db.scholarshipSourceLink.findFirst({
      where: { sourceId, externalId: c.externalId, status: 'ACTIVE' },
      include: { scholarship: true },
    });

    if (!link) {
      // Evita duplicados quando a bolsa já existe (mesmo link oficial) mas sem ligação a esta fonte.
      const sameUrl = await db.scholarship.findFirst({ where: { officialUrl: c.officialUrl }, select: { id: true } });
      if (sameUrl) {
        await db.scholarshipSourceLink.upsert({
          where: { scholarshipId_sourceId_sourceUrl: { scholarshipId: sameUrl.id, sourceId, sourceUrl: c.sourceUrl ?? c.officialUrl } },
          create: {
            scholarshipId: sameUrl.id, sourceId, sourceUrl: c.sourceUrl ?? c.officialUrl,
            externalId: c.externalId, importedAt: now, lastSeenAt: now, sourcePayload: payload,
          },
          update: { externalId: c.externalId, lastSeenAt: now, sourcePayload: payload },
        });
        stats.unchanged++;
        return;
      }
      await db.$transaction(async (tx: Tx) => {
        const data = candidateToData(c);
        const slug = `${slugify(c.title) || 'bolsa'}-${randomBytes(3).toString('hex')}`;
        const s = await tx.scholarship.create({
          // dados externos nunca nascem publicados nem verificados
          data: { ...data, slug, publicationStatus: 'DRAFT', verificationStatus: 'UNVERIFIED' },
        });
        await tx.scholarshipSourceLink.create({
          data: {
            scholarshipId: s.id, sourceId, sourceUrl: c.sourceUrl ?? c.officialUrl,
            externalId: c.externalId, importedAt: now, lastSeenAt: now, sourcePayload: payload,
          },
        });
      });
      stats.created++;
      return;
    }

    const s = link.scholarship;
    const diff = diffCandidate(s, c);
    const hasDiff = Object.keys(diff).length > 0;

    if (!hasDiff) {
      await db.scholarshipSourceLink.update({
        where: { id: link.id },
        data: { lastSeenAt: now, sourcePayload: { ...payload, pendingChanges: null } },
      });
      stats.unchanged++;
      return;
    }

    const protectedRecord = s.verificationStatus === 'VERIFIED' || s.publicationStatus === 'PUBLISHED' || s.publicationStatus === 'IN_REVIEW';
    if (protectedRecord) {
      // Dados validados não são substituídos: guardamos as diferenças para revisão administrativa.
      await db.scholarshipSourceLink.update({
        where: { id: link.id },
        data: { lastSeenAt: now, sourcePayload: { ...payload, pendingChanges: diff } as any },
      });
      stats.pendingReview++;
      return;
    }

    // Rascunho não verificado: pode ser actualizado directamente.
    await db.$transaction(async (tx: Tx) => {
      const { externalId, ...data } = candidateToData(c);
      void externalId;
      await tx.scholarship.update({ where: { id: s.id }, data });
      await tx.scholarshipSourceLink.update({
        where: { id: link.id },
        data: { lastSeenAt: now, sourcePayload: { ...payload, pendingChanges: null } },
      });
    });
    stats.updatedDrafts++;
  }

  // ------------------------------------------------------ revisão administrativa

  async listPendingChanges(scholarshipId: string) {
    const links = await this.deps.db.scholarshipSourceLink.findMany({
      where: { scholarshipId, status: 'ACTIVE' },
      include: { source: { select: { id: true, name: true } } },
    });
    return links
      .filter((l: any) => l.sourcePayload?.pendingChanges)
      .map((l: any) => ({
        linkId: l.id,
        source: l.source,
        collectedAt: l.sourcePayload.collectedAt,
        changes: l.sourcePayload.pendingChanges,
      }));
  }

  private async pendingLink(scholarshipId: string, linkId: string) {
    const link = await this.deps.db.scholarshipSourceLink.findFirst({ where: { id: linkId, scholarshipId } });
    if (!link || !(link.sourcePayload as any)?.pendingChanges) throw notFound('Não existem alterações pendentes.');
    return link;
  }

  /** Aplica as alterações externas. A bolsa volta a revisão e perde a verificação. */
  async applyPendingChanges(actorId: string, scholarshipId: string, linkId: string) {
    const { db, audit } = this.deps;
    const link = await this.pendingLink(scholarshipId, linkId);
    const candidate = candidateSchema.parse((link.sourcePayload as any).candidate);
    const { externalId, ...data } = candidateToData(candidate);
    void externalId;
    const payload = link.sourcePayload as any;
    const changes = payload.pendingChanges;

    await db.$transaction(async (tx: Tx) => {
      await tx.scholarship.update({
        where: { id: scholarshipId },
        data: { ...data, publicationStatus: 'IN_REVIEW', verificationStatus: 'PENDING', verifiedAt: null, verifiedById: null },
      });
      await tx.scholarshipSourceLink.update({
        where: { id: linkId },
        data: { sourcePayload: { ...(link.sourcePayload as any), pendingChanges: null } },
      });
      await audit.record(
        { actorUserId: actorId, action: 'UPDATE', entityType: 'SCHOLARSHIP', entityId: scholarshipId, metadata: { appliedFromSource: link.sourceId, changes } },
        tx,
      );
    });
    return this.deps.scholarships.getAdmin(scholarshipId);
  }

  async dismissPendingChanges(actorId: string, scholarshipId: string, linkId: string) {
    const { db, audit } = this.deps;
    const link = await this.pendingLink(scholarshipId, linkId);
    await db.scholarshipSourceLink.update({
      where: { id: linkId },
      data: { sourcePayload: { ...(link.sourcePayload as any), pendingChanges: null } },
    });
    await audit.record({
      actorUserId: actorId, action: 'OTHER', entityType: 'SCHOLARSHIP', entityId: scholarshipId,
      metadata: { dismissedSourceChanges: (link.sourcePayload as any).pendingChanges },
    });
  }
}
