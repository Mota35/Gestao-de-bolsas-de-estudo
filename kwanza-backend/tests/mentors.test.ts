import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { anon, createCtx, insertUser, insertVerifiedMentor, loginAgent, resetDb } from './helpers.js';

const ctx = createCtx();
let admin: Awaited<ReturnType<typeof loginAgent>>;
beforeEach(async () => {
  await resetDb(ctx.db);
  await insertUser(ctx, { email: 'admin@exemplo.com', role: 'ADMIN' });
  admin = await loginAgent(ctx, 'admin@exemplo.com');
});
afterAll(() => ctx.close());

const serviceBody = (over: Record<string, unknown> = {}) => ({
  title: 'Revisão de carta de motivação',
  description: 'Revisão detalhada da carta com feedback em 48 horas.',
  category: 'APPLICATION_SUPPORT', price: 15000, currency: 'AOA', durationMinutes: 60, mode: 'ONLINE', ...over,
});
const courseBody = (over: Record<string, unknown> = {}) => ({
  title: 'Preparação para IELTS', description: 'Curso intensivo de quatro semanas com simulados.',
  category: 'Idiomas', price: 50000, currency: 'AOA', mode: 'ONLINE', enrollmentUrl: 'https://exemplo.com/inscricao', ...over,
});

describe('aprovação de mentores', () => {
  it('mentor pendente não aparece publicamente nem publica serviços; após aprovação sim', async () => {
    await anon(ctx).post('/api/v1/auth/register/mentor').send({ name: 'João Mentor', email: 'joao@exemplo.com', password: 'SenhaSegura123', specialties: ['candidaturas'], bio: 'Mais de cinco anos a orientar candidaturas a bolsas internacionais.' }).expect(201);
    const user = await ctx.db.user.findUniqueOrThrow({ where: { email: 'joao@exemplo.com' } });
    await ctx.db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    const profile = await ctx.db.mentorProfile.findUniqueOrThrow({ where: { userId: user.id } });

    expect((await anon(ctx).get('/api/v1/mentors')).body.data).toHaveLength(0);
    await anon(ctx).get(`/api/v1/mentors/${profile.id}`).expect(404);

    const m = await loginAgent(ctx, 'joao@exemplo.com');
    const svc = await m.post('/api/v1/mentor-services').send(serviceBody()).expect(201); // rascunho é permitido
    const denied = await m.post(`/api/v1/mentor-services/${svc.body.data.id}/status`).send({ to: 'PUBLISHED' }).expect(403);
    expect(denied.body.error.message).toMatch(/aprovado/);

    await admin.post(`/api/v1/admin/mentors/${profile.id}/review`).send({ decision: 'VERIFIED' }).expect(200);
    await m.post(`/api/v1/mentor-services/${svc.body.data.id}/status`).send({ to: 'PUBLISHED' }).expect(200);

    const list = await anon(ctx).get('/api/v1/mentors?specialty=candidaturas').expect(200);
    expect(list.body.data[0]).toMatchObject({ name: 'João Mentor', verified: true });
    const detail = await anon(ctx).get(`/api/v1/mentors/${profile.id}`).expect(200);
    expect(detail.body.data.services).toHaveLength(1);
    expect(detail.body.data.rejectionReason).toBeUndefined();
  });

  it('rejeição exige motivo; mentor rejeitado desaparece e vê o motivo; suspensão retira ofertas', async () => {
    const { profile } = await insertVerifiedMentor(ctx, 'm@exemplo.com');
    await admin.post(`/api/v1/admin/mentors/${profile.id}/review`).send({ decision: 'REJECTED' }).expect(400);
    await admin.post(`/api/v1/admin/mentors/${profile.id}/review`).send({ decision: 'SUSPENDED', reason: 'Denúncias confirmadas' }).expect(200);
    expect((await anon(ctx).get('/api/v1/mentors')).body.data).toHaveLength(0);
    const m = await loginAgent(ctx, 'm@exemplo.com');
    const own = await m.get('/api/v1/mentors/me').expect(200);
    expect(own.body.data.verified).toBe(false);
  });

  it('só administradores aprovam; auditoria regista a decisão', async () => {
    const { profile } = await insertVerifiedMentor(ctx, 'm@exemplo.com');
    await ctx.db.mentorProfile.update({ where: { id: profile.id }, data: { verificationStatus: 'PENDING' } });
    const m = await loginAgent(ctx, 'm@exemplo.com');
    await m.post(`/api/v1/admin/mentors/${profile.id}/review`).send({ decision: 'VERIFIED' }).expect(403);
    await admin.post(`/api/v1/admin/mentors/${profile.id}/review`).send({ decision: 'VERIFIED' }).expect(200);
    const log = await ctx.db.auditLog.findFirstOrThrow({ where: { entityType: 'MENTOR_PROFILE', action: 'VERIFY' } });
    expect(log.entityId).toBe(profile.id);
  });

  it('mentor não pode alterar o próprio estado de verificação', async () => {
    const { profile } = await insertVerifiedMentor(ctx, 'm@exemplo.com');
    await ctx.db.mentorProfile.update({ where: { id: profile.id }, data: { verificationStatus: 'PENDING' } });
    const m = await loginAgent(ctx, 'm@exemplo.com');
    await m.patch('/api/v1/mentors/me').send({ verificationStatus: 'VERIFIED' }).expect(400);
    expect((await ctx.db.mentorProfile.findUniqueOrThrow({ where: { id: profile.id } })).verificationStatus).toBe('PENDING');
  });

  it('alterar credenciais de um perfil verificado exige nova revisão', async () => {
    await insertVerifiedMentor(ctx, 'm@exemplo.com');
    const m = await loginAgent(ctx, 'm@exemplo.com');
    const r = await m.patch('/api/v1/mentors/me').send({ qualifications: ['PhD em Educação'] }).expect(200);
    expect(r.body.data).toMatchObject({ verificationStatus: 'PENDING', reReviewRequired: true });
  });
});

describe('WhatsApp', () => {
  it('normaliza o número para E.164 e rejeita inválidos', async () => {
    await insertVerifiedMentor(ctx, 'm@exemplo.com');
    const m = await loginAgent(ctx, 'm@exemplo.com');
    const ok = await m.patch('/api/v1/mentors/me').send({ whatsappNumber: '+244 923 456 789', allowWhatsappPublic: true }).expect(200);
    expect(ok.body.data.whatsappNumber).toBe('+244923456789');
    await m.patch('/api/v1/mentors/me').send({ whatsappNumber: '12345' }).expect(400);
    await m.patch('/api/v1/mentors/me').send({ whatsappNumber: '923456789' }).expect(400); // sem prefixo internacional
  });

  it('só expõe o número se o mentor autorizou; devolve dados para wa.me', async () => {
    const { profile: pub } = await insertVerifiedMentor(ctx, 'pub@exemplo.com', { whatsapp: '+244923456789', publicWhatsapp: true });
    const { profile: priv } = await insertVerifiedMentor(ctx, 'priv@exemplo.com', { whatsapp: '+244911222333', publicWhatsapp: false });
    const a = (await anon(ctx).get(`/api/v1/mentors/${pub.id}`)).body.data;
    expect(a.whatsapp).toMatchObject({ e164: '+244923456789', waDigits: '244923456789', url: 'https://wa.me/244923456789' });
    const b = (await anon(ctx).get(`/api/v1/mentors/${priv.id}`)).body.data;
    expect(b.whatsapp).toBeNull();
    expect(JSON.stringify((await anon(ctx).get('/api/v1/mentors')).body)).not.toContain('911222333');
  });

  it('não autoriza divulgação sem número; remover o número desliga a divulgação', async () => {
    await insertVerifiedMentor(ctx, 'm@exemplo.com');
    const m = await loginAgent(ctx, 'm@exemplo.com');
    await m.patch('/api/v1/mentors/me').send({ allowWhatsappPublic: true }).expect(400);
    await m.patch('/api/v1/mentors/me').send({ whatsappNumber: '+244923456789', allowWhatsappPublic: true }).expect(200);
    const r = await m.patch('/api/v1/mentors/me').send({ whatsappNumber: null }).expect(200);
    expect(r.body.data.allowWhatsappPublic).toBe(false);
  });

  it('o número privado não vaza pelos serviços, cursos nem pedidos', async () => {
    const { profile } = await insertVerifiedMentor(ctx, 'm@exemplo.com', { whatsapp: '+244911222333', publicWhatsapp: false });
    const m = await loginAgent(ctx, 'm@exemplo.com');
    const svc = await m.post('/api/v1/mentor-services').send(serviceBody()).expect(201);
    await m.post(`/api/v1/mentor-services/${svc.body.data.id}/status`).send({ to: 'PUBLISHED' }).expect(200);
    const course = await m.post('/api/v1/courses').send(courseBody()).expect(201);
    await m.post(`/api/v1/courses/${course.body.data.id}/status`).send({ to: 'PUBLISHED' }).expect(200);
    await insertUser(ctx, { email: 'st@exemplo.com', role: 'STUDENT' });
    const st = await loginAgent(ctx, 'st@exemplo.com');
    const inq = await st.post('/api/v1/inquiries').send({ mentorServiceId: svc.body.data.id }).expect(201);
    const all = JSON.stringify([
      (await anon(ctx).get('/api/v1/mentor-services')).body,
      (await anon(ctx).get(`/api/v1/mentor-services/${svc.body.data.id}`)).body,
      (await anon(ctx).get('/api/v1/courses')).body,
      (await anon(ctx).get(`/api/v1/mentors/${profile.id}`)).body,
      inq.body,
    ]);
    expect(all).not.toContain('911222333');
  });

  it('com autorização, o serviço traz link wa.me com mensagem pré-preenchida', async () => {
    await insertVerifiedMentor(ctx, 'm@exemplo.com', { whatsapp: '+244923456789', publicWhatsapp: true });
    const m = await loginAgent(ctx, 'm@exemplo.com');
    const svc = await m.post('/api/v1/mentor-services').send(serviceBody()).expect(201);
    await m.post(`/api/v1/mentor-services/${svc.body.data.id}/status`).send({ to: 'PUBLISHED' }).expect(200);
    const r = await anon(ctx).get(`/api/v1/mentor-services/${svc.body.data.id}`).expect(200);
    expect(r.body.data.mentor.whatsapp.urlWithMessage).toMatch(/^https:\/\/wa\.me\/244923456789\?text=Ol%C3%A1/);
  });
});

describe('serviços e cursos', () => {
  it('mentor só gere os próprios serviços (404 para os de outros)', async () => {
    await insertVerifiedMentor(ctx, 'a@exemplo.com');
    await insertVerifiedMentor(ctx, 'b@exemplo.com');
    const a = await loginAgent(ctx, 'a@exemplo.com');
    const b = await loginAgent(ctx, 'b@exemplo.com');
    const svc = await a.post('/api/v1/mentor-services').send(serviceBody()).expect(201);
    const course = await a.post('/api/v1/courses').send(courseBody()).expect(201);
    await b.patch(`/api/v1/mentor-services/${svc.body.data.id}`).send({ price: 1 }).expect(404);
    await b.post(`/api/v1/mentor-services/${svc.body.data.id}/status`).send({ to: 'PUBLISHED' }).expect(404);
    await b.patch(`/api/v1/courses/${course.body.data.id}`).send({ price: 1 }).expect(404);
    await b.get(`/api/v1/mentor-services/mine/${svc.body.data.id}`).expect(404).catch(() => undefined);
    expect((await b.get('/api/v1/mentor-services/mine')).body.data).toHaveLength(0);
    expect((await ctx.db.mentorService.findUniqueOrThrow({ where: { id: svc.body.data.id } })).price.toString()).toBe('15000');
  });

  it('estudantes não criam serviços; anónimos não gerem nada', async () => {
    await insertUser(ctx, { email: 'st@exemplo.com', role: 'STUDENT' });
    const st = await loginAgent(ctx, 'st@exemplo.com');
    await st.post('/api/v1/mentor-services').send(serviceBody()).expect(403);
    await anon(ctx).post('/api/v1/courses').send(courseBody()).expect(401);
  });

  it('ciclo de vida: rascunho -> publicado -> desactivado -> arquivado (terminal)', async () => {
    await insertVerifiedMentor(ctx, 'm@exemplo.com');
    const m = await loginAgent(ctx, 'm@exemplo.com');
    const svc = (await m.post('/api/v1/mentor-services').send(serviceBody()).expect(201)).body.data;
    expect((await anon(ctx).get('/api/v1/mentor-services')).body.data).toHaveLength(0);
    await m.post(`/api/v1/mentor-services/${svc.id}/status`).send({ to: 'PUBLISHED' }).expect(200);
    expect((await anon(ctx).get('/api/v1/mentor-services')).body.data).toHaveLength(1);
    await m.post(`/api/v1/mentor-services/${svc.id}/status`).send({ to: 'UNPUBLISHED' }).expect(200);
    expect((await anon(ctx).get('/api/v1/mentor-services')).body.data).toHaveLength(0);
    await m.post(`/api/v1/mentor-services/${svc.id}/status`).send({ to: 'ARCHIVED' }).expect(200);
    await m.post(`/api/v1/mentor-services/${svc.id}/status`).send({ to: 'PUBLISHED' }).expect(409);
    await m.patch(`/api/v1/mentor-services/${svc.id}`).send({ price: 1000 }).expect(409);
  });

  it('filtra cursos e serviços por categoria, preço e modalidade; valida preço', async () => {
    await insertVerifiedMentor(ctx, 'm@exemplo.com');
    const m = await loginAgent(ctx, 'm@exemplo.com');
    for (const body of [courseBody({ title: 'Curso barato online', price: 10000 }), courseBody({ title: 'Curso caro presencial', price: 90000, mode: 'IN_PERSON', category: 'Ciência' })]) {
      const c = await m.post('/api/v1/courses').send(body).expect(201);
      await m.post(`/api/v1/courses/${c.body.data.id}/status`).send({ to: 'PUBLISHED' }).expect(200);
    }
    const t = (r: any) => r.body.data.map((c: any) => c.title);
    expect(t(await anon(ctx).get('/api/v1/courses?mode=IN_PERSON'))).toEqual(['Curso caro presencial']);
    expect(t(await anon(ctx).get('/api/v1/courses?category=idiomas'))).toEqual(['Curso barato online']);
    expect(t(await anon(ctx).get('/api/v1/courses?currency=AOA&maxPrice=20000'))).toEqual(['Curso barato online']);
    expect(t(await anon(ctx).get('/api/v1/courses?currency=AOA&sort=price_desc'))).toEqual(['Curso caro presencial', 'Curso barato online']);
    await anon(ctx).get('/api/v1/courses?maxPrice=20000').expect(400); // preço sem moeda
    await m.post('/api/v1/courses').send(courseBody({ price: -5 })).expect(400);
    await m.post('/api/v1/courses').send(courseBody({ price: 10.999 })).expect(400);
    await m.post('/api/v1/courses').send(courseBody({ enrollmentUrl: 'javascript:alert(1)' })).expect(400);
  });

  it('moderação administrativa retira conteúdo e o mentor não consegue repor', async () => {
    await insertVerifiedMentor(ctx, 'm@exemplo.com');
    const m = await loginAgent(ctx, 'm@exemplo.com');
    const svc = (await m.post('/api/v1/mentor-services').send(serviceBody()).expect(201)).body.data;
    await m.post(`/api/v1/mentor-services/${svc.id}/status`).send({ to: 'PUBLISHED' }).expect(200);
    await admin.post(`/api/v1/admin/catalog/services/${svc.id}/moderate`).send({ action: 'ARCHIVE', reason: 'Conteúdo enganoso' }).expect(200);
    expect((await anon(ctx).get('/api/v1/mentor-services')).body.data).toHaveLength(0);
    await m.post(`/api/v1/mentor-services/${svc.id}/status`).send({ to: 'PUBLISHED' }).expect(409);
    await m.post(`/api/v1/admin/catalog/services/${svc.id}/moderate`).send({ action: 'RESTORE', reason: 'tentativa' }).expect(403);
    const log = await ctx.db.auditLog.findFirstOrThrow({ where: { entityType: 'MENTOR_SERVICE', entityId: svc.id } });
    expect(log.metadata).toMatchObject({ moderation: 'ARCHIVE', reason: 'Conteúdo enganoso' });
  });
});

describe('pedidos de mentoria e denúncias', () => {
  async function publishedService() {
    const { profile } = await insertVerifiedMentor(ctx, 'm@exemplo.com', { whatsapp: '+244923456789', publicWhatsapp: true });
    const m = await loginAgent(ctx, 'm@exemplo.com');
    const svc = (await m.post('/api/v1/mentor-services').send(serviceBody()).expect(201)).body.data;
    await m.post(`/api/v1/mentor-services/${svc.id}/status`).send({ to: 'PUBLISHED' }).expect(200);
    return { m, svc, profile };
  }

  it('estudante cria pedido (sem duplicados); mentor vê apenas os seus; terceiros não acedem', async () => {
    const { m, svc } = await publishedService();
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    await insertUser(ctx, { email: 'b@exemplo.com', role: 'STUDENT' });
    await insertVerifiedMentor(ctx, 'outro@exemplo.com');
    const a = await loginAgent(ctx, 'a@exemplo.com');
    const b = await loginAgent(ctx, 'b@exemplo.com');
    const o = await loginAgent(ctx, 'outro@exemplo.com');

    const inq = await a.post('/api/v1/inquiries').send({ mentorServiceId: svc.id, message: 'Olá' }).expect(201);
    expect(inq.body.data.whatsapp.url).toBe('https://wa.me/244923456789');
    await a.post('/api/v1/inquiries').send({ mentorServiceId: svc.id }).expect(409);

    expect((await m.get('/api/v1/inquiries/received')).body.data).toHaveLength(1);
    expect((await o.get('/api/v1/inquiries/received')).body.data).toHaveLength(0);
    expect((await b.get('/api/v1/inquiries/mine')).body.data).toHaveLength(0);
    await b.patch(`/api/v1/inquiries/${inq.body.data.id}/status`).send({ status: 'CLOSED' }).expect(404);
    await o.patch(`/api/v1/inquiries/${inq.body.data.id}/status`).send({ status: 'ACCEPTED' }).expect(404);
    await a.patch(`/api/v1/inquiries/${inq.body.data.id}/status`).send({ status: 'ACCEPTED' }).expect(403); // estudante só encerra
    await m.patch(`/api/v1/inquiries/${inq.body.data.id}/status`).send({ status: 'ACCEPTED' }).expect(200);
    await a.patch(`/api/v1/inquiries/${inq.body.data.id}/status`).send({ status: 'CLOSED' }).expect(200);
  });

  it('não é possível contactar serviços não publicados ou de mentores não verificados', async () => {
    const { profile } = await insertVerifiedMentor(ctx, 'm@exemplo.com');
    const m = await loginAgent(ctx, 'm@exemplo.com');
    const svc = (await m.post('/api/v1/mentor-services').send(serviceBody()).expect(201)).body.data;
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    const a = await loginAgent(ctx, 'a@exemplo.com');
    await a.post('/api/v1/inquiries').send({ mentorServiceId: svc.id }).expect(404);
    await m.post(`/api/v1/mentor-services/${svc.id}/status`).send({ to: 'PUBLISHED' }).expect(200);
    await ctx.db.mentorProfile.update({ where: { id: profile.id }, data: { verificationStatus: 'SUSPENDED' } });
    await a.post('/api/v1/inquiries').send({ mentorServiceId: svc.id }).expect(404);
  });

  it('denúncias: cria, evita duplicados e auto-denúncia; admin resolve; outros não vêem', async () => {
    const { svc } = await publishedService();
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    await insertUser(ctx, { email: 'nv@exemplo.com', role: 'STUDENT', verified: false });
    const a = await loginAgent(ctx, 'a@exemplo.com');
    const nv = await loginAgent(ctx, 'nv@exemplo.com');
    const body = { targetType: 'MENTOR_SERVICE', targetId: svc.id, reason: 'SCAM', details: 'Pede pagamento antecipado.' };
    await nv.post('/api/v1/reports').send(body).expect(403); // email não confirmado
    const rep = await a.post('/api/v1/reports').send(body).expect(201);
    await a.post('/api/v1/reports').send(body).expect(409);
    const mine = await loginAgent(ctx, 'm@exemplo.com');
    await mine.post('/api/v1/reports').send(body).expect(403); // auto-denúncia
    await a.get('/api/v1/admin/reports').expect(403);
    expect((await admin.get('/api/v1/admin/reports?status=OPEN')).body.data).toHaveLength(1);
    await admin.post(`/api/v1/admin/reports/${rep.body.data.id}/resolve`).send({ outcome: 'RESOLVED', note: 'Serviço removido.' }).expect(200);
    await admin.post(`/api/v1/admin/reports/${rep.body.data.id}/resolve`).send({ outcome: 'DISMISSED', note: 'duplicado' }).expect(409);
    await a.post('/api/v1/reports').send({ ...body, targetId: '00000000-0000-4000-8000-000000000000' }).expect(404);
  });
});

describe('isolamento de dados entre utilizadores', () => {
  it('um estudante não altera o perfil de outro (o id vem sempre da sessão)', async () => {
    await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT', name: 'Aluno A' });
    const b = await insertUser(ctx, { email: 'b@exemplo.com', role: 'STUDENT', name: 'Aluno B' });
    const a = await loginAgent(ctx, 'a@exemplo.com');
    await a.patch('/api/v1/users/me').send({ name: 'Novo', id: b.id }).expect(400);
    await a.patch(`/api/v1/users/${b.id}`).send({ name: 'Hack' }).expect(404);
    await a.patch('/api/v1/users/me').send({ name: 'Aluno A2' }).expect(200);
    expect((await ctx.db.user.findUniqueOrThrow({ where: { id: b.id } })).name).toBe('Aluno B');
  });

  it('um utilizador não pode mudar o próprio papel nem aceder a rotas de admin', async () => {
    const u = await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    const a = await loginAgent(ctx, 'a@exemplo.com');
    await a.patch('/api/v1/users/me').send({ role: 'ADMIN' }).expect(400);
    await a.patch(`/api/v1/admin/users/${u.id}/active`).send({ isActive: false }).expect(403);
    await a.get('/api/v1/admin/audit-logs').expect(403);
    expect((await ctx.db.user.findUniqueOrThrow({ where: { id: u.id } })).role).toBe('STUDENT');
  });

  it('desactivar uma conta revoga as sessões; admin não se desactiva a si próprio', async () => {
    const u = await insertUser(ctx, { email: 'a@exemplo.com', role: 'STUDENT' });
    const a = await loginAgent(ctx, 'a@exemplo.com');
    await admin.patch(`/api/v1/admin/users/${u.id}/active`).send({ isActive: false }).expect(204);
    await a.get('/api/v1/users/me').expect(401);
    const adminUser = await ctx.db.user.findUniqueOrThrow({ where: { email: 'admin@exemplo.com' } });
    await admin.patch(`/api/v1/admin/users/${adminUser.id}/active`).send({ isActive: false }).expect(409);
  });
});
