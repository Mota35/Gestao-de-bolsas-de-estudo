import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { buildConfig } from '../src/config/index.js';
import { createDb, type Db } from '../src/db/prisma.js';
import { InMemoryMailer } from '../src/integrations/mail/mailer.js';
import { ConnectorRegistry } from '../src/integrations/scholarships/registry.js';
import { InagbeConnector } from '../src/integrations/scholarships/inagbe.connector.js';
import type { ScholarshipConnector } from '../src/integrations/scholarships/types.js';
import { PasswordHasher } from '../src/utils/password.js';
import { createLogger } from '../src/utils/logger.js';

export const ORIGIN = 'http://localhost:5173';
export const PASSWORD = 'SenhaSegura123';

export interface Ctx {
  app: ReturnType<typeof createApp>['app'];
  authService: ReturnType<typeof createApp>['authService'];
  db: Db;
  mailer: InMemoryMailer;
  config: ReturnType<typeof buildConfig>;
  close(): Promise<void>;
}

export function createCtx(
  overrides: Record<string, string> = {},
  opts: { connectors?: ScholarshipConnector[] } = {},
): Ctx {
  const config = buildConfig({ ...process.env, ...overrides });
  // PRISMA_PG_ADAPTER=1: cliente gerado sem engine nativo (ambientes sem acesso aos binários do Prisma)
  const db = createDb(
    config.databaseUrl,
    process.env.PRISMA_PG_ADAPTER === '1' ? new PrismaPg({ connectionString: config.databaseUrl }) : undefined,
  );
  const mailer = new InMemoryMailer();
  const logger = createLogger('silent', false);
  const registry = new ConnectorRegistry(opts.connectors ?? [new InagbeConnector(config.integrations)]);
  const { app, authService } = createApp({ config, db, logger, mailer, registry });
  return { app, authService, db, mailer, config, close: async () => { await authService.drain(); await db.$disconnect(); } };
}

export async function resetDb(db: Db): Promise<void> {
  await db.$executeRawUnsafe(
    `TRUNCATE users, student_profiles, mentor_profiles, scholarships, scholarship_sources, scholarship_source_links,
     scholarship_favorites, mentor_services, courses, mentorship_inquiries, password_reset_tokens,
     email_verification_tokens, refresh_tokens, notifications, audit_logs, applications, reports CASCADE`,
  );
}

/** Cria utilizador directamente na BD (para ADMIN, que não pode ser criado pela API). */
export async function insertUser(
  ctx: Ctx,
  data: { email: string; role: 'STUDENT' | 'MENTOR' | 'ADMIN'; name?: string; verified?: boolean; password?: string },
) {
  const hash = await new PasswordHasher(ctx.config.argon2).hash(data.password ?? PASSWORD);
  const user = await ctx.db.user.create({
    data: {
      email: data.email,
      name: data.name ?? data.email.split('@')[0]!,
      passwordHash: hash,
      role: data.role,
      emailVerifiedAt: data.verified === false ? null : new Date(),
    },
  });
  if (data.role === 'STUDENT') await ctx.db.studentProfile.create({ data: { userId: user.id } });
  if (data.role === 'MENTOR') {
    await ctx.db.mentorProfile.create({
      data: { userId: user.id, bio: 'Mentor com larga experiência em candidaturas internacionais.', specialties: ['candidaturas'] },
    });
  }
  return user;
}

/** Faz login e devolve um agente supertest com os cookies de sessão (Origin autorizada). */
export async function loginAgent(ctx: Ctx, email: string, password = PASSWORD) {
  const agent = request.agent(ctx.app);
  const res = await agent.post('/api/v1/auth/login').set('Origin', ORIGIN).send({ email, password });
  if (res.status !== 200) throw new Error(`login falhou: ${res.status} ${JSON.stringify(res.body)}`);
  return {
    get: (url: string) => agent.get(url).set('Origin', ORIGIN),
    post: (url: string) => agent.post(url).set('Origin', ORIGIN),
    patch: (url: string) => agent.patch(url).set('Origin', ORIGIN),
    put: (url: string) => agent.put(url).set('Origin', ORIGIN),
    delete: (url: string) => agent.delete(url).set('Origin', ORIGIN),
    raw: agent,
    cookies: (res.headers['set-cookie'] as unknown as string[]) ?? [],
  };
}

export const anon = (ctx: Ctx) => request(ctx.app);

/** Extrai o token do link enviado por email. */
export function tokenFromMail(text: string): string {
  const m = /[?&]token=([A-Za-z0-9_%-]+)/.exec(text);
  if (!m) throw new Error('token não encontrado no email');
  return decodeURIComponent(m[1]!);
}

let seq = 0;
export async function insertSource(ctx: Ctx, domain = 'inagbe.gov.ao') {
  return ctx.db.scholarshipSource.create({
    data: { name: `Fonte ${++seq}`, officialUrl: `https://${domain}/`, domain, sourceType: 'GOVERNMENT' },
  });
}

export function scholarshipPayload(sourceId: string, over: Record<string, unknown> = {}) {
  return {
    title: `Bolsa de Mestrado em Engenharia ${++seq}`,
    description: 'Bolsa integral para estudantes angolanos em engenharia.',
    sponsoringInstitution: 'Universidade de Lisboa',
    institutionCountry: 'Portugal',
    destinationCountry: 'Portugal',
    educationLevel: ['MASTER'],
    studyAreas: ['engenharia'],
    fundingType: 'FULL',
    openingDate: '2020-01-01',
    applicationDeadline: '2099-12-31',
    officialUrl: `https://exemplo.pt/bolsa-${seq}`,
    sourceId,
    ...over,
  };
}

/** Cria bolsa via API de admin e publica-a (verify -> mark-checked já feito no verify -> publish). */
export async function createPublishedScholarship(
  admin: Awaited<ReturnType<typeof loginAgent>>,
  sourceId: string,
  over: Record<string, unknown> = {},
) {
  const created = await admin.post('/api/v1/admin/scholarships').send(scholarshipPayload(sourceId, over));
  if (created.status !== 201) throw new Error(`create falhou: ${JSON.stringify(created.body)}`);
  const id = created.body.data.id as string;
  await admin.post(`/api/v1/admin/scholarships/${id}/verify`).send({ decision: 'VERIFIED' }).expect(200);
  await admin.post(`/api/v1/admin/scholarships/${id}/transition`).send({ to: 'IN_REVIEW' }).expect(200);
  const pub = await admin.post(`/api/v1/admin/scholarships/${id}/transition`).send({ to: 'PUBLISHED' });
  if (pub.status !== 200) throw new Error(`publish falhou: ${JSON.stringify(pub.body)}`);
  return pub.body.data as { id: string; slug: string };
}

/** Mentor verificado com número WhatsApp (autorizado ou não). */
export async function insertVerifiedMentor(
  ctx: Ctx,
  email: string,
  opts: { whatsapp?: string; publicWhatsapp?: boolean } = {},
) {
  const user = await insertUser(ctx, { email, role: 'MENTOR' });
  const profile = await ctx.db.mentorProfile.update({
    where: { userId: user.id },
    data: {
      verificationStatus: 'VERIFIED',
      whatsappNumber: opts.whatsapp ?? null,
      allowWhatsappPublic: opts.publicWhatsapp ?? false,
    },
  });
  return { user, profile };
}
