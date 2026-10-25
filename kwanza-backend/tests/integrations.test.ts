import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { InagbeConnector } from '../src/integrations/scholarships/inagbe.connector.js';
import { fetchJsonLimited } from '../src/integrations/scholarships/safeFetch.js';
import { IntegrationUnavailableError, type ScholarshipConnector } from '../src/integrations/scholarships/types.js';
import { createCtx, insertSource, insertUser, loginAgent, resetDb, scholarshipPayload } from './helpers.js';

/** Conector de teste com feed controlável (simula uma fonte autorizada). */
class FakeConnector implements ScholarshipConnector {
  readonly key = 'inagbe';
  readonly displayName = 'Fake INAGBE';
  readonly allowedDomains = ['inagbe.gov.ao'] as const;
  capabilities = { automaticImport: true, manualEntry: true };
  feed: unknown[] = [];
  fail: Error | null = null;
  isConfigured() { return true; }
  async fetchRaw() { if (this.fail) throw this.fail; return this.feed; }
}

const fake = new FakeConnector();
const ctx = createCtx({}, { connectors: [fake] });
let admin: Awaited<ReturnType<typeof loginAgent>>;

const item = (over: Record<string, unknown> = {}) => {
  const { sourceId, ...rest } = scholarshipPayload('x');
  void sourceId;
  return { ...rest, externalId: 'EXT-1', officialUrl: 'https://inagbe.gov.ao/bolsa-1', ...over };
};

beforeEach(async () => {
  await resetDb(ctx.db);
  fake.feed = []; fake.fail = null;
  await insertUser(ctx, { email: 'admin@exemplo.com', role: 'ADMIN' });
  admin = await loginAgent(ctx, 'admin@exemplo.com');
  await insertSource(ctx, 'inagbe.gov.ao');
});
afterAll(() => ctx.close());

describe('INAGBE sem integração autorizada', () => {
  it('não simula integração: importação devolve 503 e a introdução manual continua disponível', async () => {
    const real = createCtx({}, { connectors: [new InagbeConnector({ timeoutMs: 1000, maxBytes: 1000, inagbeFeedUrl: undefined })] });
    try {
      // mesma BD de teste: o admin e a fonte já foram criados no beforeEach
      const a = await loginAgent(real, 'admin@exemplo.com');
      const list = await a.get('/api/v1/admin/integrations').expect(200);
      expect(list.body.data[0]).toMatchObject({ key: 'inagbe', configured: false, capabilities: { automaticImport: false, manualEntry: true } });
      const r = await a.post('/api/v1/admin/integrations/inagbe/import').expect(503);
      expect(r.body.error.code).toBe('INTEGRATION_UNAVAILABLE');
      const { sourceId, ...manual } = scholarshipPayload('x', { officialUrl: 'https://inagbe.gov.ao/bolsa-manual' });
      void sourceId;
      const m = await a.post('/api/v1/admin/integrations/inagbe/manual').send(manual).expect(201);
      expect(m.body.data).toMatchObject({ publicationStatus: 'DRAFT', verification: { status: 'UNVERIFIED' } });
      // link de outro domínio é recusado para a fonte INAGBE
      await a.post('/api/v1/admin/integrations/inagbe/manual').send({ ...manual, officialUrl: 'https://outro-site.com/x' }).expect(400);
    } finally { await real.close(); }
  });

  it('ligação ao feed autorizado: exige HTTPS, JSON e limita tamanho/tempo', async () => {
    const opts = { timeoutMs: 200, maxBytes: 50 };
    await expect(fetchJsonLimited('http://inagbe.gov.ao/feed', opts)).rejects.toBeInstanceOf(IntegrationUnavailableError);
    const resp = (body: string, init: ResponseInit = { headers: { 'content-type': 'application/json' } }) => (async () => new Response(body, init)) as unknown as typeof fetch;
    await expect(fetchJsonLimited('https://x.ao/f', opts, resp('{"a":1}'))).resolves.toEqual({ a: 1 });
    await expect(fetchJsonLimited('https://x.ao/f', opts, resp('x'.repeat(500)))).rejects.toThrow(/grande/);
    await expect(fetchJsonLimited('https://x.ao/f', opts, resp('<html>', { headers: { 'content-type': 'text/html' } }))).rejects.toThrow(/JSON/);
    await expect(fetchJsonLimited('https://x.ao/f', opts, resp('err', { status: 503, headers: { 'content-type': 'application/json' } }))).rejects.toThrow(/503/);
    const slow = ((_u: unknown, init: RequestInit) => new Promise((_r, rej) => init.signal!.addEventListener('abort', () => rej(Object.assign(new Error('abort'), { name: 'AbortError' }))))) as unknown as typeof fetch;
    await expect(fetchJsonLimited('https://x.ao/f', opts, slow)).rejects.toThrow(/Tempo limite/);
  });
});

describe('importação (feed autorizado simulado)', () => {
  it('cria rascunhos não verificados, com origem e data de recolha; sem duplicados na repetição', async () => {
    fake.feed = [item()];
    const r1 = await admin.post('/api/v1/admin/integrations/inagbe/import').expect(200);
    expect(r1.body.data.stats).toMatchObject({ received: 1, created: 1 });
    const s = await ctx.db.scholarship.findFirstOrThrow();
    expect(s).toMatchObject({ publicationStatus: 'DRAFT', verificationStatus: 'UNVERIFIED', externalId: 'EXT-1' });
    const link = await ctx.db.scholarshipSourceLink.findFirstOrThrow();
    expect(link.importedAt).not.toBeNull();
    expect((link.sourcePayload as any).collectedAt).toBeTruthy();
    expect((await ctx.db.scholarshipSource.findFirstOrThrow()).lastCollectedAt).not.toBeNull();

    const r2 = await admin.post('/api/v1/admin/integrations/inagbe/import').expect(200);
    expect(r2.body.data.stats).toMatchObject({ created: 0, unchanged: 1 });
    expect(await ctx.db.scholarship.count()).toBe(1);
  });

  it('rascunho não verificado é actualizado; dados validados NÃO são substituídos (ficam pendentes de revisão)', async () => {
    fake.feed = [item()];
    await admin.post('/api/v1/admin/integrations/inagbe/import').expect(200);
    const s = await ctx.db.scholarship.findFirstOrThrow();

    fake.feed = [item({ title: 'Título actualizado pela fonte' })];
    const r = await admin.post('/api/v1/admin/integrations/inagbe/import').expect(200);
    expect(r.body.data.stats.updatedDrafts).toBe(1);
    expect((await ctx.db.scholarship.findUniqueOrThrow({ where: { id: s.id } })).title).toBe('Título actualizado pela fonte');

    // admin valida e publica
    await admin.post(`/api/v1/admin/scholarships/${s.id}/verify`).send({ decision: 'VERIFIED' }).expect(200);
    await admin.post(`/api/v1/admin/scholarships/${s.id}/transition`).send({ to: 'IN_REVIEW' }).expect(200);
    await admin.post(`/api/v1/admin/scholarships/${s.id}/transition`).send({ to: 'PUBLISHED' }).expect(200);

    fake.feed = [item({ title: 'Título NÃO verificado da fonte', applicationDeadline: '2099-01-01' })];
    const r2 = await admin.post('/api/v1/admin/integrations/inagbe/import').expect(200);
    expect(r2.body.data.stats.pendingReview).toBe(1);
    const after = await ctx.db.scholarship.findUniqueOrThrow({ where: { id: s.id } });
    expect(after.title).toBe('Título actualizado pela fonte'); // intacto
    expect(after.publicationStatus).toBe('PUBLISHED');

    const pending = await admin.get(`/api/v1/admin/scholarships/${s.id}/source-changes`).expect(200);
    expect(pending.body.data[0].changes.title.to).toBe('Título NÃO verificado da fonte');

    // revisão administrativa: aplicar devolve a bolsa a revisão, sem verificação
    const linkId = pending.body.data[0].linkId;
    const applied = await admin.post(`/api/v1/admin/scholarships/${s.id}/source-changes/${linkId}/apply`).expect(200);
    expect(applied.body.data).toMatchObject({ title: 'Título NÃO verificado da fonte', publicationStatus: 'IN_REVIEW', verification: { status: 'PENDING' } });
    expect((await admin.get(`/api/v1/admin/scholarships/${s.id}/source-changes`)).body.data).toHaveLength(0);
  });

  it('descartar alterações externas mantém os dados e fica auditado', async () => {
    fake.feed = [item()];
    await admin.post('/api/v1/admin/integrations/inagbe/import').expect(200);
    const s = await ctx.db.scholarship.findFirstOrThrow();
    await admin.post(`/api/v1/admin/scholarships/${s.id}/verify`).send({ decision: 'VERIFIED' }).expect(200);
    fake.feed = [item({ title: 'Outro título' })];
    await admin.post('/api/v1/admin/integrations/inagbe/import').expect(200);
    const pending = (await admin.get(`/api/v1/admin/scholarships/${s.id}/source-changes`)).body.data[0];
    await admin.post(`/api/v1/admin/scholarships/${s.id}/source-changes/${pending.linkId}/dismiss`).expect(204);
    expect((await ctx.db.scholarship.findUniqueOrThrow({ where: { id: s.id } })).title).toBe(s.title);
    expect(await ctx.db.auditLog.count({ where: { entityType: 'SCHOLARSHIP', entityId: s.id, action: 'OTHER' } })).toBe(1);
  });

  it('itens inválidos ou de domínio não autorizado não interrompem a importação', async () => {
    fake.feed = [
      item({ externalId: 'OK-1', officialUrl: 'https://inagbe.gov.ao/ok' }),
      { title: 'x' }, // inválido
      item({ externalId: 'EVIL', officialUrl: 'https://phishing.example/x' }),
      item({ externalId: 'OK-2', officialUrl: 'https://inagbe.gov.ao/ok2' }),
    ];
    const r = await admin.post('/api/v1/admin/integrations/inagbe/import').expect(200);
    expect(r.body.data.stats).toMatchObject({ received: 4, created: 2, invalid: 1, rejectedDomain: 1 });
  });

  it('falha da fonte externa devolve 502, marca a fonte como FAILED e a aplicação continua', async () => {
    fake.fail = new IntegrationUnavailableError('A fonte respondeu com HTTP 500.');
    const r = await admin.post('/api/v1/admin/integrations/inagbe/import').expect(502);
    expect(r.body.error.code).toBe('INTEGRATION_UNAVAILABLE');
    expect((await ctx.db.scholarshipSource.findFirstOrThrow()).integrationStatus).toBe('FAILED');
    fake.fail = new Error('ECONNRESET com detalhes internos');
    const r2 = await admin.post('/api/v1/admin/integrations/inagbe/import').expect(502);
    expect(JSON.stringify(r2.body)).not.toContain('ECONNRESET');
    await admin.get('/api/v1/admin/integrations').expect(200);
    fake.feed = [item()]; fake.fail = null;
    await admin.post('/api/v1/admin/integrations/inagbe/import').expect(200); // recupera
    expect((await ctx.db.scholarshipSource.findFirstOrThrow()).integrationStatus).toBe('ACTIVE');
  });

  it('só administradores importam; conector inexistente dá 404', async () => {
    await insertUser(ctx, { email: 'st@exemplo.com', role: 'STUDENT' });
    const st = await loginAgent(ctx, 'st@exemplo.com');
    await st.post('/api/v1/admin/integrations/inagbe/import').expect(403);
    await admin.post('/api/v1/admin/integrations/desconhecido/import').expect(404);
  });
});
