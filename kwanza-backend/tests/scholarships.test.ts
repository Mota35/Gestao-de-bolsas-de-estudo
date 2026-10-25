import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  anon, createCtx, createPublishedScholarship, insertSource, insertUser, loginAgent, resetDb, scholarshipPayload,
} from './helpers.js';
import { computeValidity } from '../src/modules/scholarships/validity.js';
import { parseCalendarDate, zonedTimeToUtc } from '../src/utils/dates.js';

const ctx = createCtx();
let admin: Awaited<ReturnType<typeof loginAgent>>;
let sourceId: string;

beforeEach(async () => {
  await resetDb(ctx.db);
  await insertUser(ctx, { email: 'admin@exemplo.com', role: 'ADMIN' });
  admin = await loginAgent(ctx, 'admin@exemplo.com');
  sourceId = (await insertSource(ctx)).id;
});
afterAll(() => ctx.close());

describe('validade calculada (fuso horário)', () => {
  const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
  it('prazo é inclusivo durante todo o dia; passa a CLOSED no dia seguinte', () => {
    const s = { openingDate: null, applicationDeadline: d('2026-12-15') };
    expect(computeValidity(s, d('2026-12-15'))).toBe('OPEN');
    expect(computeValidity(s, d('2026-12-16'))).toBe('CLOSED');
  });
  it('futuro = UPCOMING; sem prazo = UNKNOWN (nunca "aberta")', () => {
    expect(computeValidity({ openingDate: d('2027-01-01'), applicationDeadline: d('2027-06-01') }, d('2026-10-25'))).toBe('UPCOMING');
    expect(computeValidity({ openingDate: null, applicationDeadline: null }, d('2026-10-25'))).toBe('UNKNOWN');
  });
  it('data local usa o fuso (Luanda, UTC+1): 23:30 UTC já é o dia seguinte', () => {
    expect(parseCalendarDate('2026-12-15T23:30:00Z', 'Africa/Luanda')?.toISOString().slice(0, 10)).toBe('2026-12-16');
    expect(zonedTimeToUtc(2026, 12, 15, 23, 59, 59, 999, 'Africa/Luanda').toISOString()).toBe('2026-12-15T22:59:59.999Z');
    expect(parseCalendarDate('2026-02-31', 'Africa/Luanda')).toBeNull();
  });
});

describe('publicação e aprovação', () => {
  it('bolsa nasce DRAFT/UNVERIFIED e não aparece na listagem pública', async () => {
    const c = await admin.post('/api/v1/admin/scholarships').send(scholarshipPayload(sourceId)).expect(201);
    expect(c.body.data).toMatchObject({ publicationStatus: 'DRAFT', verification: { status: 'UNVERIFIED' } });
    const list = await anon(ctx).get('/api/v1/scholarships?state=all').expect(200);
    expect(list.body.data).toHaveLength(0);
    await anon(ctx).get(`/api/v1/scholarships/${c.body.data.id}`).expect(404);
  });

  it('não publica sem verificação, nem com prazo expirado', async () => {
    const c = await admin.post('/api/v1/admin/scholarships').send(scholarshipPayload(sourceId)).expect(201);
    const id = c.body.data.id;
    await admin.post(`/api/v1/admin/scholarships/${id}/transition`).send({ to: 'IN_REVIEW' }).expect(200);
    const r = await admin.post(`/api/v1/admin/scholarships/${id}/transition`).send({ to: 'PUBLISHED' }).expect(409);
    expect(r.body.error.code).toBe('INVALID_STATE');

    const old = await admin.post('/api/v1/admin/scholarships').send(scholarshipPayload(sourceId, { openingDate: '2019-01-01', applicationDeadline: '2020-01-01' })).expect(201);
    await admin.post(`/api/v1/admin/scholarships/${old.body.data.id}/verify`).send({ decision: 'VERIFIED' }).expect(200);
    await admin.post(`/api/v1/admin/scholarships/${old.body.data.id}/transition`).send({ to: 'IN_REVIEW' }).expect(200);
    await admin.post(`/api/v1/admin/scholarships/${old.body.data.id}/transition`).send({ to: 'PUBLISHED' }).expect(409);
  });

  it('fluxo completo: verificar -> publicar -> aparece, com fonte e data de verificação', async () => {
    const s = await createPublishedScholarship(admin, sourceId);
    const r = await anon(ctx).get(`/api/v1/scholarships/${s.slug}`).expect(200);
    expect(r.body.data).toMatchObject({ validity: 'OPEN', isOpen: true, verification: { status: 'VERIFIED', isStale: false } });
    expect(r.body.data.source.domain).toBe('inagbe.gov.ao');
    expect(r.body.data.sourceLastCheckedAt).toBeTruthy();
    expect(r.body.data.publicationStatus).toBeUndefined(); // campos administrativos não são públicos
  });

  it('só administradores gerem bolsas', async () => {
    await insertUser(ctx, { email: 'st@exemplo.com', role: 'STUDENT' });
    await insertUser(ctx, { email: 'mt@exemplo.com', role: 'MENTOR' });
    const st = await loginAgent(ctx, 'st@exemplo.com');
    const mt = await loginAgent(ctx, 'mt@exemplo.com');
    await st.post('/api/v1/admin/scholarships').send(scholarshipPayload(sourceId)).expect(403);
    await mt.get('/api/v1/admin/scholarships').expect(403);
    await anon(ctx).get('/api/v1/admin/scholarships').expect(401);
  });

  it('rejeitar uma bolsa publicada retira-a da publicação; alterações ficam auditadas', async () => {
    const s = await createPublishedScholarship(admin, sourceId);
    await admin.post(`/api/v1/admin/scholarships/${s.id}/verify`).send({ decision: 'REJECTED', note: 'Link quebrado' }).expect(200);
    await anon(ctx).get(`/api/v1/scholarships/${s.id}`).expect(404);
    await admin.patch(`/api/v1/admin/scholarships/${s.id}`).send({ applicationDeadline: '2099-06-30' }).expect(200);
    const logs = await ctx.db.auditLog.findMany({ where: { entityType: 'SCHOLARSHIP', entityId: s.id } });
    expect(logs.map((l: any) => l.action)).toEqual(expect.arrayContaining(['CREATE', 'VERIFY', 'PUBLISH', 'REJECT', 'UPDATE']));
  });

  it('valida entradas (datas incoerentes, URL perigoso, campos extra)', async () => {
    const bad = (over: Record<string, unknown>) => admin.post('/api/v1/admin/scholarships').send(scholarshipPayload(sourceId, over));
    await bad({ openingDate: '2027-01-01', applicationDeadline: '2026-01-01' }).then((r) => expect(r.status).toBe(400));
    await bad({ officialUrl: 'javascript:alert(1)' }).then((r) => expect(r.status).toBe(400));
    await bad({ publicationStatus: 'PUBLISHED' }).then((r) => expect(r.status).toBe(400));
    await bad({ applicationDeadline: '2026-02-31' }).then((r) => expect(r.status).toBe(400));
  });
});

describe('pesquisa, filtros, ordenação e paginação', () => {
  beforeEach(async () => {
    await createPublishedScholarship(admin, sourceId, { title: 'Chevening UK Masters', sponsoringInstitution: 'Governo do Reino Unido', destinationCountry: 'Reino Unido', educationLevel: ['MASTER'], studyAreas: ['politicas-publicas'], fundingType: 'FULL', applicationDeadline: '2099-11-01' });
    await createPublishedScholarship(admin, sourceId, { title: 'Bolsa Doutoramento Física', sponsoringInstitution: 'Universidade do Porto', destinationCountry: 'Portugal', educationLevel: ['DOCTORATE'], studyAreas: ['fisica'], fundingType: 'PARTIAL', studyMode: 'IN_PERSON', applicationDeadline: '2099-03-01' });
    await createPublishedScholarship(admin, sourceId, { title: 'Curso de Verão Online', sponsoringInstitution: 'Universidade do Porto', destinationCountry: 'Portugal', educationLevel: ['SHORT_COURSE'], studyAreas: ['fisica'], fundingType: 'STIPEND', studyMode: 'ONLINE', openingDate: '2098-01-01', applicationDeadline: '2098-06-01' });
    // expirada, mas publicada (publicada quando ainda estava aberta)
    const exp = await createPublishedScholarship(admin, sourceId, { title: 'Bolsa Antiga Expirada' });
    await ctx.db.scholarship.update({ where: { id: exp.id }, data: { applicationDeadline: new Date('2020-01-01') } });
  });
  const titles = (r: any) => r.body.data.map((s: any) => s.title);

  it('por omissão só devolve bolsas abertas (a expirada não aparece como oportunidade)', async () => {
    const r = await anon(ctx).get('/api/v1/scholarships').expect(200);
    expect(titles(r)).not.toContain('Bolsa Antiga Expirada');
    expect(titles(r)).not.toContain('Curso de Verão Online'); // ainda não abriu
    expect(r.body.data.every((s: any) => s.isOpen)).toBe(true);
    expect(r.body.meta.total).toBe(2);
  });

  it('state=closed e state=upcoming', async () => {
    expect(titles(await anon(ctx).get('/api/v1/scholarships?state=closed'))).toEqual(['Bolsa Antiga Expirada']);
    expect(titles(await anon(ctx).get('/api/v1/scholarships?state=upcoming'))).toEqual(['Curso de Verão Online']);
    const all = await anon(ctx).get('/api/v1/scholarships?state=all');
    expect(all.body.meta.total).toBe(4);
    const expired = all.body.data.find((s: any) => s.title === 'Bolsa Antiga Expirada');
    expect(expired).toMatchObject({ validity: 'CLOSED', isOpen: false });
  });

  it('pesquisa por título, instituição e palavra-chave (área)', async () => {
    expect(titles(await anon(ctx).get('/api/v1/scholarships?q=chevening'))).toEqual(['Chevening UK Masters']);
    expect(titles(await anon(ctx).get('/api/v1/scholarships?q=porto'))).toEqual(['Bolsa Doutoramento Física']);
    expect(titles(await anon(ctx).get('/api/v1/scholarships?q=fisica&state=all')).sort()).toEqual(['Bolsa Doutoramento Física', 'Curso de Verão Online']);
  });

  it('filtra por país, nível, área, modalidade, financiamento e prazo', async () => {
    expect(titles(await anon(ctx).get('/api/v1/scholarships?country=portugal'))).toEqual(['Bolsa Doutoramento Física']);
    expect(titles(await anon(ctx).get('/api/v1/scholarships?level=MASTER,DOCTORATE')).sort()).toEqual(['Bolsa Doutoramento Física', 'Chevening UK Masters']);
    expect(titles(await anon(ctx).get('/api/v1/scholarships?area=fisica'))).toEqual(['Bolsa Doutoramento Física']);
    expect(titles(await anon(ctx).get('/api/v1/scholarships?mode=IN_PERSON'))).toEqual(['Bolsa Doutoramento Física']);
    expect(titles(await anon(ctx).get('/api/v1/scholarships?funding=FULL'))).toEqual(['Chevening UK Masters']);
    expect(titles(await anon(ctx).get('/api/v1/scholarships?deadlineBefore=2099-06-01'))).toEqual(['Bolsa Doutoramento Física']);
    await anon(ctx).get('/api/v1/scholarships?level=INVALID').expect(400);
  });

  it('ordena por prazo e pagina', async () => {
    expect(titles(await anon(ctx).get('/api/v1/scholarships?sort=deadline_asc'))).toEqual(['Bolsa Doutoramento Física', 'Chevening UK Masters']);
    expect(titles(await anon(ctx).get('/api/v1/scholarships?sort=deadline_desc'))).toEqual(['Chevening UK Masters', 'Bolsa Doutoramento Física']);
    const p2 = await anon(ctx).get('/api/v1/scholarships?pageSize=1&page=2&sort=title').expect(200);
    expect(p2.body.meta).toMatchObject({ page: 2, pageSize: 1, total: 2, totalPages: 2 });
    expect(titles(p2)).toEqual(['Chevening UK Masters']);
    await anon(ctx).get('/api/v1/scholarships?pageSize=1000').expect(400);
  });

  it('pesquisa é segura contra injecção (parâmetros tratados como texto)', async () => {
    const r = await anon(ctx).get("/api/v1/scholarships?q=' OR 1=1; DROP TABLE users;--").expect(200);
    expect(r.body.data).toHaveLength(0);
    expect(await ctx.db.user.count()).toBeGreaterThan(0);
  });
});

describe('favoritos', () => {
  it('estudante guarda, lista (com isFavorite) e remove; é idempotente', async () => {
    const s = await createPublishedScholarship(admin, sourceId);
    await insertUser(ctx, { email: 'st@exemplo.com', role: 'STUDENT' });
    const st = await loginAgent(ctx, 'st@exemplo.com');
    await st.put(`/api/v1/me/favorites/${s.id}`).expect(204);
    await st.put(`/api/v1/me/favorites/${s.id}`).expect(204);
    expect(await ctx.db.scholarshipFavorite.count()).toBe(1);
    const list = await st.get('/api/v1/me/favorites').expect(200);
    expect(list.body.data).toHaveLength(1);
    expect((await st.get('/api/v1/scholarships').expect(200)).body.data[0].isFavorite).toBe(true);
    await st.delete(`/api/v1/me/favorites/${s.id}`).expect(204);
    expect((await st.get('/api/v1/me/favorites')).body.data).toHaveLength(0);
  });

  it('favoritos são privados por utilizador e não aceitam bolsas não publicadas', async () => {
    const s = await createPublishedScholarship(admin, sourceId);
    const draft = await admin.post('/api/v1/admin/scholarships').send(scholarshipPayload(sourceId)).expect(201);
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    await insertUser(ctx, { email: 'b@exemplo.com', role: 'STUDENT' });
    const a = await loginAgent(ctx, 'a@exemplo.com');
    const b = await loginAgent(ctx, 'b@exemplo.com');
    await a.put(`/api/v1/me/favorites/${s.id}`).expect(204);
    expect((await b.get('/api/v1/me/favorites')).body.data).toHaveLength(0);
    await b.delete(`/api/v1/me/favorites/${s.id}`).expect(204); // não afecta o favorito de A
    expect(await ctx.db.scholarshipFavorite.count()).toBe(1);
    await a.put(`/api/v1/me/favorites/${draft.body.data.id}`).expect(404);
    await anon(ctx).get('/api/v1/me/favorites').expect(401);
  });

  it('mentores não têm favoritos (apenas estudantes)', async () => {
    await insertUser(ctx, { email: 'm@exemplo.com', role: 'MENTOR' });
    const m = await loginAgent(ctx, 'm@exemplo.com');
    await m.get('/api/v1/me/favorites').expect(403);
  });
});
